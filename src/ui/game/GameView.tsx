import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { SavedTurnReport } from "@/app/persistence";
import type { LoadedScenarioCatalogEntry } from "@/app/scenarioCatalog";
import { useGameSession } from "@/app/useGameSession";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SimulationState } from "@/simulation";
import { SimulationGraph } from "@/ui/graph/SimulationGraph";
import type { GraphTurnFeedback } from "@/ui/graph/projectToReactFlow";
import { ToastNotification } from "@/components/ToastNotification";
import NodeDetailsDialog from "@/ui/panels/NodeDetailsDialog";
import OutcomeConditionDialog from "@/ui/panels/OutcomeConditionDialog";
import TurnReportDialog from "@/ui/panels/TurnReportDialog";
import {
  projectTurnReport,
  projectFinalReport,
  restoreTurnReport,
  serializeTurnReport,
  type TurnReport,
} from "@/ui/panels/projectReport";
import { DashboardSheets, type DashboardPanel } from "./DashboardSheets";
import { GameHeader } from "./GameHeader";
import DilemmaDialog from "./DilemmaDialog";
import { projectHistoricalDilemma } from "./projectDilemma";
import type { ChronicleTarget } from "./projectChronicle";
import EventDetailDialog from "./EventDetailDialog";
import { getTurnEventIds, projectEvent } from "./projectEvent";
import {
  beginAutomaticEvents,
  closeEventPresentation,
  type EventPresentation,
} from "./eventDialogFlow";
import { InstitutionOverview } from "./InstitutionOverview";
import { useInterfaceSound } from "@/ui/sound/interfaceSoundContext";
import FinalReportDialog from "./FinalReportDialog";
import { projectOutcomeConditionDetail, projectCrisis } from "./projectOutcome";
import { useDossierNavigation } from "./useDossierNavigation";
import "./game-shell.css";

const TURN_REVEAL_DURATION_MS = 1000;

interface GameViewProps {
  readonly entry: LoadedScenarioCatalogEntry;
  readonly playerName: string;
  readonly denominationName: string;
  readonly restoredState?: SimulationState;
  readonly restoredTurnReport?: SavedTurnReport;
  readonly notice?: string;
  readonly canLoad: boolean;
  readonly onSave: (state: SimulationState, report?: SavedTurnReport) => void;
  readonly onLoad: () => void;
  readonly onMainMenu: (
    state: SimulationState,
    report?: SavedTurnReport,
  ) => void;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
}

function GameView({
  entry,
  playerName,
  denominationName,
  restoredState,
  restoredTurnReport,
  notice,
  canLoad,
  onSave,
  onLoad,
  onMainMenu,
  musicMuted,
  onToggleMusic,
}: GameViewProps) {
  const { play } = useInterfaceSound();
  const session = useGameSession(entry.scenario, restoredState);
  const navigation = useDossierNavigation(Boolean(restoredState?.outcome));
  const [factionMetricId, setFactionMetricId] = useState(
    () => entry.scenario.factionMetrics?.[0]?.id ?? "",
  );
  const openReport = navigation.openReport;
  const [sheetHoveredNodeId, setSheetHoveredNodeId] = useState<string>();
  const [turnReport, setTurnReport] = useState<TurnReport | undefined>(() =>
    restoredTurnReport
      ? restoreTurnReport(entry.scenario, restoredTurnReport)
      : undefined,
  );
  const [turnReportOpen, setTurnReportOpen] = useState(false);
  const [eventPresentation, setEventPresentation] =
    useState<EventPresentation>();
  const [dilemmaOpen, setDilemmaOpen] = useState(
    Boolean(restoredState?.pendingDilemmaIds.length && !restoredState?.outcome),
  );
  const [revealingTurn, setRevealingTurn] = useState<TurnReport>();
  const [activePanel, setActivePanel] = useState<DashboardPanel>();
  const [chronicleDilemmaId, setChronicleDilemmaId] = useState<string>();
  const [historyOrigin, setHistoryOrigin] = useState<{
    target: ChronicleTarget;
    dateLabel: string;
  }>();
  const [inactiveStanceSearchOpen, setInactiveStanceSearchOpen] =
    useState(false);
  const [toastMessage, setToastMessage] = useState<string>();
  const [dismissedNotice, setDismissedNotice] = useState<string>();
  const previousState = useRef<SimulationState | undefined>(undefined);
  const previousMessage = useRef<string | undefined>(undefined);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const graphTurnFeedback = useMemo<GraphTurnFeedback | undefined>(
    () =>
      revealingTurn
        ? {
            changes: revealingTurn.changes.map((change) => ({
              nodeId: change.nodeId,
              delta: change.amount,
              isActive: change.isActive,
            })),
            changedEffectIds: revealingTurn.changedEffectIds,
          }
        : undefined,
    [revealingTurn],
  );
  const scenario = session.ok ? session.scenario : entry.scenario;
  const state = session.ok ? session.state : undefined;
  const crisisItems = useMemo(
    () => (state ? projectCrisis(scenario, state) : []),
    [scenario, state],
  );
  const historicalCrisisId =
    historyOrigin?.target.kind === "crisis"
      ? historyOrigin.target.id
      : undefined;
  const conditionDetail = useMemo(() => {
    if (!state || !navigation.selectedCondition) return undefined;
    const recoveredCrisisIds =
      turnReport?.crisisTransitions
        .filter(({ kind }) => kind === "recovered")
        .map(({ definition }) => definition.id) ?? [];
    if (historicalCrisisId !== undefined)
      recoveredCrisisIds.push(historicalCrisisId);
    return projectOutcomeConditionDetail(
      scenario,
      state,
      navigation.selectedCondition,
      recoveredCrisisIds,
    );
  }, [
    scenario,
    state,
    navigation.selectedCondition,
    turnReport,
    historicalCrisisId,
  ]);
  const finalReport = useMemo(
    () =>
      state && navigation.reportOpen
        ? projectFinalReport(scenario, state, crisisItems)
        : undefined,
    [scenario, state, navigation.reportOpen, crisisItems],
  );

  useEffect(
    () => () => {
      if (revealTimer.current !== undefined) {
        clearTimeout(revealTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!session.ok || !state) {
      previousState.current = undefined;
      previousMessage.current = undefined;
      return;
    }
    const before = previousState.current;
    const messageChanged =
      previousMessage.current !== undefined &&
      session.message !== previousMessage.current;
    if (before && state.turn > before.turn) {
      const report = projectTurnReport(scenario, before, state);
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (revealTimer.current !== undefined) {
        clearTimeout(revealTimer.current);
        revealTimer.current = undefined;
      }
      setRevealingTurn(undefined);
      setTurnReport(undefined);
      setTurnReportOpen(false);
      setEventPresentation(undefined);
      setDilemmaOpen(false);
      setToastMessage(undefined);
      const presentCompletedTurn = () => {
        setTurnReport(report);
        const ids = getTurnEventIds(scenario, state, report.turn);
        const presentation = beginAutomaticEvents(
          ids,
          state.outcome ? "final-report" : undefined,
        );
        if (presentation) setEventPresentation(presentation);
        else if (state.outcome) openReport();
        else setTurnReportOpen(true);
      };
      if (reducedMotion) {
        // oxlint-disable-next-line react/set-state-in-effect -- the presentation follows the completed engine transition.
        presentCompletedTurn();
        if (
          report.situationTransitions.some(({ kind }) => kind === "began") ||
          report.crisisTransitions.some(({ kind }) => kind === "stage")
        ) {
          play("warning");
        }
      } else {
        setRevealingTurn(report);
        revealTimer.current = setTimeout(() => {
          setRevealingTurn(undefined);
          presentCompletedTurn();
          if (
            report.situationTransitions.some(({ kind }) => kind === "began") ||
            report.crisisTransitions.some(({ kind }) => kind === "stage")
          ) {
            play("warning");
          }
          revealTimer.current = undefined;
        }, TURN_REVEAL_DURATION_MS);
      }
    } else if (before && state.turn !== before.turn) {
      if (revealTimer.current !== undefined) {
        clearTimeout(revealTimer.current);
        revealTimer.current = undefined;
      }
      setRevealingTurn(undefined);
      setTurnReport(undefined);
      setTurnReportOpen(false);
      setEventPresentation(undefined);
      setDilemmaOpen(false);
    } else if (before && messageChanged) {
      setToastMessage(session.message);
    }
    previousState.current = state;
    previousMessage.current = session.message;
  }, [play, session, openReport, scenario, state]);

  if (!session.ok || !state) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Alert className="max-w-xl" variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Unable to load Scenario</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5">
              {!session.ok &&
                session.diagnostics.map((diagnostic, index) => (
                  <li key={index}>{diagnostic}</li>
                ))}
            </ul>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const historicalDilemma = chronicleDilemmaId
    ? projectHistoricalDilemma(scenario, state, chronicleDilemmaId)
    : undefined;

  const activeEventId =
    eventPresentation?.mode === "automatic"
      ? eventPresentation.ids[eventPresentation.index]
      : eventPresentation?.id;
  const activeEvent = activeEventId
    ? projectEvent(scenario, state, activeEventId)
    : undefined;
  const resources = scenario.nodes.filter((node) => node.type === "resource");
  const selectedDefinition = scenario.nodes.find(
    ({ id }) => id === navigation.selectedNodeId,
  );
  const selectedRuntime = selectedDefinition
    ? state.nodes[selectedDefinition.id]
    : undefined;
  const selectNode = navigation.openNode;
  const selectCrisis = (id: string) =>
    navigation.openCondition({ kind: "crisis", id });
  const visibleToast =
    toastMessage ?? (notice !== dismissedNotice ? notice : undefined);
  const activeCrises = crisisItems.filter(
    ({ status }) => status !== "recovered",
  );
  const urgentCrisis = state.outcome
    ? undefined
    : crisisItems.filter(({ status }) => status === "warning")[0];
  const savedTurnReport = turnReport
    ? serializeTurnReport(turnReport)
    : undefined;

  return (
    <div
      className="game-enter flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
      data-game-shell
    >
      <GameHeader
        denominationName={denominationName}
        playerName={playerName}
        state={state}
        resources={resources}
        onResourceHover={setSheetHoveredNodeId}
        onResourceSelect={selectNode}
        activeCrisisCount={activeCrises.length}
        urgentCrisis={
          urgentCrisis
            ? {
                title: urgentCrisis.title,
                turnsRemaining: urgentCrisis.turnsRemaining,
              }
            : undefined
        }
        terminal={Boolean(state.outcome)}
        normalEnding={state.outcome?.kind === "ending"}
        pendingDilemmaCount={state.pendingDilemmaIds.length}
        canLoad={canLoad}
        resolvingTurn={revealingTurn !== undefined}
        onAddStance={() => setInactiveStanceSearchOpen(true)}
        onAdvance={() => {
          if (state.pendingDilemmaIds.length) {
            setDilemmaOpen(true);
          } else if (!revealingTurn) {
            play("advance");
            session.nextTurn();
          }
        }}
        onSave={() => onSave(state, savedTurnReport)}
        onLoad={onLoad}
        onReset={() => {
          setDilemmaOpen(false);
          setEventPresentation(undefined);
          setChronicleDilemmaId(undefined);
          setHistoryOrigin(undefined);
          session.reset();
        }}
        onMainMenu={() => onMainMenu(state, savedTurnReport)}
        onOpenOverview={() => {
          play("paper");
          setActivePanel("overview");
        }}
        onOpenOutcomes={() => {
          play("paper");
          setActivePanel("outcomes");
        }}
        onOpenChronicle={() => {
          play("paper");
          setActivePanel("chronicle");
        }}
        turnReportAvailable={turnReport !== undefined}
        onOpenTurnReport={() => {
          if (turnReport) {
            play("paper");
            setTurnReportOpen(true);
          }
        }}
        onOpenFinalReport={navigation.openReport}
        musicMuted={musicMuted}
        onToggleMusic={onToggleMusic}
      />

      <main
        className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden xl:grid-cols-[20rem_minmax(0,1fr)]"
        data-game-table
      >
        <ScrollArea
          className="hidden h-full min-h-0 pr-0 xl:block"
          data-game-dossier
        >
          <div className="min-h-full px-4">
            <div className="py-3" data-game-current-commission>
              <span className="block font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
                Scenario
              </span>
              <h1 className="mt-1 truncate font-heading text-xl leading-tight font-semibold">
                {scenario.title}
              </h1>
            </div>
            <InstitutionOverview
              scenario={scenario}
              state={state}
              resources={resources}
              crises={crisisItems}
              hideScenario
              onCrisisSelect={selectCrisis}
              onResourceHover={setSheetHoveredNodeId}
              onResourceSelect={selectNode}
            />
          </div>
        </ScrollArea>

        <section
          className="min-h-0 min-w-0 overflow-hidden xl:col-start-2"
          data-game-board-frame
          aria-label="Institutional causal graph"
        >
          <div className="graph-canvas relative size-full min-h-0">
            <SimulationGraph
              scenario={scenario}
              state={state}
              onNodeSelect={selectNode}
              factionMetricId={factionMetricId}
              onFactionMetricChange={setFactionMetricId}
              inactiveStanceSearchOpen={inactiveStanceSearchOpen}
              onInactiveStanceSearchOpenChange={setInactiveStanceSearchOpen}
              externalHoveredNodeId={sheetHoveredNodeId}
              turnFeedback={graphTurnFeedback}
            />
          </div>
        </section>
      </main>

      <DashboardSheets
        activePanel={activePanel}
        scenario={scenario}
        state={state}
        crises={crisisItems}
        resources={resources}
        onClose={() => {
          setActivePanel(undefined);
          setHistoryOrigin(undefined);
        }}
        onConditionSelect={navigation.openCondition}
        onChronicleSelect={(target, dateLabel) => {
          setHistoryOrigin({ target, dateLabel });
          switch (target.kind) {
            case "node":
              navigation.openNode(target.id);
              break;
            case "crisis":
              navigation.openCondition({ kind: "crisis", id: target.id });
              break;
            case "event":
              setDilemmaOpen(false);
              setEventPresentation({
                mode: "manual",
                id: target.id,
                returnTo: "chronicle",
              });
              break;
            case "dilemma":
              setChronicleDilemmaId(target.id);
              break;
            case "report":
              navigation.openReport();
              break;
          }
        }}
        onResourceHover={setSheetHoveredNodeId}
        onResourceSelect={selectNode}
      />

      {turnReport && (
        <TurnReportDialog
          key={turnReport.turn}
          report={turnReport}
          open={turnReportOpen}
          onNodeSelect={selectNode}
          onCrisisSelect={selectCrisis}
          onEventSelect={(eventId) => {
            const historyEntryId = state.history.find(
              (entry) =>
                entry.kind === "event" &&
                entry.definitionId === eventId &&
                entry.turn === turnReport.turn,
            )?.id;
            if (!historyEntryId) return;
            setDilemmaOpen(false);
            setEventPresentation({
              mode: "manual",
              id: historyEntryId,
              returnTo: "report",
            });
          }}
          onOpenChange={(open) => {
            setTurnReportOpen(open);
            if (
              !open &&
              !eventPresentation &&
              !state.outcome &&
              state.pendingDilemmaIds.length
            )
              setDilemmaOpen(true);
          }}
        />
      )}

      {activeEvent && (
        <EventDetailDialog
          key={activeEvent.id}
          event={activeEvent}
          onNodeSelect={selectNode}
          onOpenChange={(open) => {
            if (open || !eventPresentation) return;
            const next = closeEventPresentation(eventPresentation);
            setEventPresentation(next.next);
            if (next.returnTo === "final-report") openReport();
            if (next.returnTo === "report") setTurnReportOpen(true);
            if (next.returnTo === "chronicle") setActivePanel("chronicle");
          }}
        />
      )}

      {!state.outcome && state.pendingDilemmaIds.length > 0 && (
        <DilemmaDialog
          mode="pending"
          scenario={scenario}
          state={state}
          open={
            dilemmaOpen &&
            !turnReportOpen &&
            !revealingTurn &&
            !eventPresentation
          }
          onOpenChange={setDilemmaOpen}
          onResolve={session.resolveDilemma}
        />
      )}

      {historicalDilemma && (
        <DilemmaDialog
          key={historicalDilemma.id}
          mode="historical"
          scenario={scenario}
          record={historicalDilemma}
          open
          onOpenChange={(open) => {
            if (!open) setChronicleDilemmaId(undefined);
          }}
        />
      )}

      {finalReport && (
        <FinalReportDialog
          report={finalReport}
          denominationName={denominationName}
          onNodeSelect={selectNode}
          onConditionSelect={navigation.openCondition}
          onReview={navigation.reviewFinalState}
          onRestart={() => {
            navigation.reset();
            setChronicleDilemmaId(undefined);
            setHistoryOrigin(undefined);
            session.reset();
          }}
          onMainMenu={() => {
            navigation.reset();
            onMainMenu(state, savedTurnReport);
          }}
        />
      )}

      {conditionDetail && (
        <OutcomeConditionDialog
          condition={conditionDetail}
          historyDateLabel={
            historyOrigin?.target.kind === "crisis" &&
            historyOrigin.target.id === conditionDetail.id
              ? historyOrigin.dateLabel
              : undefined
          }
          onNodeSelect={selectNode}
          onClose={navigation.closeCondition}
        />
      )}

      {selectedDefinition && selectedRuntime && (
        <NodeDetailsDialog
          definition={selectedDefinition}
          historyDateLabel={
            historyOrigin?.target.kind === "node" &&
            historyOrigin.target.id === selectedDefinition.id
              ? historyOrigin.dateLabel
              : undefined
          }
          runtime={selectedRuntime}
          scenario={scenario}
          state={state}
          onApply={session.setStance}
          onEnact={session.enactStance}
          onRepeal={session.repealStance}
          onNodeSelect={selectNode}
          onFactionMetricChange={setFactionMetricId}
          onClose={navigation.closeNode}
        />
      )}

      <ToastNotification
        message={visibleToast}
        onClose={() => {
          setToastMessage(undefined);
          setDismissedNotice(notice);
        }}
      />
    </div>
  );
}

export default GameView;

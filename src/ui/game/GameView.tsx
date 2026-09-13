import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { SavedGame } from "@/app/persistence";
import type { LoadedScenarioCatalogEntry } from "@/app/scenarioCatalog";
import { useGameSession } from "@/app/useGameSession";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SimulationState } from "@/simulation";
import { SimulationGraph } from "@/ui/graph/SimulationGraph";
import type { GraphTurnFeedback } from "@/ui/graph/projectToReactFlow";
import { ToastNotification } from "@/components/ToastNotification";
import { NodeDetailsDialog } from "@/ui/panels/NodeDetailsDialog";
import { TurnReportDialog } from "@/ui/panels/TurnReportDialog";
import {
  projectTurnReport,
  type TurnReport,
} from "@/ui/panels/projectTurnReport";
import { DashboardSheets, type DashboardPanel } from "./DashboardSheets";
import { GameHeader } from "./GameHeader";
import { InstitutionOverview } from "./InstitutionOverview";
import "./game-shell.css";

const TURN_REVEAL_DURATION_MS = 1000;

interface GameViewProps {
  readonly entry: LoadedScenarioCatalogEntry;
  readonly playerName: string;
  readonly denominationName: string;
  readonly restoredState?: SimulationState;
  readonly notice?: string;
  readonly savedGame?: SavedGame;
  readonly onSave: (state: SimulationState) => void;
  readonly onLoad: () => void;
  readonly onMainMenu: (state: SimulationState) => void;
  readonly musicMuted: boolean;
  readonly onToggleMusic: () => void;
}

export function GameView({
  entry,
  playerName,
  denominationName,
  restoredState,
  notice,
  savedGame,
  onSave,
  onLoad,
  onMainMenu,
  musicMuted,
  onToggleMusic,
}: GameViewProps) {
  const session = useGameSession(entry.scenario, restoredState);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [turnReport, setTurnReport] = useState<TurnReport>();
  const [revealingTurn, setRevealingTurn] = useState<TurnReport>();
  const [activePanel, setActivePanel] = useState<DashboardPanel>();
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
              nodeId: change.node.id,
              delta: change.delta,
              previousActive: change.previousActive,
              isActive: change.isActive,
            })),
            changedEffectIds: revealingTurn.changedEffectIds,
          }
        : undefined,
    [revealingTurn],
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
    if (!session.ok) {
      previousState.current = undefined;
      previousMessage.current = undefined;
      return;
    }
    const before = previousState.current;
    const messageChanged =
      previousMessage.current !== undefined &&
      session.message !== previousMessage.current;
    if (before && session.state.turn > before.turn) {
      const report = projectTurnReport(session.scenario, before, session.state);
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (revealTimer.current !== undefined) {
        clearTimeout(revealTimer.current);
        revealTimer.current = undefined;
      }
      setRevealingTurn(undefined);
      setTurnReport(undefined);
      setToastMessage(undefined);
      if (reducedMotion) {
        setTurnReport(report);
      } else {
        setRevealingTurn(report);
        revealTimer.current = setTimeout(() => {
          setRevealingTurn(undefined);
          setTurnReport(report);
          revealTimer.current = undefined;
        }, TURN_REVEAL_DURATION_MS);
      }
    } else if (before && session.state.turn !== before.turn) {
      if (revealTimer.current !== undefined) {
        clearTimeout(revealTimer.current);
        revealTimer.current = undefined;
      }
      setRevealingTurn(undefined);
      setTurnReport(undefined);
    } else if (before && messageChanged) {
      setToastMessage(session.message);
    }
    previousState.current = session.state;
    previousMessage.current = session.message;
  }, [session]);

  if (!session.ok) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Alert className="max-w-xl" variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Unable to load Scenario</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5">
              {session.diagnostics.map((diagnostic, index) => (
                <li key={index}>{diagnostic}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const scenario = session.scenario;
  const resources = scenario.nodes.filter((node) => node.type === "resource");
  const situations = scenario.nodes.filter((node) => node.type === "situation");
  const selectedDefinition = scenario.nodes.find(
    ({ id }) => id === selectedNodeId,
  );
  const selectedRuntime = selectedDefinition
    ? session.state.nodes[selectedDefinition.id]
    : undefined;
  const visibleToast =
    toastMessage ?? (notice !== dismissedNotice ? notice : undefined);

  return (
    <div
      className="game-enter flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
      data-game-shell
    >
      <GameHeader
        denominationName={denominationName}
        playerName={playerName}
        scenarioTitle={scenario.title}
        state={session.state}
        resources={resources}
        activeSituationCount={
          situations.filter(
            (situation) => session.state.nodes[situation.id].isActive,
          ).length
        }
        canLoad={Boolean(savedGame)}
        resolvingTurn={revealingTurn !== undefined}
        onAdvance={() => {
          if (!revealingTurn) session.nextTurn();
        }}
        onSave={() => onSave(session.state)}
        onLoad={onLoad}
        onReset={session.reset}
        onMainMenu={() => onMainMenu(session.state)}
        onOpenOverview={() => setActivePanel("overview")}
        onOpenSituations={() => setActivePanel("situations")}
        onOpenChronicle={() => setActivePanel("chronicle")}
        musicMuted={musicMuted}
        onToggleMusic={onToggleMusic}
      />

      <main
        className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-3 sm:p-4 xl:grid-cols-[20rem_minmax(0,1fr)] xl:p-0"
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
              state={session.state}
              resources={resources}
              situations={situations}
              hideScenario
            />
          </div>
        </ScrollArea>

        <section
          className="min-h-0 min-w-0 overflow-hidden xl:col-start-2"
          data-game-board-frame
          aria-label="Institutional causal graph"
        >
          <div className="graph-canvas relative size-full min-h-0">
            <div className="graph-legend" aria-label="Effect legend">
              <span>
                <i className="effect-key effect-key--positive" /> Increasing
              </span>
              <span>
                <i className="effect-key effect-key--negative" /> Decreasing
              </span>
              <span>
                <i className="effect-key effect-key--inactive" /> Inactive
              </span>
            </div>
            <SimulationGraph
              scenario={scenario}
              state={session.state}
              onNodeSelect={setSelectedNodeId}
              turnFeedback={graphTurnFeedback}
            />
          </div>
        </section>
      </main>

      <DashboardSheets
        activePanel={activePanel}
        scenario={scenario}
        state={session.state}
        resources={resources}
        situations={situations}
        onClose={() => setActivePanel(undefined)}
      />

      {selectedDefinition && selectedRuntime && (
        <NodeDetailsDialog
          definition={selectedDefinition}
          runtime={selectedRuntime}
          scenario={scenario}
          state={session.state}
          onApply={session.setStance}
          onEnact={session.enactStance}
          onRepeal={session.repealStance}
          onNodeSelect={setSelectedNodeId}
          onClose={() => setSelectedNodeId(undefined)}
        />
      )}

      {turnReport && (
        <TurnReportDialog
          report={turnReport}
          onClose={() => setTurnReport(undefined)}
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

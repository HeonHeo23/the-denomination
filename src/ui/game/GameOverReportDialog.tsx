import { Home, RotateCcw, Search, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChangesSection } from "@/ui/panels/ChangesSection";
import { projectEndingChanges } from "../panels/projectReport";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import { DossierDialogFrame } from "@/ui/panels/DossierDialogFrame";
import { CrisisSummaryCard } from "./CrisisSummaryCard";
import { projectCrises, projectGameOverReport } from "./projectGameOvers";

interface GameOverReportDialogProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly denominationName: string;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onCrisisSelect: (crisisId: string) => void;
  readonly onReview: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

export function GameOverReportDialog({
  scenario,
  state,
  denominationName,
  onNodeSelect,
  onCrisisSelect,
  onReview,
  onRestart,
  onMainMenu,
}: GameOverReportDialogProps) {
  const changes = projectEndingChanges(scenario, state);
  const causes = projectGameOverReport(scenario, state);
  const crisisById = new Map(
    projectCrises(scenario, state).map((crisis) => [
      crisis.definition.id,
      crisis,
    ]),
  );

  return (
    <DossierDialogFrame
      open
      surface="game-over"
      showCloseButton={false}
      onOpenChange={(open) => {
        if (!open) onReview();
      }}
      header={
        <>
          <div className="min-w-0">
            <DialogTitle className="font-heading text-3xl leading-none sm:text-4xl">
              Game Over
            </DialogTitle>
            <DialogDescription>
              {denominationName} ·{" "}
              {state.year === undefined
                ? `Turn ${state.turn}`
                : `${state.year} · Turn ${state.turn}`}{" "}
              · Institutional closure
            </DialogDescription>
          </div>
        </>
      }
      footerClassName="sm:justify-between"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onReview}>
            <Search data-icon="inline-start" /> Review final state
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onMainMenu}>
              <Home data-icon="inline-start" /> Main menu
            </Button>
            <Button type="button" onClick={onRestart}>
              <RotateCcw data-icon="inline-start" /> Restart scenario
            </Button>
          </div>
        </>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-6 pb-6">
          <div
            role="img"
            aria-label="Game Over illustration placeholder"
            className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 px-6 py-8 text-center sm:min-h-48"
          >
            <ShieldOff
              aria-hidden="true"
              className="size-8 text-muted-foreground"
            />
            <span className="font-heading text-2xl">Game Over</span>
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              Illustration forthcoming
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            The institution can no longer continue. Its terminal crises are
            recorded below.
          </p>
          <h2 className="font-heading text-xl">Closure crises</h2>
          {causes.map((cause) => (
            <CrisisSummaryCard
              key={cause.definition.id}
              variant="terminal"
              cause={cause}
              duration={
                crisisById.get(cause.definition.id)?.consecutiveTurns ??
                cause.definition.terminalAfterTurns
              }
              onOpen={() => onCrisisSelect(cause.definition.id)}
            />
          ))}
          <ChangesSection
            title="Changes since the beginning"
            changes={changes}
            onNodeSelect={onNodeSelect}
          />
        </div>
      </ScrollArea>
    </DossierDialogFrame>
  );
}

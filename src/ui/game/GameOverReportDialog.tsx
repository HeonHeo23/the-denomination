import { Home, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import { DossierDialogFrame } from "@/ui/panels/DossierDialogFrame";
import { CrisisSummaryCard } from "./CrisisSummaryCard";
import { projectCrises, projectGameOverReport } from "./projectGameOvers";

interface GameOverReportDialogProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onCrisisSelect: (crisisId: string) => void;
  readonly onReview: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

export function GameOverReportDialog({
  scenario,
  state,
  onCrisisSelect,
  onReview,
  onRestart,
  onMainMenu,
}: GameOverReportDialogProps) {
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
      header={
        <>
          <div className="min-w-0">
            <DialogTitle className="font-heading text-3xl leading-none sm:text-4xl">
              Game Over
            </DialogTitle>
            <DialogDescription>
              The institution can no longer continue. Review the historical and
              mechanical causes of this Game Over below.
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
        </div>
      </ScrollArea>
    </DossierDialogFrame>
  );
}

import { FactionMetricName } from "@/ui/FactionMetric";
import { ArrowRight, Home, RotateCcw, Search, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangesSection } from "@/ui/panels/ChangesSection";
import {
  projectEndingChanges,
  projectGameOverCauses,
  type GameOverCauseView,
} from "../panels/projectReport";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import { DossierDialogFrame } from "@/ui/panels/DossierDialogFrame";
import { getDossierTriggerProps } from "@/ui/dossierActivation";
import { formatCrisisTurns } from "./projectCrisis";

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

function GameOverCauseCard({
  cause,
  onOpen,
}: {
  readonly cause: GameOverCauseView;
  readonly onOpen: () => void;
}) {
  const definition = cause.definition;
  return (
    <Card
      size="sm"
      className="cursor-pointer border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      {...getDossierTriggerProps(
        `Open ${definition.title} crisis dossier`,
        onOpen,
      )}
    >
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="min-w-0 text-base">
            {definition.report.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex h-full min-w-0 flex-col gap-2">
          <p className="line-clamp-3 leading-relaxed text-muted-foreground">
            {definition.report.narrative}
          </p>
          <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
            Open crisis dossier <ArrowRight aria-hidden="true" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-48 sm:grid-cols-1">
          <div>
            <span className="font-mono text-[0.62rem] tracking-wider text-muted-foreground uppercase">
              Duration
            </span>
            <strong className="mt-1 block text-sm">
              {formatCrisisTurns(cause.consecutiveTurns)}
            </strong>
          </div>
          <div>
            <span className="font-mono text-[0.62rem] tracking-wider text-muted-foreground uppercase">
              Biggest cause
            </span>
            <strong
              className="mt-1 block truncate text-sm"
              title={
                cause.biggestContribution?.sourceTitle ??
                "Activated prerequisite trajectory"
              }
            >
              <FactionMetricName
                name={
                  cause.biggestContribution?.sourceTitle ??
                  "Activated prerequisites"
                }
                metric={cause.biggestContribution?.sourceMetric}
              />
            </strong>
            <small className="mt-1 block truncate text-muted-foreground">
              {cause.biggestContribution ? (
                <span className="flex flex-wrap gap-2">
                  <span className="font-mono">
                    {cause.biggestContribution.value}
                  </span>
                  <span>{cause.biggestContribution.label}</span>
                </span>
              ) : (
                `${cause.matchedGroups.length} activated group${cause.matchedGroups.length === 1 ? "" : "s"}`
              )}
            </small>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
  const causes = projectGameOverCauses(scenario, state);

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
            <GameOverCauseCard
              key={cause.definition.id}
              cause={cause}
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

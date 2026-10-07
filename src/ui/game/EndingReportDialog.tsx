import { Home, Landmark, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import { DossierDialogFrame } from "@/ui/panels/DossierDialogFrame";
import { ChangesSection } from "@/ui/panels/ChangesSection";
import { projectEndingReport } from "../panels/projectReport";

interface EndingReportDialogProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly denominationName: string;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onReview: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

export function EndingReportDialog({
  scenario,
  state,
  denominationName,
  onNodeSelect,
  onReview,
  onRestart,
  onMainMenu,
}: EndingReportDialogProps) {
  const report = projectEndingReport(scenario, state);
  if (!report) return null;
  return (
    <DossierDialogFrame
      open
      surface="ending"
      showCloseButton={false}
      onOpenChange={(open) => {
        if (!open) onReview();
      }}
      header={
        <>
          <DialogTitle className="font-heading text-3xl leading-none sm:text-4xl">
            {report.ending.title}
          </DialogTitle>
          <DialogDescription>
            {denominationName} ·{" "}
            {report.year === undefined
              ? `Turn ${report.turn}`
              : `${report.year} · Turn ${report.turn}`}{" "}
            · Institutional ending
          </DialogDescription>
        </>
      }
      footerClassName="sm:justify-between"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onReview}>
            <Search data-icon="inline-start" />
            Review final state
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onMainMenu}>
              <Home data-icon="inline-start" />
              Main menu
            </Button>
            <Button type="button" onClick={onRestart}>
              <RotateCcw data-icon="inline-start" />
              Restart scenario
            </Button>
          </div>
        </>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-6 pb-6">
          <div
            role="img"
            aria-label={`${report.ending.title} illustration placeholder`}
            className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 px-6 py-8 text-center sm:min-h-48"
          >
            <Landmark
              aria-hidden="true"
              className="size-8 text-muted-foreground"
            />
            <span className="font-heading text-2xl">{report.ending.title}</span>
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              Illustration forthcoming
            </span>
          </div>
          <p className="text-sm leading-relaxed">{report.ending.narrative}</p>
          <section
            className="flex flex-col gap-3"
            aria-label="Completion triggers"
          >
            <h2 className="font-heading text-xl">Completion</h2>
            {report.triggers.map((trigger) => (
              <Card
                key={trigger.id}
                size="sm"
                className="border border-border/70"
              >
                <CardHeader className="border-b border-border/60">
                  <CardTitle className="min-w-0 text-base">
                    {trigger.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    {trigger.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
          {report.actors.length > 0 && (
            <section
              className="flex flex-col gap-3"
              aria-label="Relevant historical actors"
            >
              <h2 className="font-heading text-xl">
                Institutional participants
              </h2>
              {report.actors.map((actor) => (
                <Card
                  key={actor.id}
                  size="sm"
                  className="border border-border/70"
                >
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="min-w-0 text-base">
                      {actor.name} · {actor.role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed text-muted-foreground">
                      {actor.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
          <ChangesSection
            title="Changes since the beginning"
            changes={report.changes}
            onNodeSelect={onNodeSelect}
          />
        </div>
      </ScrollArea>
    </DossierDialogFrame>
  );
}

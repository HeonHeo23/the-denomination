import { Home, Landmark, RotateCcw, Search, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import DossierDialogFrame from "@/ui/panels/DossierDialogFrame";
import { ChangesSection } from "@/ui/panels/ChangesSection";
import type { FinalReportView } from "@/ui/panels/projectReport";
import type { OutcomeConditionRef } from "./outcomeViews";
import { OutcomeConditionCard } from "./OutcomeConditionCard";
import { getDossierTriggerProps } from "@/ui/dossierActivation";
import { NodeName } from "@/ui/FactionMetric";
import { formatCrisisTurns } from "./projectOutcome";

interface FinalReportDialogProps {
  readonly report: FinalReportView;
  readonly denominationName: string;
  readonly onNodeSelect: (id: string) => void;
  readonly onConditionSelect: (ref: OutcomeConditionRef) => void;
  readonly onReview: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

export default function FinalReportDialog({
  report,
  denominationName,
  onNodeSelect,
  onConditionSelect,
  onReview,
  onRestart,
  onMainMenu,
}: FinalReportDialogProps) {
  const Illustration = report.kind === "ending" ? Landmark : ShieldOff;
  return (
    <DossierDialogFrame
      open
      surface="final-report"
      showCloseButton={false}
      onOpenChange={(open) => {
        if (!open) onReview();
      }}
      header={
        <>
          <DialogTitle className="font-heading text-3xl leading-none sm:text-4xl">
            {report.title}
          </DialogTitle>
          <DialogDescription>
            {denominationName} ·{" "}
            {report.year === undefined
              ? `Turn ${report.turn}`
              : `${report.year} · Turn ${report.turn}`}{" "}
            ·{" "}
            {report.kind === "ending"
              ? "Institutional ending"
              : "Institutional closure"}
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
            aria-label={`${report.title} illustration placeholder`}
            className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 px-6 py-8 text-center sm:min-h-48"
          >
            <Illustration
              aria-hidden="true"
              className="size-8 text-muted-foreground"
            />
            <span className="font-heading text-2xl">{report.title}</span>
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              Illustration forthcoming
            </span>
          </div>
          <p className="text-sm leading-relaxed">{report.description}</p>
          <section
            className="flex flex-col gap-3"
            aria-label="Reason play ended"
          >
            <h2 className="font-heading text-xl">Why play ended</h2>
            {report.kind === "ending" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  These completion conditions ended the Scenario. Matching
                  Ending requirements then determined its conclusion by
                  priority.
                </p>
                {report.reason.completion.map((condition) => (
                  <OutcomeConditionCard
                    key={condition.id}
                    condition={condition}
                    onOpen={() => onConditionSelect(condition)}
                  />
                ))}
                {report.reason.usedFallback ? (
                  <p className="text-sm">
                    The fallback Ending was used because no conditional Ending
                    qualified at completion.
                  </p>
                ) : (
                  report.reason.ending && (
                    <>
                      <OutcomeConditionCard
                        condition={report.reason.ending}
                        onOpen={() => {
                          if (report.reason.ending)
                            onConditionSelect(report.reason.ending);
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        Recorded matching groups:{" "}
                        {report.reason.ending.matchedGroups
                          .map(({ title }) => title)
                          .join(", ")}
                      </p>
                    </>
                  )
                )}
              </>
            ) : (
              report.reason.causes.map((cause) => (
                <Card
                  key={cause.id}
                  size="sm"
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  {...getDossierTriggerProps(
                    `Open ${cause.condition.title} condition details`,
                    () => onConditionSelect(cause.condition),
                  )}
                >
                  <CardHeader>
                    <CardTitle>{cause.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      {cause.description}
                    </p>
                    <p className="text-sm">
                      Duration:{" "}
                      {formatCrisisTurns(cause.condition.consecutiveTurns)}
                    </p>
                    <p className="text-sm">
                      Biggest contribution:{" "}
                      <NodeName
                        name={
                          cause.condition.biggestContribution?.sourceTitle ??
                          "Activated prerequisites"
                        }
                        metric={
                          cause.condition.biggestContribution?.sourceMetric
                        }
                      />
                      {cause.condition.biggestContribution && (
                        <>
                          {" "}
                          · {cause.condition.biggestContribution.value}{" "}
                          {cause.condition.biggestContribution.label}
                        </>
                      )}
                    </p>
                    <span className="text-sm text-primary">
                      Open condition details
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
          <section
            className="flex flex-col gap-3"
            aria-label="Final active crises"
          >
            <h2 className="font-heading text-xl">Final active crises</h2>
            {report.activeCrises.length ? (
              report.activeCrises.map((crisis) => (
                <OutcomeConditionCard
                  key={crisis.id}
                  condition={crisis}
                  onOpen={() => onConditionSelect(crisis)}
                />
              ))
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No active crises</EmptyTitle>
                  <EmptyDescription>
                    No crisis trajectory remained active when play ended.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
          {report.actors.length > 0 && (
            <section
              className="flex flex-col gap-3"
              aria-label="Institutional participants"
            >
              <h2 className="font-heading text-xl">
                Institutional participants
              </h2>
              {report.actors.map((actor) => (
                <Card key={actor.id} size="sm">
                  <CardHeader>
                    <CardTitle>
                      {actor.name} · {actor.role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
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

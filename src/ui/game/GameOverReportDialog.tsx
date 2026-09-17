import { BookOpenText, Home, RotateCcw, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import { projectGameOverReport } from "./projectGameOvers";

interface GameOverReportDialogProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onReview: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}

export function GameOverReportDialog({
  scenario,
  state,
  onReview,
  onRestart,
  onMainMenu,
}: GameOverReportDialogProps) {
  const causes = projectGameOverReport(scenario, state);
  return (
    <Dialog open>
      <DialogContent
        className="flex h-[min(820px,calc(100dvh-2rem))] min-h-0 w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
        data-game-over-report
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="text-destructive">Game Over</DialogTitle>
        </DialogHeader>
        <Separator />
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 px-6 pb-6">
            {causes.map((cause) => (
              <Card key={cause.definition.id}>
                <CardHeader>
                  <CardTitle>{cause.definition.report.title}</CardTitle>
                  <CardDescription>
                    {cause.definition.title} persisted for{" "}
                    {cause.definition.terminalAfterTurns} consecutive turns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <BookOpenText aria-hidden="true" />
                    <p className="leading-relaxed">
                      {cause.definition.report.narrative}
                    </p>
                  </div>
                  {cause.matchedGroups.map(({ group, prerequisites }) => (
                    <Alert key={group.id} variant="destructive">
                      <AlertTitle>{group.title}</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                          {prerequisites.map((prerequisite) => (
                            <li
                              key={`${group.id}:${prerequisite.prerequisite.nodeId}`}
                            >
                              {prerequisite.description}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ))}
                  {cause.contributions.length > 0 && (
                    <section aria-label="Contributing factors">
                      <h3 className="font-heading text-base">
                        Contributing factors
                      </h3>
                      <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                        {cause.contributions.map((contribution) => (
                          <li
                            className="flex justify-between gap-4"
                            key={contribution.id}
                          >
                            <span className="flex min-w-0 items-baseline gap-2">
                              <span className="font-medium text-foreground">
                                {contribution.sourceTitle}
                              </span>
                              <span className="text-muted-foreground">
                                {contribution.label}
                              </span>
                            </span>
                            <strong className="font-mono text-foreground">
                              {contribution.value}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="!mx-0 !mb-0 shrink-0 px-6 py-4 sm:justify-between">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

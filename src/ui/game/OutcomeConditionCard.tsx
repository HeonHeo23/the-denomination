import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDossierTriggerProps } from "@/ui/dossierActivation";
import type { OutcomeConditionSummaryView } from "./outcomeViews";
import { formatCrisisProgressLabel } from "./projectOutcome";

const formatCrisisElapsedLabel = (
  condition: Extract<OutcomeConditionSummaryView, { kind: "crisis" }>,
): string => {
  return `${condition.consecutiveTurns}/${condition.terminalTurn} qualifying turns`;
};

export function OutcomeConditionCard({
  condition,
  onOpen,
}: {
  readonly condition: OutcomeConditionSummaryView;
  readonly onOpen: () => void;
}) {
  return (
    <Card
      data-game-crisis-notice={
        condition.kind === "crisis"
          ? condition.status === "terminal"
            ? "terminal"
            : "active"
          : undefined
      }
      size="sm"
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      {...getDossierTriggerProps(
        `Open ${condition.title} condition details`,
        onOpen,
      )}
    >
      <CardHeader>
        <CardTitle>{condition.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {condition.kind === "crisis" ? (
          <>
            <span className="text-xs text-muted-foreground">
              {formatCrisisElapsedLabel(condition)}
            </span>
            <Progress
              value={condition.progressPercent}
              aria-label={formatCrisisProgressLabel(condition)}
            />
            {condition.status !== "warning" && (
              <Badge
                variant={
                  condition.status === "terminal" ? "destructive" : "secondary"
                }
              >
                {condition.status === "terminal" ? "Game Over" : "Recovered"}
              </Badge>
            )}
          </>
        ) : (
          <>
            <Badge
              variant={condition.status === "met" ? "secondary" : "outline"}
            >
              {condition.status === "met"
                ? "Requirements met"
                : "Requirements not met"}
            </Badge>
            {condition.kind === "ending" && (
              <span className="text-xs text-muted-foreground">
                Priority {condition.priority}
              </span>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

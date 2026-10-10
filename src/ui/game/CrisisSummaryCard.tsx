import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDossierTriggerProps } from "@/ui/dossierActivation";
import {
  formatCrisisElapsedLabel,
  formatCrisisProgressLabel,
  type CrisisView,
} from "./projectCrisis";

export function CrisisSummaryCard({
  crisis,
  onOpen,
}: {
  readonly crisis: CrisisView;
  readonly onOpen: () => void;
}) {
  return (
    <Card
      size="sm"
      className="cursor-pointer border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      data-game-crisis-notice={
        crisis.status === "terminal" ? "terminal" : "active"
      }
      {...getDossierTriggerProps(
        `Open ${crisis.definition.title} crisis dossier`,
        onOpen,
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="min-w-0 text-base">
            {crisis.definition.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{formatCrisisElapsedLabel(crisis)}</span>
        </div>
        <Progress
          value={crisis.progressPercent}
          aria-label={formatCrisisProgressLabel(crisis)}
        />
      </CardContent>
    </Card>
  );
}

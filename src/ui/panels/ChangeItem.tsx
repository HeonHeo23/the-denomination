import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NodeName } from "@/ui/FactionMetric";
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import type { ChangeView } from "@/ui/changeView";
import { DossierItemButton } from "./DossierItemButton";

/** Shared presentation for report changes and recorded Event consequences. */
export function ChangeItem({
  change,
  onNodeSelect,
  source = "report",
}: {
  readonly change: ChangeView;
  readonly source?: "report" | "event";
  readonly onNodeSelect: (nodeId: string) => void;
}) {
  const isEvent = source === "event";
  const signedAmount =
    change.amount === undefined
      ? undefined
      : formatSignedValue(change.amount, change.domain, true);
  const displayedAmount = Number.parseFloat(signedAmount ?? "0");
  const status =
    change.isActive === undefined
      ? undefined
      : change.isActive
        ? "Activated"
        : "Deactivated";
  const isGrudge = change.category === "grudge";

  return (
    <div
      role="listitem"
      className="min-w-0"
      data-game-event-consequence={isEvent ? "" : undefined}
      data-game-effect-kind={isEvent ? change.category : undefined}
      data-game-change={
        isEvent
          ? undefined
          : displayedAmount > 0
            ? "increasing"
            : displayedAmount < 0
              ? "decreasing"
              : "neutral"
      }
    >
      <DossierItemButton
        role="none"
        variant={isGrudge ? "outline" : "muted"}
        size="sm"
        className={cn(
          "flex-col items-stretch sm:flex-row sm:items-center",
          isGrudge && "border-dashed",
        )}
        aria-label={
          change.nodeId !== undefined
            ? `Open ${change.name}${change.metric ? ` ${change.metric.label}` : ""} dossier`
            : undefined
        }
        onSelect={
          change.nodeId !== undefined
            ? () => onNodeSelect(change.nodeId!)
            : undefined
        }
        title={<NodeName name={change.name} metric={change.metric} />}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {change.category.charAt(0).toUpperCase() +
                change.category.slice(1)}
            </span>
            {status && <Badge variant="outline">{status}</Badge>}
          </span>
        }
        trailing={
          signedAmount === undefined ? undefined : (
            <span className="flex w-full flex-row flex-wrap items-center justify-between gap-2 text-right font-mono text-xs sm:w-auto sm:flex-col sm:items-end">
              {change.previousValue !== undefined &&
                change.value !== undefined &&
                change.domain && (
                  <span>
                    {formatValue(change.previousValue, change.domain)} →{" "}
                    {formatValue(change.value, change.domain)}
                  </span>
                )}
              <Badge
                variant={
                  displayedAmount > 0
                    ? "default"
                    : displayedAmount < 0
                      ? "destructive"
                      : "secondary"
                }
              >
                {displayedAmount === 0 ? `±${signedAmount}` : signedAmount}
              </Badge>
            </span>
          )
        }
      />
    </div>
  );
}

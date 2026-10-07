import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FactionMetricName } from "@/ui/FactionMetric";
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { DossierItemButton } from "./DossierItemButton";
import { nodeTypeLabel, type ReportChange } from "./projectReport";
import "./panels.css";

/** One change row shared by yearly and terminal reports. */
function ChangeItem({
  change,
  onNodeSelect,
}: {
  readonly change: ReportChange;
  readonly onNodeSelect: (nodeId: string) => void;
}) {
  const status =
    change.previousActive === change.isActive
      ? undefined
      : change.isActive
        ? "Became active"
        : "Became inactive";
  return (
    <DossierItemButton
      variant="muted"
      size="sm"
      className="flex-col items-stretch sm:flex-row sm:items-center"
      aria-label={`Open ${change.node.name}${change.metric ? ` ${change.metric}` : ""} dossier`}
      onSelect={() => onNodeSelect(change.node.id)}
      title={
        <FactionMetricName
          name={change.node.name}
          metric={change.metric}
          metricId={change.metricId}
        />
      }
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span>{nodeTypeLabel(change.node.type)}</span>
          {status && <Badge variant="outline">{status}</Badge>}
        </span>
      }
      data-game-change={
        change.delta > 0
          ? "increasing"
          : change.delta < 0
            ? "decreasing"
            : "neutral"
      }
      trailing={
        <span className="flex w-full flex-row flex-wrap items-center justify-between gap-2 text-right font-mono text-xs sm:w-auto sm:flex-col sm:items-end">
          <span>
            {formatValue(change.previousValue, change.node.domain)} →{" "}
            {formatValue(change.value, change.node.domain)}
          </span>
          {Math.abs(change.delta) > 1e-9 && (
            <Badge variant={change.delta > 0 ? "default" : "destructive"}>
              {formatSignedValue(change.delta, change.node.domain, true)}
            </Badge>
          )}
        </span>
      }
    />
  );
}

/** Reports choose the comparison period and preview size; rows stay consistent. */
export function ChangesSection({
  title,
  changes,
  onNodeSelect,
  previewCount,
}: {
  readonly title: string;
  readonly changes: readonly ReportChange[];
  readonly onNodeSelect: (nodeId: string) => void;
  readonly previewCount?: number;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const canExpand = previewCount !== undefined && changes.length > previewCount;
  const visible =
    canExpand && !expanded
      ? [...changes]
          .sort((a, b) => b.relativeMagnitude - a.relativeMagnitude)
          .slice(0, previewCount)
      : changes;
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="font-heading text-xl">
        {title}
      </h2>
      {changes.length ? (
        <ItemGroup
          id={`${id}-list`}
          className="grid grid-cols-1 gap-2 lg:grid-cols-2"
        >
          {visible.map((change) => (
            <ChangeItem
              key={change.node.id}
              change={change}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </ItemGroup>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No net changes</EmptyTitle>
            <EmptyDescription>
              Values and activation match the comparison’s starting state.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {canExpand && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          aria-expanded={expanded}
          aria-controls={`${id}-list`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? "Show fewer changes"
            : `Review all changes (${changes.length})`}
          <ChevronDown
            data-icon="inline-end"
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </Button>
      )}
    </section>
  );
}

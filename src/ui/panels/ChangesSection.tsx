import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { ChangeItem } from "./ChangeItem";
import type { ReportChange } from "../changeView";
import "./panels.css";

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
  const sorted = [...changes].sort(
    (a, b) => b.relativeMagnitude - a.relativeMagnitude,
  );
  const visible =
    canExpand && !expanded ? sorted.slice(0, previewCount) : sorted;
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
              key={change.id}
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

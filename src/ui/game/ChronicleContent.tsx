import {
  Activity,
  CalendarDays,
  ChevronDown,
  Flag,
  Layers,
  OctagonX,
  ScrollText,
  SlidersHorizontal,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { HistoryEntry } from "@/simulation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { chronicleTypes } from "./projectChronicle";
import type {
  ChronicleGroup,
  ChronicleTarget,
  ResolvedHistoryRecord,
} from "./projectChronicle";

const typeIcons = {
  stance: SlidersHorizontal,
  dilemma: ScrollText,
  event: CalendarDays,
  situation: Activity,
  crisis: TriangleAlert,
  consequence: Layers,
  "game-over": OctagonX,
  ending: Flag,
} satisfies Record<HistoryEntry["kind"], LucideIcon>;

function actionLabel(target: ChronicleTarget): string {
  switch (target.kind) {
    case "node":
      return "Open current node details";
    case "crisis":
      return "Open current crisis details";
    case "event":
      return "Open Event record";
    case "dilemma":
      return "Open resolved Dilemma";
    case "report":
      return "Open final report";
  }
}

function RecordContent({ record }: { readonly record: ResolvedHistoryRecord }) {
  const type = record.typeId ? chronicleTypes[record.typeId] : undefined;
  const Icon = type ? typeIcons[type.iconKey] : undefined;
  return (
    <ItemContent className="min-w-0">
      {type && Icon && (
        <Badge variant="outline">
          <Icon aria-hidden="true" data-icon="inline-start" />
          {type.label}
        </Badge>
      )}
      <ItemTitle className={cn(record.decision && "line-clamp-none")}>
        {record.displayTitle}
      </ItemTitle>
      <ItemDescription className={cn(record.decision && "line-clamp-none")}>
        {record.decision ? (
          <>
            <strong>{record.decision.choiceLabel}</strong>
            {record.decision.choiceDescription && (
              <span className="block">{record.decision.choiceDescription}</span>
            )}
          </>
        ) : (
          record.entry.detail
        )}
      </ItemDescription>
    </ItemContent>
  );
}

/** A record's detail action is separate from the source's change disclosure. */
export function HistoryRecordItem({
  record,
  dateLabel,
  onSelect,
  timeline = false,
}: {
  readonly record: ResolvedHistoryRecord;
  readonly dateLabel: string;
  readonly onSelect: (target: ChronicleTarget, dateLabel: string) => void;
  readonly timeline?: boolean;
}) {
  return (
    <Item
      asChild={!!record.target}
      variant="muted"
      className={cn(
        record.target &&
          "cursor-pointer text-left hover:bg-accent focus-visible:bg-accent",
      )}
      data-game-chronicle-entry={timeline ? "" : undefined}
      data-game-history-id={record.entry.id}
    >
      {record.target ? (
        <button
          type="button"
          aria-label={`${actionLabel(record.target)}: ${record.displayTitle}, ${dateLabel}`}
          onClick={() => {
            if (record.target) onSelect(record.target, dateLabel);
          }}
        >
          <RecordContent record={record} />
        </button>
      ) : (
        <RecordContent record={record} />
      )}
    </Item>
  );
}

export function ChronicleContent({
  groups,
  onSelect,
}: {
  readonly groups: readonly ChronicleGroup[];
  readonly onSelect: (target: ChronicleTarget, dateLabel: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6 pt-4">
      {groups.map((group) => (
        <section
          key={group.turn}
          aria-label={group.dateLabel}
          className="flex min-w-0 flex-col gap-3"
        >
          <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {group.dateLabel}
          </h3>
          <ItemGroup>
            {group.records.map((record) => (
              <div
                key={record.entry.id}
                role="listitem"
                className="min-w-0 pr-3"
              >
                <Collapsible defaultOpen={false}>
                  <HistoryRecordItem
                    record={record}
                    dateLabel={group.dateLabel}
                    onSelect={onSelect}
                    timeline
                  />
                  {record.changes.length > 0 && (
                    <>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group ml-3"
                          aria-label={`Show ${record.changes.length} ${record.changes.length === 1 ? "change" : "changes"} from ${record.displayTitle}`}
                        >
                          {record.changes.length}{" "}
                          {record.changes.length === 1 ? "change" : "changes"}
                          <ChevronDown
                            aria-hidden="true"
                            data-icon="inline-end"
                            className="transition-transform group-data-[state=open]:rotate-180"
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ItemGroup className="mt-2 ml-3 gap-2">
                          {record.changes.map((change) => (
                            <div
                              key={change.entry.id}
                              role="listitem"
                              className="min-w-0"
                            >
                              <HistoryRecordItem
                                record={change}
                                dateLabel={group.dateLabel}
                                onSelect={onSelect}
                              />
                            </div>
                          ))}
                        </ItemGroup>
                      </CollapsibleContent>
                    </>
                  )}
                </Collapsible>
              </div>
            ))}
          </ItemGroup>
        </section>
      ))}
    </div>
  );
}

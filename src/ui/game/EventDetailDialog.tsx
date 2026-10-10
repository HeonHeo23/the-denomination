import { FactionMetricName } from "@/ui/FactionMetric";
import eventPlaceholder from "@/assets/event-placeholder.svg";
import { ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import { EffectBar } from "@/ui/panels/NodeEffectCard";
import { cn } from "@/lib/utils";
import type { EventOccurrenceView } from "./projectEvent";
import "@/ui/panels/panels.css";

interface EventDetailDialogProps {
  readonly occurrence: EventOccurrenceView;
  readonly onOpenChange: (open: boolean) => void;
  readonly onNodeSelect: (nodeId: string) => void;
}

export function EventDetailDialog({
  occurrence,
  onOpenChange,
  onNodeSelect,
}: EventDetailDialogProps) {
  const date =
    occurrence.year === undefined
      ? `Turn ${occurrence.turn}`
      : `Year ${occurrence.year}`;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-4xl sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)]"
        data-game-event-detail
      >
        <img
          src={eventPlaceholder}
          alt=""
          aria-hidden="true"
          className="h-36 w-full object-cover sm:h-full sm:min-h-0"
        />
        <div className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="gap-2 pr-6">
              <Badge variant="outline" className="w-fit">
                Event · {date} · Occurrence {occurrence.occurrenceNumber}
              </Badge>
              <DialogTitle>{occurrence.definition.title}</DialogTitle>
              <DialogDescription className="leading-relaxed">
                {occurrence.definition.description}
              </DialogDescription>
            </DialogHeader>

            <section
              className="flex flex-col gap-3"
              aria-labelledby="event-consequences-title"
            >
              {occurrence.consequences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No direct consequence was recorded.
                </p>
              ) : (
                <ItemGroup className="gap-2">
                  {occurrence.consequences.map((consequence) => {
                    const target = consequence.target;
                    const value = consequence.endOfTurnValue;
                    const amount = consequence.appliedAmount;
                    const range = target
                      ? target.domain.max - target.domain.min
                      : undefined;
                    return (
                      <Item
                        key={consequence.id}
                        asChild
                        variant={
                          consequence.kind === "grudge" ? "outline" : "muted"
                        }
                        size="sm"
                        className={cn(
                          "gap-2 py-2 text-left",
                          target &&
                            "cursor-pointer hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                          consequence.kind === "grudge" && "border-dashed",
                        )}
                        data-game-event-consequence
                        data-game-effect-kind={consequence.kind}
                      >
                        <button
                          type="button"
                          disabled={!target}
                          onClick={() => target && onNodeSelect(target.id)}
                          aria-label={
                            target
                              ? `Open ${target.name}${consequence.targetMetric ? ` ${consequence.targetMetric.label}` : ""} details`
                              : undefined
                          }
                        >
                          <ArrowDownRight aria-hidden="true" />
                          <ItemContent className="min-w-0 gap-1">
                            <div className="flex min-w-0 items-baseline justify-between gap-2">
                              <ItemTitle className="min-w-0 truncate">
                                <FactionMetricName
                                  name={target?.name ?? consequence.title}
                                  metric={consequence.targetMetric}
                                />
                              </ItemTitle>
                              <ItemDescription className="min-w-0 truncate text-right">
                                {consequence.kind === "grudge"
                                  ? consequence.title.replace(
                                      /^Grudge created: /,
                                      "",
                                    )
                                  : consequence.kind === "activation"
                                    ? "Activation"
                                    : "Resource change"}
                              </ItemDescription>
                            </div>
                            {amount !== undefined &&
                              range !== undefined &&
                              range > 0 && (
                                <div className="flex min-w-0 items-center">
                                  <EffectBar
                                    effect={{
                                      contribution: amount / range,
                                      contributionLabel: formatSignedValue(
                                        amount,
                                        target ? target.domain : undefined,
                                      ),
                                      contributionTone:
                                        amount > 0
                                          ? "positive"
                                          : amount < 0
                                            ? "negative"
                                            : "neutral",
                                    }}
                                  />
                                </div>
                              )}
                            <ItemDescription className="line-clamp-none">
                              {consequence.detail}
                            </ItemDescription>
                            {target && value !== undefined && (
                              <ItemDescription className="line-clamp-none">
                                End-of-turn {target.name}
                                {consequence.targetMetric
                                  ? ` ${consequence.targetMetric.label}`
                                  : ""}{" "}
                                reading: {formatValue(value, target.domain)}
                              </ItemDescription>
                            )}
                          </ItemContent>
                        </button>
                      </Item>
                    );
                  })}
                </ItemGroup>
              )}
            </section>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-popover p-4 sm:p-5">
            <DialogClose asChild>
              <Button type="button">Continue</Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

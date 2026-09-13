import { useState, type ReactNode } from "react";
import { BookOpenText, ChevronDown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import { isEtherealTurn } from "@/ui/institutionEra";
import type { TurnReport, TurnReportChange } from "./projectTurnReport";
import { nodeTypeLabel } from "./projectTurnReport";
import "./panels.css";

interface TurnReportDialogProps {
  readonly report: TurnReport;
  readonly onClose: () => void;
}

function statusChange(change: TurnReportChange): string | undefined {
  if (change.previousActive === change.isActive) return undefined;
  return change.isActive ? "Became active" : "Became inactive";
}

function ChangeItem({ change }: { readonly change: TurnReportChange }) {
  const status = statusChange(change);
  return (
    <Item
      role="listitem"
      variant="muted"
      size="sm"
      data-game-change={
        change.delta > 0
          ? "increasing"
          : change.delta < 0
            ? "decreasing"
            : "neutral"
      }
    >
      <ItemContent>
        <ItemTitle>{change.node.name}</ItemTitle>
        <ItemDescription>
          {nodeTypeLabel(change.node.type)}
          {status ? ` · ${status}` : ""}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <div className="text-right font-mono text-xs">
          <span className="block">
            {formatValue(change.previousValue, change.node.domain)} →{" "}
            {formatValue(change.value, change.node.domain)}
          </span>
          {Math.abs(change.delta) > 1e-9 && (
            <Badge variant={change.delta > 0 ? "default" : "destructive"}>
              {formatSignedValue(change.delta, change.node.domain)}
            </Badge>
          )}
        </div>
      </ItemActions>
    </Item>
  );
}

interface ReportSectionProps {
  readonly id: string;
  readonly title: string;
  readonly className?: string;
  readonly children: ReactNode;
}

function ReportSection({ id, title, className, children }: ReportSectionProps) {
  return (
    <section aria-labelledby={id} className={className}>
      <h3 id={id} className="mb-3 font-heading text-base">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function TurnReportDialog({ report, onClose }: TurnReportDialogProps) {
  const [showAllChanges, setShowAllChanges] = useState(false);
  const heading =
    report.year === undefined ? `Turn ${report.turn}` : `Year ${report.year}`;
  const visibleChanges = report.highlights.slice(0, 4);
  const hasOutcomes =
    report.changes.length > 0 ||
    report.situationTransitions.length > 0 ||
    report.grudges.length > 0;
  const significant = isEtherealTurn(report);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex h-[min(780px,calc(100dvh-2rem))] min-h-0 w-[calc(100vw-2rem)] shrink-0 flex-col overflow-hidden p-0 sm:max-w-5xl"
        data-game-chronicle
        showCloseButton
      >
        <DialogHeader className="shrink-0 px-6 pt-6" data-game-chronicle-header>
          <div className="flex items-center gap-3">
            <span data-game-period-seal aria-hidden="true">
              <BookOpenText />
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
                {heading}
              </span>
              <DialogTitle>Year in review</DialogTitle>
            </div>
          </div>
          {significant && (
            <Badge variant="secondary">
              <Sparkles data-icon="inline-start" /> Significant changes
            </Badge>
          )}
          <DialogDescription>
            The record of persistent changes and temporary effects following
            turn {report.turn}.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div
          className={cn(
            "min-h-0 flex-1 px-6",
            showAllChanges
              ? "overflow-y-auto"
              : "flex flex-col overflow-hidden",
          )}
        >
          {!hasOutcomes ? (
            <Empty className="my-6 min-h-56 border">
              <EmptyHeader>
                <EmptyTitle>No persistent changes</EmptyTitle>
                <EmptyDescription>
                  The institution remained steady during this turn.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex min-h-full flex-col gap-6 pb-6">
              {report.situationTransitions.length > 0 && (
                <ReportSection
                  id="turn-situations-title"
                  title="Matters arisen"
                >
                  <ItemGroup>
                    {report.situationTransitions.map((transition) => (
                      <Item
                        role="listitem"
                        variant="outline"
                        size="sm"
                        key={transition.node.id}
                      >
                        <ItemContent>
                          <ItemTitle>{transition.node.name}</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                          <Badge
                            variant={
                              transition.kind === "began"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {transition.kind === "began" ? "Began" : "Ended"}
                          </Badge>
                        </ItemActions>
                      </Item>
                    ))}
                  </ItemGroup>
                </ReportSection>
              )}

              {report.grudges.length > 0 && (
                <ReportSection
                  id="turn-effects-title"
                  title="Temporary effects"
                >
                  <ItemGroup>
                    {report.grudges.map((grudge) => (
                      <Item
                        role="listitem"
                        variant="outline"
                        size="sm"
                        key={grudge.id}
                      >
                        <ItemContent>
                          <ItemTitle>{grudge.label}</ItemTitle>
                          <ItemDescription>
                            Affecting {grudge.targetName}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Badge
                            variant={
                              grudge.magnitude > 0 ? "default" : "destructive"
                            }
                          >
                            {formatSignedValue(
                              grudge.magnitude,
                              grudge.targetDomain,
                            )}
                          </Badge>
                        </ItemActions>
                      </Item>
                    ))}
                  </ItemGroup>
                </ReportSection>
              )}

              {visibleChanges.length > 0 && (
                <section className="mt-auto flex flex-col gap-4">
                  <ReportSection
                    id="turn-highlights-title"
                    title="Movements across the institution"
                  >
                    <ItemGroup className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {visibleChanges.map((change) => (
                        <ChangeItem change={change} key={change.node.id} />
                      ))}
                    </ItemGroup>
                  </ReportSection>

                  {report.changes.length > visibleChanges.length && (
                    <Collapsible
                      open={showAllChanges}
                      onOpenChange={setShowAllChanges}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          className="w-full"
                          type="button"
                          variant="outline"
                        >
                          Review all changes ({report.changes.length})
                          <ChevronDown data-icon="inline-end" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3">
                        <ItemGroup className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                          {report.changes.map((change) => (
                            <ChangeItem change={change} key={change.node.id} />
                          ))}
                        </ItemGroup>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="m-0 shrink-0 rounded-none px-6 py-4">
          <DialogClose asChild>
            <Button type="button">Return to council</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, type ReactNode } from "react";
import {
  BookOpenText,
  ChevronDown,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import { isEtherealTurn } from "@/ui/institutionEra";
import { crisisTurnsLabel } from "@/ui/game/crisisPresentation";
import { DossierDialogFrame } from "./DossierDialogFrame";
import { DossierItemButton } from "./DossierItemButton";
import type { TurnReport, TurnReportChange } from "./projectTurnReport";
import { nodeTypeLabel } from "./projectTurnReport";
import "./panels.css";

interface TurnReportDialogProps {
  readonly report: TurnReport;
  readonly open: boolean;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onOpenChange: (open: boolean) => void;
}

function statusChange(change: TurnReportChange): string | undefined {
  if (change.previousActive === change.isActive) return undefined;
  return change.isActive ? "Became active" : "Became inactive";
}

function ChangeItem({
  change,
  onNodeSelect,
}: {
  readonly change: TurnReportChange;
  readonly onNodeSelect: (nodeId: string) => void;
}) {
  const status = statusChange(change);
  const selectNode = () => onNodeSelect(change.node.id);
  return (
    <DossierItemButton
      variant="muted"
      size="sm"
      aria-label={`Open ${change.node.name} dossier`}
      onSelect={selectNode}
      title={change.node.name}
      description={`${nodeTypeLabel(change.node.type)}${status ? ` · ${status}` : ""}`}
      data-game-change={
        change.delta > 0
          ? "increasing"
          : change.delta < 0
            ? "decreasing"
            : "neutral"
      }
      trailing={
        <span className="flex flex-col items-end text-right font-mono text-xs">
          <span className="block">
            {formatValue(change.previousValue, change.node.domain)} →{" "}
            {formatValue(change.value, change.node.domain)}
          </span>
          {Math.abs(change.delta) > 1e-9 && (
            <Badge variant={change.delta > 0 ? "default" : "destructive"}>
              {formatSignedValue(change.delta, change.node.domain)}
            </Badge>
          )}
        </span>
      }
    />
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

export function TurnReportDialog({
  report,
  open,
  onNodeSelect,
  onOpenChange,
}: TurnReportDialogProps) {
  const [showAllChanges, setShowAllChanges] = useState(false);
  const heading =
    report.year === undefined ? `Turn ${report.turn}` : `Year ${report.year}`;
  const visibleChanges = report.highlights.slice(0, 4);
  const hasOutcomes =
    report.changes.length > 0 ||
    report.situationTransitions.length > 0 ||
    report.grudges.length > 0 ||
    report.crisisTransitions.length > 0;
  const significant = isEtherealTurn(report);

  return (
    <DossierDialogFrame
      open={open}
      onOpenChange={onOpenChange}
      surface="chronicle"
      header={
        <>
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
        </>
      }
      footer={
        <DialogClose asChild>
          <Button type="button">Return to council</Button>
        </DialogClose>
      }
      footerClassName="rounded-none"
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-h-full px-6 pb-6">
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
              {report.crisisTransitions.length > 0 && (
                <ReportSection id="turn-crises-title" title="Crisis record">
                  <div className="flex flex-col gap-3">
                    {report.crisisTransitions.map((transition) => (
                      <Alert
                        variant={
                          transition.kind === "stage"
                            ? "destructive"
                            : "default"
                        }
                        key={`${transition.definition.id}:${transition.kind}`}
                      >
                        {transition.kind === "stage" ? (
                          <ShieldAlert aria-hidden="true" />
                        ) : (
                          <ShieldCheck aria-hidden="true" />
                        )}
                        <AlertTitle>
                          {transition.kind === "stage"
                            ? transition.stage?.title
                            : transition.definition.recovery?.title}
                        </AlertTitle>
                        <AlertDescription>
                          <p>
                            {transition.kind === "stage"
                              ? transition.stage?.description
                              : transition.definition.recovery?.description}
                          </p>
                          {transition.kind === "stage" && (
                            <p className="mt-2 font-mono text-xs">
                              {crisisTurnsLabel(transition.turnsRemaining)}{" "}
                              remain before Game Over.
                            </p>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ReportSection>
              )}
              {report.situationTransitions.length > 0 && (
                <ReportSection
                  id="turn-situations-title"
                  title="Matters arisen"
                >
                  <ItemGroup>
                    {report.situationTransitions.map((transition) => (
                      <DossierItemButton
                        variant="outline"
                        size="sm"
                        key={transition.node.id}
                        aria-label={`Open ${transition.node.name} dossier`}
                        onSelect={() => onNodeSelect(transition.node.id)}
                        title={transition.node.name}
                        trailing={
                          <Badge
                            variant={
                              transition.kind === "began"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {transition.kind === "began" ? "Began" : "Ended"}
                          </Badge>
                        }
                      />
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
                      <DossierItemButton
                        variant="outline"
                        size="sm"
                        key={grudge.id}
                        aria-label={`Open ${grudge.targetName} dossier`}
                        onSelect={() => onNodeSelect(grudge.targetId)}
                        title={grudge.label}
                        description={`Affecting ${grudge.targetName}`}
                        trailing={
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
                        }
                      />
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
                        <ChangeItem
                          change={change}
                          key={change.node.id}
                          onNodeSelect={onNodeSelect}
                        />
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
                            <ChangeItem
                              change={change}
                              key={change.node.id}
                              onNodeSelect={onNodeSelect}
                            />
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
      </ScrollArea>
    </DossierDialogFrame>
  );
}

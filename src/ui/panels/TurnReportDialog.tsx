import { FactionMetricName } from "@/ui/FactionMetric";
import {
  BookOpenText,
  CircleCheck,
  CircleAlert,
  Flame,
  ScrollText,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatSignedValue } from "@/ui/formatValue";
import { isEtherealTurn } from "@/ui/institutionEra";
import { crisisTurnsLabel } from "@/ui/game/crisisPresentation";
import { DossierDialogFrame } from "./DossierDialogFrame";
import { DossierItemButton } from "./DossierItemButton";
import type { TurnReport } from "./projectReport";
import { ChangesSection } from "./ChangesSection";
import "./panels.css";

interface TurnReportDialogProps {
  readonly report: TurnReport;
  readonly open: boolean;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onCrisisSelect: (crisisId: string) => void;
  readonly onEventSelect: (eventId: string) => void;
  readonly onOpenChange: (open: boolean) => void;
}

export function TurnReportDialog({
  report,
  open,
  onNodeSelect,
  onCrisisSelect,
  onEventSelect,
  onOpenChange,
}: TurnReportDialogProps) {
  const heading =
    report.year === undefined ? `Turn ${report.turn}` : `Year ${report.year}`;
  const hasOutcomes =
    report.changes.length > 0 ||
    report.situationTransitions.length > 0 ||
    report.grudges.length > 0 ||
    report.crisisTransitions.length > 0 ||
    report.events.length > 0;
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
            The record of Events, persistent changes, and temporary effects
            following turn {report.turn}.
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
        <div className="min-h-full px-6">
          {!hasOutcomes ? (
            <Empty className="my-6 min-h-56 border">
              <EmptyHeader>
                <EmptyTitle>No recorded changes</EmptyTitle>
                <EmptyDescription>
                  The institution remained steady during this turn.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex min-h-full flex-col gap-6">
              {(report.events.length > 0 ||
                report.crisisTransitions.length > 0 ||
                report.grudges.length > 0 ||
                report.situationTransitions.length > 0) && (
                <ItemGroup aria-label="Turn outcomes">
                  {report.events.map((event) => (
                    <DossierItemButton
                      key={event.id}
                      variant="outline"
                      size="sm"
                      leading={
                        <ScrollText
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                      }
                      title={event.title}
                      description={event.description}
                      aria-label={`Open ${event.title} Event details`}
                      onSelect={() => onEventSelect(event.id)}
                    />
                  ))}
                  {report.crisisTransitions.map((transition) => (
                    <DossierItemButton
                      variant="outline"
                      size="sm"
                      className="active:translate-y-px active:bg-accent"
                      key={`${transition.definition.id}:${transition.kind}`}
                      aria-label={`Open ${transition.definition.title} crisis dossier`}
                      onSelect={() => onCrisisSelect(transition.definition.id)}
                      leading={
                        <TriangleAlert
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                      }
                      title={
                        transition.kind === "stage"
                          ? transition.stage?.title
                          : transition.definition.recovery?.title
                      }
                      description={
                        transition.kind === "stage"
                          ? transition.stage?.description
                          : transition.definition.recovery?.description
                      }
                      trailing={
                        <Badge variant="outline">
                          {transition.kind === "stage"
                            ? `${crisisTurnsLabel(transition.turnsRemaining)} to Game Over`
                            : "Recovered"}
                        </Badge>
                      }
                    />
                  ))}
                  {report.grudges.map((grudge) => (
                    <DossierItemButton
                      variant="outline"
                      size="sm"
                      key={grudge.id}
                      aria-label={`Open ${grudge.targetName}${grudge.targetMetric ? ` (${grudge.targetMetric.label})` : ""} dossier`}
                      onSelect={() => onNodeSelect(grudge.targetId)}
                      leading={
                        <Flame aria-hidden="true" className="size-4 shrink-0" />
                      }
                      title={grudge.label}
                      description={
                        <span className="inline-flex items-center gap-1.5">
                          <span>Affecting</span>
                          <FactionMetricName
                            name={grudge.targetName}
                            metric={grudge.targetMetric}
                          />
                        </span>
                      }
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
                  {report.situationTransitions.map((transition) => (
                    <DossierItemButton
                      variant="outline"
                      size="sm"
                      key={transition.node.id}
                      aria-label={`Open ${transition.node.name} dossier`}
                      onSelect={() => onNodeSelect(transition.node.id)}
                      leading={
                        transition.kind === "began" ? (
                          <CircleAlert
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                        ) : (
                          <CircleCheck
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                        )
                      }
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
              )}

              <ChangesSection
                title="Changes this turn"
                changes={report.changes}
                onNodeSelect={onNodeSelect}
                previewCount={4}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </DossierDialogFrame>
  );
}

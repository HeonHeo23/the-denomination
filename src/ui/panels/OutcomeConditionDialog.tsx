import { ScrollArea } from "@/components/ui/scroll-area";
import { NodeName } from "@/ui/FactionMetric";
import {
  ArrowRight,
  CircleAlert,
  CircleDashed,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ItemGroup } from "@/components/ui/item";
import type { Contribution } from "@/ui/game/projectContributions";
import type { OutcomeConditionDetailView } from "@/ui/game/outcomeViews";
import { formatContributionPercent } from "@/ui/formatValue";
import { EffectRow, EffectTableCard } from "./NodeEffectCard";
import { contributionTone } from "./projectNodeEffects";
import type { NodeEffectView } from "./projectNodeEffects";
import DossierDialogFrame from "./DossierDialogFrame";
import { DossierItemButton } from "./DossierItemButton";

interface OutcomeConditionDialogProps {
  readonly historyDateLabel?: string;
  readonly condition: OutcomeConditionDetailView;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onClose: () => void;
}

const contributionRowView = (contribution: Contribution): NodeEffectView => {
  return {
    id: contribution.id,
    kind: contribution.kind,
    relatedNodeId: contribution.sourceId,
    relatedName: contribution.sourceTitle,
    sourceMetric: contribution.sourceMetric,
    targetMetric: contribution.targetMetric,
    label: contribution.label,
    contribution: contribution.amount,
    contributionLabel: formatContributionPercent(contribution.amount),
    contributionTone: contributionTone(contribution.amount),
  };
};

export default function OutcomeConditionDialog({
  condition,
  historyDateLabel,
  onNodeSelect,
  onClose,
}: OutcomeConditionDialogProps) {
  const contributions = condition.contributions;
  const contributionsByTarget = condition.contributionGroups;
  const detail = condition.kind === "crisis" ? condition.timeline : undefined;
  const matchLabel =
    condition.matchSource === "outcome"
      ? "Recorded at conclusion"
      : condition.matchSource === "crisis-evaluation"
        ? "Recorded at crisis evaluation"
        : "Current requirements";
  return (
    <DossierDialogFrame
      open
      surface="condition"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      header={
        <>
          {historyDateLabel && (
            <Badge variant="outline" className="w-fit">
              Current details · opened from {historyDateLabel}
            </Badge>
          )}
          <div className="grid min-w-0 gap-3">
            <div className="min-w-0">
              <DialogTitle>{condition.title}</DialogTitle>
              <DialogDescription className="mt-3">
                {condition.description}
              </DialogDescription>
            </div>
          </div>
        </>
      }
    >
      {/* If more tooltips are added, the provider may move to a component higher in the hierarchy. */}
      <TooltipProvider>
        <ScrollArea className="min-h-0 min-w-0 flex-1 focus-within:ring-2 focus-within:ring-ring">
          <div
            className="flex flex-col gap-5 px-6 pb-6 outline-none"
            tabIndex={0}
            role="region"
            aria-label="Outcome condition details"
          >
            {condition.kind === "crisis" && detail && (
              <section
                className="node-record__reading node-record__reading--crisis"
                aria-label="Crisis progress"
              >
                <div>
                  <span>Current stage</span>
                  <strong>{detail.stageLabel}</strong>
                  {detail.stageDescription && (
                    <p className="mt-1 max-w-sm text-sm leading-snug text-muted-foreground">
                      {detail.stageDescription}
                    </p>
                  )}
                </div>
                <div
                  className="crisis-timeline"
                  role="group"
                  aria-label="Crisis timeline"
                >
                  <div className="crisis-timeline__track">
                    <Progress
                      value={condition.progressPercent}
                      tabIndex={0}
                      aria-label={detail.progressLabel}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="crisis-timeline__tick crisis-timeline__tick--start"
                          aria-label="Turn 0: Start of the crisis timeline"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Start</TooltipContent>
                    </Tooltip>
                    {detail.milestones.map((milestone) => (
                      <Tooltip key={milestone.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="crisis-timeline__tick"
                            data-edge={
                              milestone.kind === "terminal" ? "end" : undefined
                            }
                            style={{ left: `${milestone.positionPercent}%` }}
                            aria-label={`Turn ${milestone.turn}: ${milestone.title}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{milestone.title}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  <div className="crisis-timeline__scale" aria-hidden="true">
                    <span>0 turns</span>
                    <span>{detail.terminalTurn} turns</span>
                  </div>
                </div>
                <div className="crisis-progress-copy">
                  <strong>{detail.progressCopy.primary}</strong>
                  <small>{detail.progressCopy.secondary}</small>
                </div>
              </section>
            )}

            <section aria-labelledby="condition-prerequisites-title">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck aria-hidden="true" />
                <h3
                  id="condition-prerequisites-title"
                  className="font-heading text-base"
                >
                  Prerequisite groups
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {matchLabel}. Groups are alternatives; every requirement
                  within a group must hold. Individual readings below describe
                  the current state.
                </p>
                {condition.allGroups.map(
                  ({ id, title, description, matched, prerequisites }) => (
                    <Card key={id} size="sm">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-sm">{title}</CardTitle>
                          <Badge
                            variant={
                              matched
                                ? condition.kind === "crisis"
                                  ? "destructive"
                                  : "secondary"
                                : "outline"
                            }
                          >
                            {matched ? "Matched" : "Not matched"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {description && (
                          <p className="mb-3 text-sm text-muted-foreground">
                            {description}
                          </p>
                        )}
                        <ItemGroup className="gap-1 md:grid md:grid-cols-2">
                          {prerequisites.map(
                            (
                              { nodeId, title, description, isMet, metric },
                              index,
                            ) => (
                              <DossierItemButton
                                key={`${id}:${index}`}
                                className="gap-2 py-1.5"
                                aria-label={
                                  nodeId
                                    ? `Open ${title} node dossier`
                                    : undefined
                                }
                                onSelect={
                                  nodeId
                                    ? () => onNodeSelect(nodeId)
                                    : undefined
                                }
                                leading={
                                  nodeId &&
                                  (isMet ? (
                                    condition.kind === "crisis" ? (
                                      <CircleAlert aria-hidden="true" />
                                    ) : (
                                      <ShieldCheck aria-hidden="true" />
                                    )
                                  ) : (
                                    <CircleDashed aria-hidden="true" />
                                  ))
                                }
                                title={
                                  metric ? (
                                    <NodeName name={title} metric={metric} />
                                  ) : (
                                    title
                                  )
                                }
                                description={description}
                                trailing={
                                  <Badge
                                    variant={
                                      isMet
                                        ? condition.kind === "crisis"
                                          ? "destructive"
                                          : "secondary"
                                        : "outline"
                                    }
                                  >
                                    {isMet
                                      ? "Currently met"
                                      : "Currently not met"}
                                  </Badge>
                                }
                              />
                            ),
                          )}
                        </ItemGroup>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            </section>

            {contributions.length > 0 && (
              <section aria-labelledby="condition-contributions-title">
                <div className="mb-3 flex items-center gap-2">
                  <ArrowRight aria-hidden="true" />
                  <h3
                    id="condition-contributions-title"
                    className="font-heading text-base"
                  >
                    Contributing factors
                  </h3>
                </div>
                <div className="grid items-stretch gap-4 lg:grid-cols-2">
                  {contributionsByTarget.map(
                    ({
                      targetId,
                      targetTitle,
                      targetMetric,
                      contributions: targetContributions,
                      currentReading,
                    }) => {
                      return (
                        <EffectTableCard
                          key={`${targetId}:${targetMetric?.id ?? "value"}`}
                          title={
                            <NodeName
                              name={targetTitle}
                              metric={targetMetric}
                            />
                          }
                          legend={
                            currentReading !== undefined ? (
                              <Badge variant="outline">
                                <span className="sr-only">
                                  Current reading:{" "}
                                </span>
                                {currentReading}
                              </Badge>
                            ) : undefined
                          }
                          ariaLabel={`Open ${targetTitle}${targetMetric ? ` ${targetMetric.label}` : ""} node dossier`}
                          onOpen={() => onNodeSelect(targetId)}
                          headerClassName="border-b border-border/60"
                        >
                          <ItemGroup className="min-w-0 gap-1">
                            {targetContributions.map((contribution) => (
                              <EffectRow
                                key={contribution.id}
                                effect={contributionRowView(contribution)}
                                direction="incoming"
                                onNodeSelect={onNodeSelect}
                                showInertia={false}
                                stopPropagation
                              />
                            ))}
                          </ItemGroup>
                        </EffectTableCard>
                      );
                    },
                  )}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </TooltipProvider>
    </DossierDialogFrame>
  );
}

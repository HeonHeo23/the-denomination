import { FactionMetricName } from "@/ui/FactionMetric";
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
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import {
  projectContributions,
  type Contribution,
  groupContributions,
} from "@/ui/game/projectContributions";
import { projectCrisisDetail, type CrisisView } from "@/ui/game/projectCrisis";
import { formatContributionPercent, formatValue } from "@/ui/formatValue";
import { EffectRow, EffectTableCard } from "./NodeEffectCard";
import type { NodeEffectView } from "./projectNodeEffects";
import { DossierDialogFrame } from "./DossierDialogFrame";
import { DossierItemButton } from "./DossierItemButton";

interface CrisisDetailsDialogProps {
  readonly crisis: CrisisView;
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onClose: () => void;
}

function contributionTone(amount: number): "positive" | "negative" | "neutral" {
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
}

function contributionRowView(contribution: Contribution): NodeEffectView {
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
}

export function CrisisDetailsDialog({
  crisis,
  scenario,
  state,
  onNodeSelect,
  onClose,
}: CrisisDetailsDialogProps) {
  const contributions = projectContributions(
    scenario,
    state,
    crisis.matchedPrerequisiteNodeIds,
  );
  const contributionsByTarget = groupContributions(contributions);
  const detail = projectCrisisDetail(crisis);
  return (
    <DossierDialogFrame
      open
      surface="crisis"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      header={
        <>
          <div className="grid min-w-0 gap-3">
            <div className="min-w-0">
              <DialogTitle>{crisis.definition.title}</DialogTitle>
              <DialogDescription className="mt-3">
                {crisis.definition.report.narrative}
              </DialogDescription>
            </div>
          </div>
        </>
      }
    >
      {/* If more tooltips are added, the provider may move to a component higher in the hierarchy. */}
      <TooltipProvider>
        <div
          className="min-h-0 min-w-0 flex-1 overflow-y-auto"
          tabIndex={0}
          role="region"
          aria-label="Crisis details"
        >
          <div className="flex flex-col gap-5 px-6 pb-6">
            <section
              className="node-record__reading node-record__reading--crisis"
              aria-label="Crisis progress"
            >
              <div>
                <span>Current stage</span>
                <strong>{detail.stageLabel}</strong>
                {crisis.stage?.description && (
                  <p className="mt-1 max-w-sm text-sm leading-snug text-muted-foreground">
                    {crisis.stage.description}
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
                    value={crisis.progressPercent}
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

            <section aria-labelledby="crisis-prerequisites-title">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck aria-hidden="true" />
                <h3
                  id="crisis-prerequisites-title"
                  className="font-heading text-base"
                >
                  Prerequisite Groups
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {crisis.allGroups.map(({ group, matched, prerequisites }) => (
                  <Card key={group.id} size="sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-sm">{group.title}</CardTitle>
                        <Badge variant={matched ? "destructive" : "outline"}>
                          {matched ? "Activated" : "Not activated"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ItemGroup className="gap-1 md:grid md:grid-cols-2">
                        {prerequisites.map(
                          (
                            { nodeId, title, description, met, metric },
                            index,
                          ) => (
                            <DossierItemButton
                              key={`${group.id}:${index}`}
                              className="gap-2 py-1.5"
                              aria-label={
                                nodeId
                                  ? `Open ${title} node dossier`
                                  : undefined
                              }
                              onSelect={
                                nodeId ? () => onNodeSelect(nodeId) : undefined
                              }
                              leading={
                                nodeId &&
                                (met ? (
                                  <CircleAlert aria-hidden="true" />
                                ) : (
                                  <CircleDashed aria-hidden="true" />
                                ))
                              }
                              title={
                                metric ? (
                                  <FactionMetricName
                                    name={title}
                                    metric={metric}
                                  />
                                ) : (
                                  title
                                )
                              }
                              description={description}
                              trailing={
                                <Badge
                                  variant={met ? "destructive" : "outline"}
                                >
                                  {met ? "Breached" : "Clear"}
                                </Badge>
                              }
                            />
                          ),
                        )}
                      </ItemGroup>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {contributions.length > 0 && (
              <section aria-labelledby="crisis-contributions-title">
                <div className="mb-3 flex items-center gap-2">
                  <ArrowRight aria-hidden="true" />
                  <h3
                    id="crisis-contributions-title"
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
                    }) => {
                      const target = scenario.nodes.find(
                        ({ id }) => id === targetId,
                      );
                      const targetState = state.nodes[targetId];
                      const currentReading =
                        target && targetState
                          ? formatValue(targetState.value, target.domain)
                          : undefined;
                      return (
                        <EffectTableCard
                          key={`${targetId}:${targetMetric?.id ?? "value"}`}
                          title={
                            <FactionMetricName
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
        </div>
      </TooltipProvider>
    </DossierDialogFrame>
  );
}

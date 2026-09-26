import {
  ArrowDownRight,
  ArrowRight,
  BookOpenText,
  CircleAlert,
  CircleDashed,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import type { ScenarioDefinition, SimulationState } from "@/simulation";
import {
  projectGameOverContributions,
  type Contribution,
  groupContributions,
  type CrisisView,
} from "@/ui/game/projectGameOvers";
import {
  crisisCountdown,
  crisisElapsedLabel,
  crisisProgressLabel,
  crisisStageLabel,
} from "@/ui/game/crisisPresentation";
import { formatContributionPercent } from "@/ui/formatValue";
import { EffectRow, EffectTableCard } from "./NodeEffectCard";
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

function effectBarView(contribution: Contribution) {
  return {
    id: contribution.id,
    kind: "effect",
    relatedNodeId: contribution.sourceId,
    relatedName: contribution.sourceTitle,
    label: contribution.label,
    contribution: contribution.amount,
    contributionLabel: formatContributionPercent(contribution.amount),
    contributionTone: contributionTone(contribution.amount),
  } as const;
}

export function CrisisDetailsDialog({
  crisis,
  scenario,
  state,
  onNodeSelect,
  onClose,
}: CrisisDetailsDialogProps) {
  const contributions = projectGameOverContributions(
    scenario,
    state,
    crisis.matchedPrerequisiteNodeIds,
  );
  const contributionsByTarget = groupContributions(contributions);
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
              <DialogDescription>
                {crisis.stage?.description ??
                  crisis.definition.report.narrative}
              </DialogDescription>
            </div>
          </div>
        </>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-6 pb-6">
          <section
            className="node-record__reading"
            aria-label="Crisis progress"
          >
            <div>
              <span>Current stage</span>
              <strong>{crisisStageLabel(crisis)}</strong>
            </div>
            <div className="node-record__meter">
              <Progress
                value={crisis.progressPercent}
                aria-label={crisisProgressLabel(crisis)}
              />
            </div>
            <div>
              <strong>{crisisCountdown(crisis)}</strong>
              <small>{crisisElapsedLabel(crisis)}</small>
            </div>
          </section>

          <section aria-labelledby="crisis-history-title">
            <div className="mb-2 flex items-center gap-2">
              <BookOpenText aria-hidden="true" />
              <h3 id="crisis-history-title" className="font-heading text-base">
                Historical trajectory
              </h3>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              {crisis.definition.report.narrative}
            </p>
          </section>

          <section aria-labelledby="crisis-prerequisites-title">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck aria-hidden="true" />
              <h3
                id="crisis-prerequisites-title"
                className="font-heading text-base"
              >
                Prerequisites
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
                      {prerequisites.map((prerequisite) => (
                        <DossierItemButton
                          key={`${group.id}:${prerequisite.prerequisite.nodeId}`}
                          className="gap-2 py-1.5"
                          aria-label={`Open ${prerequisite.nodeName} node dossier`}
                          onSelect={() =>
                            onNodeSelect(prerequisite.prerequisite.nodeId)
                          }
                          leading={
                            prerequisite.met ? (
                              <CircleAlert aria-hidden="true" />
                            ) : (
                              <CircleDashed aria-hidden="true" />
                            )
                          }
                          title={prerequisite.nodeName}
                          description={prerequisite.description}
                          trailing={
                            <Badge
                              variant={
                                prerequisite.met ? "destructive" : "outline"
                              }
                            >
                              {prerequisite.met ? "Breached" : "Clear"}
                            </Badge>
                          }
                        />
                      ))}
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
                  Current contributing factors
                </h3>
              </div>
              <div className="grid items-stretch gap-4 lg:grid-cols-2">
                {contributionsByTarget.map(
                  ({
                    targetId,
                    targetTitle,
                    contributions: targetContributions,
                  }) => (
                    <EffectTableCard
                      key={targetId}
                      title={targetTitle}
                      legend={
                        <>
                          {targetContributions.length} factor
                          {targetContributions.length === 1 ? "" : "s"}
                        </>
                      }
                      ariaLabel={`Open ${targetTitle} node dossier`}
                      onOpen={() => onNodeSelect(targetId)}
                      headerClassName="border-b border-border/60"
                    >
                      <ScrollArea className="h-full max-h-full pr-1">
                        <ItemGroup className="gap-1">
                          {targetContributions.map((contribution) =>
                            contribution.kind === "effect" ? (
                              <EffectRow
                                key={contribution.id}
                                effect={effectBarView(contribution)}
                                direction="incoming"
                                onNodeSelect={onNodeSelect}
                                showInertia={false}
                                stopPropagation
                              />
                            ) : (
                              <Item
                                role="listitem"
                                size="sm"
                                variant="muted"
                                className="gap-2 py-1.5"
                                key={contribution.id}
                                data-game-crisis-contribution-row
                                data-game-effect-row
                                aria-label={`${contribution.sourceTitle}: ${contribution.label}`}
                              >
                                <ArrowDownRight aria-hidden="true" />
                                <ItemContent className="min-w-0 gap-1">
                                  <div className="flex min-w-0 items-baseline justify-between gap-1">
                                    <ItemTitle className="min-w-0 max-w-[55%] truncate">
                                      {contribution.sourceTitle}
                                    </ItemTitle>
                                    <ItemDescription className="min-w-0 flex-1 truncate text-right">
                                      {contribution.label}
                                    </ItemDescription>
                                  </div>
                                  <div className="flex min-h-[1.35rem] items-center justify-end">
                                    <Badge
                                      className="font-mono text-[0.65rem]"
                                      variant="outline"
                                    >
                                      {contribution.value}
                                    </Badge>
                                  </div>
                                </ItemContent>
                              </Item>
                            ),
                          )}
                        </ItemGroup>
                      </ScrollArea>
                    </EffectTableCard>
                  ),
                )}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </DossierDialogFrame>
  );
}

import {
  findFactionContext,
  getFactionGroupIndex,
  projectFactionConstraints,
} from "../projections/projectFactionGroups";
import { FactionMetricIcon, FactionMetricReadings } from "@/ui/FactionMetric";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";
import type { ReactNode } from "react";
import type {
  NodeDefinition,
  FactionMetricId,
  NodeRuntimeState,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { Badge } from "@/components/ui/badge";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { NodeEffectCard } from "./NodeEffectCard";
import { NodeValueHistoryChart } from "./NodeValueHistoryChart";
import { DossierDialogFrame } from "./DossierDialogFrame";
import { projectNodeEffects } from "./projectNodeEffects";
import { StanceEditor } from "./StanceEditor";
import { formatSignedValue, formatValue } from "@/ui/formatValue";
import type {
  FactionConstraintProjection,
  FactionNodeContext,
} from "../projections/projectFactionGroups";
import "./panels.css";

interface NodeDetailsDialogProps {
  readonly definition: NodeDefinition;
  readonly runtime: NodeRuntimeState;
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onApply: (stanceId: string, value: number) => void;
  readonly onEnact: (stanceId: string, value: number) => void;
  readonly onRepeal: (stanceId: string) => void;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onFactionMetricChange: (metricId: string) => void;
  readonly onClose: () => void;
}

function activationLabel(runtime: NodeRuntimeState): string {
  if (runtime.isForced) return "Forced active";
  return runtime.isActive ? "Active" : "Inactive";
}

export function NodeDetailsDialog(props: NodeDetailsDialogProps) {
  const factionContext = findFactionContext(
    props.scenario,
    props.definition.id,
  );
  return factionContext ? (
    <FactionDetailDialog
      key={props.definition.id}
      {...props}
      factionContext={factionContext}
    />
  ) : (
    <NodeDetailsDialogContent
      key={props.definition.id}
      {...props}
      displayName={props.definition.name}
      displayDescription={props.definition.description}
    />
  );
}

function FactionDetailDialog({
  factionContext,
  ...props
}: NodeDetailsDialogProps & {
  readonly factionContext: FactionNodeContext;
}) {
  const { scenario, state } = props;
  // Start with the metric represented by the node that opened the dossier.
  const [selectedMetric, setSelectedMetric] = useState<FactionMetricId>(
    factionContext.metric.id,
  );
  // Resolve all nodes in this group.
  const groupNodeContexts = getFactionGroupIndex(scenario).byGroup.get(
    factionContext.group.id,
  )!;
  const factionConstraints = projectFactionConstraints(
    scenario,
    factionContext.group.id,
  );
  // Bind the dossier's value and effects to the selected metric node.
  const selected = groupNodeContexts.find(
    (member) => member.metric.id === selectedMetric,
  );
  const definition = selected?.node ?? props.definition;
  const runtime = selected ? state.nodes[selected.node.id] : props.runtime;
  const metricLabel = selected?.metric.label ?? "Value";
  // Keep dossier metric changes reflected in the global graph selector.
  const metricSelector = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      className="node-value-history__metric-toggle flex-wrap"
      value={selectedMetric}
      aria-label="Faction metric"
      onValueChange={(metric) => {
        if (scenario.factionMetrics?.some((item) => item.id === metric)) {
          setSelectedMetric(metric);
          props.onFactionMetricChange(metric);
        }
      }}
    >
      {(scenario.factionMetrics ?? []).map((metric) => (
        <ToggleGroupItem
          key={metric.id}
          value={metric.id}
          aria-label={metric.label}
          title={metric.label}
          className="node-value-history__metric-button"
        >
          <FactionMetricIcon metric={metric} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  // Pass the faction projection into the shared node dossier renderer.
  return (
    <NodeDetailsDialogContent
      {...props}
      definition={definition}
      runtime={runtime}
      displayName={factionContext.group.name}
      displayDescription={factionContext.group.description}
      factionSummary={
        <FactionSummary
          groupNodeContexts={groupNodeContexts}
          constraints={factionConstraints}
          state={state}
          onNodeSelect={props.onNodeSelect}
        />
      }
      metricLabel={metricLabel}
      metricKey={selectedMetric}
      metricSelector={metricSelector}
    />
  );
}

function FactionSummary({
  groupNodeContexts,
  constraints,
  state,
  onNodeSelect,
}: {
  readonly groupNodeContexts: readonly FactionNodeContext[];
  readonly constraints: readonly FactionConstraintProjection[];
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 md:mt-auto">
      <FactionMetricReadings
        readings={groupNodeContexts.map((member) => ({
          metric: member.metric,
          value: formatValue(
            state.nodes[member.node.id].value,
            member.node.domain,
          ),
        }))}
      />
      {constraints.map((constraint) => (
        <div
          key={constraint.id}
          className="flex flex-col gap-1 rounded-sm border border-border/60 px-3 py-2"
        >
          {/* Keep this*/}
          {/* <p className="text-sm font-medium">
            {constraint.name ?? "Shared limit"}
          </p> */}
          {/* <p className="text-sm text-muted-foreground">
            Combined value for{" "}
            {constraint.participants
              .map(({ groupName }) => groupName)
              .join(", ")}{" "}
            cannot exceed {constraint.maxTotal}.
          </p> */}
          {constraint.participants.some(
            ({ belongsToCurrentGroup }) => !belongsToCurrentGroup,
          ) && (
            <div className="flex flex-wrap items-center gap-x-1">
              <span className="text-sm text-muted-foreground">
                Other participating group(s):
              </span>
              {constraint.participants
                .filter(({ belongsToCurrentGroup }) => !belongsToCurrentGroup)
                .map(({ nodeId, groupName, metricLabel }) => (
                  <Button
                    key={nodeId}
                    variant="link"
                    aria-label={
                      "Open " + groupName + " " + metricLabel + " dossier"
                    }
                    onClick={() => onNodeSelect(nodeId)}
                  >
                    {groupName}
                  </Button>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface NodeDetailsDialogContentProps extends NodeDetailsDialogProps {
  readonly displayName: string;
  readonly displayDescription: string;
  readonly factionSummary?: ReactNode;
  readonly metricLabel?: string;
  readonly metricKey?: string;
  readonly metricSelector?: ReactNode;
}

function NodeDetailsDialogContent({
  definition,
  runtime,
  displayName,
  displayDescription,
  factionSummary,
  metricLabel,
  metricKey,
  metricSelector,
  scenario,
  state,
  onApply,
  onEnact,
  onRepeal,
  onNodeSelect,
  onClose,
}: NodeDetailsDialogContentProps) {
  const [stancePreview, setStancePreview] = useState<{
    readonly stanceId: string;
    readonly value: number;
  } | null>(null);
  const previewValue =
    definition.type !== "stance"
      ? undefined
      : stancePreview?.stanceId === definition.id
        ? stancePreview.value
        : runtime.value;
  const effects = projectNodeEffects(
    definition.id,
    scenario,
    state,
    previewValue,
  );
  const visibleEffects = effects;
  // Reserved facts-table template. Value metadata appears in the chart or
  // header badges, alongside the faction header annotation.
  const details: readonly [string, string][] = [];

  return (
    <DossierDialogFrame
      open
      surface="node"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      header={
        <>
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
            <div
              className={cn(
                "min-w-0 md:flex-1",
                definition.type === "faction" && "md:flex md:flex-col",
              )}
            >
              <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {definition.category ?? "Uncategorized"}
                </Badge>
                <Badge variant="outline">{definition.type}</Badge>
                <Badge variant="outline">{activationLabel(runtime)}</Badge>
                {definition.type === "stance" && (
                  <Badge variant="outline">
                    {definition.domain.clamp ? "Clamped" : "Unclamped"}
                  </Badge>
                )}
                {definition.type === "faction" && (
                  <Badge variant="outline" title="Faction category">
                    {definition.factionCategory}
                  </Badge>
                )}
              </div>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <DialogTitle>{displayName}</DialogTitle>
              </div>
              <DialogDescription>{displayDescription}</DialogDescription>
              {factionSummary}
              {definition.type === "resource" && (
                <p className="font-mono text-sm">
                  {formatValue(runtime.value, definition.domain)} (
                  {formatSignedValue(runtime.netFlow ?? 0, definition.domain)}
                  /turn)
                </p>
              )}
            </div>
            {definition.type !== "stance" && (
              <div className="min-w-0 md:basis-2/5">
                <NodeValueHistoryChart
                  key={`${definition.id}:${metricKey ?? "value"}`}
                  definition={definition}
                  scenario={scenario}
                  state={state}
                  metricLabel={metricLabel}
                  metricSelector={metricSelector}
                />
              </div>
            )}
          </div>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-6",
            definition.type === "stance"
              ? "gap-2 pb-4"
              : "overflow-y-auto pb-6",
          )}
        >
          {details.length > 0 && (
            <dl className="node-record__facts grid shrink-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-mono text-[0.62rem] tracking-wider text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium wrap-break-word">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {definition.type === "stance" ? (
            <NodeEffectCard
              title="Outgoing effects"
              direction="outgoing"
              effects={visibleEffects.outgoing}
              onNodeSelect={(nodeId) => {
                setStancePreview(null);
                onNodeSelect(nodeId);
              }}
              layout="compact"
            />
          ) : (
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:min-h-32 md:flex-1 md:grid-cols-2 md:items-stretch">
              <NodeEffectCard
                title="Incoming effects"
                direction="incoming"
                effects={visibleEffects.incoming}
                onNodeSelect={onNodeSelect}
                fitContent
              />
              <NodeEffectCard
                title="Outgoing effects"
                direction="outgoing"
                effects={visibleEffects.outgoing}
                onNodeSelect={onNodeSelect}
                fitContent
              />
            </div>
          )}
        </div>

        {definition.type === "stance" && (
          <div className="shrink-0 bg-background px-6 py-2">
            <StanceEditor
              key={definition.id}
              state={state}
              definition={definition}
              value={runtime.value}
              scenario={scenario}
              onApply={(value) => onApply(definition.id, value)}
              onEnact={(value) => onEnact(definition.id, value)}
              onRepeal={() => onRepeal(definition.id)}
              onDraftChange={(value) => {
                setStancePreview({ stanceId: definition.id, value });
              }}
            />
          </div>
        )}
      </div>
    </DossierDialogFrame>
  );
}

import { useState } from "react";
import type {
  NodeDefinition,
  NodeRuntimeState,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { Badge } from "@/components/ui/badge";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatValue, meterPercent } from "@/ui/formatValue";
import { projectNodeReferenceMarkers } from "@/ui/referenceMarkers";
import { NodeEffectCard } from "./NodeEffectCard";
import { DossierDialogFrame } from "./DossierDialogFrame";
import { projectNodeEffects } from "./projectNodeEffects";
import { StanceEditor } from "./StanceEditor";
import "../reference-markers.css";
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
  readonly onClose: () => void;
}

function activationLabel(runtime: NodeRuntimeState): string {
  if (runtime.isForced) return "Forced active";
  return runtime.isActive ? "Active" : "Inactive";
}

export function NodeDetailsDialog({
  definition,
  runtime,
  scenario,
  state,
  onApply,
  onEnact,
  onRepeal,
  onNodeSelect,
  onClose,
}: NodeDetailsDialogProps) {
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
  const referenceMarkers = projectNodeReferenceMarkers(definition);
  const referenceDescription = referenceMarkers
    .map(
      ({ label, value }) => `${label} ${formatValue(value, definition.domain)}`,
    )
    .join("; ");
  const referenceAriaDescription = referenceDescription
    ? `; ${referenceDescription}`
    : "";

  // Reserved facts-table template. Value metadata is currently conveyed by
  // the reading meter/reference markers and faction header annotation.
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
          <div className="mb-2 flex gap-2">
            <Badge variant="secondary">
              {definition.category ?? "Uncategorized"}
            </Badge>
            <Badge className="capitalize" variant="outline">
              {definition.type}
            </Badge>
            <Badge variant="outline">{activationLabel(runtime)}</Badge>
          </div>
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,24rem)] lg:items-end lg:gap-6">
            <div className="min-w-0">
              <DialogTitle>{definition.name}</DialogTitle>
              <DialogDescription>{definition.description}</DialogDescription>
            </div>
            {definition.type === "faction" && (
              <div className="min-w-0 lg:justify-self-end lg:text-right">
                <span className="font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
                  Value meaning
                </span>
                <p className="mt-1 truncate text-xs leading-relaxed text-muted-foreground">
                  {definition.valueMeaning}
                </p>
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
            definition.type === "stance" ? "gap-2 pb-4" : "gap-5 pb-6",
          )}
        >
          <section
            className="node-record__reading"
            aria-label="Current reading"
          >
            <div>
              <span>Current value</span>
              <strong>{formatValue(runtime.value, definition.domain)}</strong>
              <small>{activationLabel(runtime)}</small>
            </div>
            <div className="node-record__meter">
              <Progress
                value={meterPercent(runtime.value, definition.domain)}
                aria-label={`${definition.name}: current ${formatValue(runtime.value, definition.domain)}${referenceAriaDescription}`}
              />
              {referenceMarkers.map((marker) => (
                <span
                  className="reference-meter-marker"
                  data-reference-edge={
                    marker.positionPercent === 0
                      ? "start"
                      : marker.positionPercent === 100
                        ? "end"
                        : undefined
                  }
                  key={marker.kind}
                  style={{
                    left: `${marker.positionPercent}%`,
                  }}
                  title={`${marker.label} ${formatValue(marker.value, definition.domain)}`}
                  aria-hidden="true"
                >
                  <span className="reference-meter-marker__label">
                    {marker.kind === "start-threshold"
                      ? "Starts"
                      : marker.kind === "stop-threshold"
                        ? "Stops"
                        : marker.label}
                  </span>
                  <span
                    className="reference-meter-tick"
                    data-reference-kind={marker.kind}
                  />
                  <span className="reference-meter-marker__value">
                    {formatValue(marker.value, definition.domain)}
                  </span>
                </span>
              ))}
            </div>
            <div>
              <span>Numeric domain</span>
              <strong>
                {formatValue(definition.domain.min, definition.domain)}–
                {formatValue(definition.domain.max, definition.domain)}
              </strong>
              <small>{definition.domain.clamp ? "Clamped" : "Unclamped"}</small>
            </div>
          </section>
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
              effects={effects.outgoing}
              onNodeSelect={(nodeId) => {
                setStancePreview(null);
                onNodeSelect(nodeId);
              }}
              layout="stance"
            />
          ) : (
            <div className="grid h-full min-h-0 flex-1 gap-4 lg:grid-cols-2">
              <NodeEffectCard
                title="Incoming effects"
                direction="incoming"
                effects={effects.incoming}
                onNodeSelect={onNodeSelect}
              />
              <NodeEffectCard
                title="Outgoing effects"
                direction="outgoing"
                effects={effects.outgoing}
                onNodeSelect={onNodeSelect}
              />
            </div>
          )}
        </div>

        {definition.type === "stance" && !state.outcome && (
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
              onDraftChange={(value) =>
                setStancePreview({ stanceId: definition.id, value })
              }
            />
          </div>
        )}
      </div>
    </DossierDialogFrame>
  );
}

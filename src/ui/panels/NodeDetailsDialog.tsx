import { useState } from "react";
import type {
  NodeDefinition,
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
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {definition.category ?? "Uncategorized"}
            </Badge>
            <Badge className="capitalize" variant="outline">
              {definition.type}
            </Badge>
            <Badge variant="outline">{activationLabel(runtime)}</Badge>
            {definition.type === "stance" && (
              <Badge variant="outline">
                {definition.domain.clamp ? "Clamped" : "Unclamped"}
              </Badge>
            )}
            {definition.type === "faction" && (
              <Badge
                className="ml-auto max-w-full min-w-0"
                variant="outline"
                title={`Value meaning: ${definition.valueMeaning}`}
              >
                <span className="truncate">
                  Value meaning: {definition.valueMeaning}
                </span>
              </Badge>
            )}
          </div>
          <div className="min-w-0">
            <DialogTitle>{definition.name}</DialogTitle>
            <DialogDescription>{definition.description}</DialogDescription>
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
          {definition.type !== "stance" && (
            <section
              className="node-record__reading node-record__reading--history"
              aria-label="Value history"
            >
              <NodeValueHistoryChart
                key={definition.id}
                definition={definition}
                scenario={scenario}
                state={state}
              />
            </section>
          )}
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
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:min-h-[8rem] md:flex-1 md:grid-cols-2 md:items-stretch">
              <NodeEffectCard
                title="Incoming effects"
                direction="incoming"
                effects={effects.incoming}
                onNodeSelect={onNodeSelect}
                fitContent
              />
              <NodeEffectCard
                title="Outgoing effects"
                direction="outgoing"
                effects={effects.outgoing}
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

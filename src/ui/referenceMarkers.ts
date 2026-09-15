import type { NodeDefinition } from "../simulation";
import { meterPercent } from "./formatValue";

export type NodeReferenceMarkerKind =
  "baseline" | "start-threshold" | "stop-threshold";

export interface NodeReferenceMarker {
  readonly kind: NodeReferenceMarkerKind;
  readonly label: string;
  readonly value: number;
  readonly positionPercent: number;
}

/** Projects authored node reference values into meter positions. */
export function projectNodeReferenceMarkers(
  definition: NodeDefinition,
): NodeReferenceMarker[] {
  // Stance meters omit baselines; Situation meters use thresholds instead.
  if (definition.type === "stance") return [];

  const references: {
    readonly kind: NodeReferenceMarkerKind;
    readonly label: string;
    readonly value: number;
  }[] = [];

  if (definition.type === "situation") {
    references.push(
      {
        kind: "start-threshold",
        label: "Starts at",
        value: definition.startThreshold,
      },
      {
        kind: "stop-threshold",
        label: "Stops at",
        value: definition.stopThreshold,
      },
    );
  } else {
    references.push({
      kind: "baseline",
      label: "Baseline",
      value: definition.baseline ?? definition.initial.value,
    });
  }

  return references.map((reference) => ({
    ...reference,
    positionPercent: meterPercent(reference.value, definition.domain),
  }));
}

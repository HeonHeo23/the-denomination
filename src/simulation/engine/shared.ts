import type {
  NodeDefinition,
  NodeId,
  ScenarioDefinition,
} from "../domain/definitions";

/** Builds an ID-keyed lookup for a Scenario's immutable node definitions. */
export function indexNodes(
  scenario: ScenarioDefinition,
): Readonly<Record<NodeId, NodeDefinition>> {
  return Object.fromEntries(scenario.nodes.map((node) => [node.id, node]));
}

/** Applies a node's numeric bounds when that domain enables clamping. */
export function clampValue(value: number, node: NodeDefinition): number {
  if (!node.domain.clamp) return value;
  return Math.min(node.domain.max, Math.max(node.domain.min, value));
}

/** Static requirements gate eligibility without changing simulation values. */
export function conditionsMet(
  scenario: ScenarioDefinition,
  requires: readonly string[] = [],
): boolean {
  return requires.every((condition) =>
    (scenario.conditions ?? []).includes(condition),
  );
}

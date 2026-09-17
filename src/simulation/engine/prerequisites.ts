import type {
  PrerequisiteDefinition,
  PrerequisiteGroupDefinition,
} from "../domain/definitions";
import type { SimulationState } from "../domain/runtime";

/** Evaluate one reusable runtime prerequisite against a snapshot. */
export function prerequisiteMet(
  prerequisite: PrerequisiteDefinition,
  state: SimulationState,
): boolean {
  const node = state.nodes[prerequisite.nodeId];
  if (!node) return false;
  if (prerequisite.kind === "node-activation")
    return node.isActive === prerequisite.active;
  return prerequisite.comparison === "at-most"
    ? node.value <= prerequisite.value
    : node.value >= prerequisite.value;
}

/** Return every satisfied all-of group; callers treat groups as alternatives. */
export function matchingPrerequisiteGroups(
  groups: readonly PrerequisiteGroupDefinition[],
  state: SimulationState,
): readonly PrerequisiteGroupDefinition[] {
  return groups.filter((group) =>
    group.allOf.every((prerequisite) => prerequisiteMet(prerequisite, state)),
  );
}

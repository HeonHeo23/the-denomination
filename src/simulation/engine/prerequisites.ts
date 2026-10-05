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
  switch (prerequisite.kind) {
    case "node-value": {
      const node = state.nodes[prerequisite.nodeId];
      return (
        !!node &&
        (prerequisite.comparison === "at-most"
          ? node.value <= prerequisite.value
          : node.value >= prerequisite.value)
      );
    }
    case "node-activation":
      return state.nodes[prerequisite.nodeId]?.isActive === prerequisite.active;
    case "turn":
      return state.turn >= prerequisite.atTurn;
    case "event":
      return (state.events[prerequisite.eventId]?.triggerCount ?? 0) > 0;
    case "dilemma-choice": {
      const progress = state.dilemmas[prerequisite.dilemmaId];
      return (
        !!progress &&
        progress.lastResolvedTurn !== null &&
        (prerequisite.choiceId === undefined ||
          progress.lastResolvedChoiceId === prerequisite.choiceId)
      );
    }
    case "situation-resolved":
      return (
        state.nodes[prerequisite.nodeId]?.isActive === false &&
        Object.values(state.nodeValueHistory).some(
          (nodes) => nodes[prerequisite.nodeId]?.isActive,
        )
      );
  }
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

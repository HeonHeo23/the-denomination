import type { ScenarioDefinition } from "../domain/definitions";
import type { EndingOutcome, SimulationState } from "../domain/runtime";
import { findSatisfiedPrerequisiteGroups } from "./prerequisites";

/** Select a normal outcome from a completed snapshot without changing simulation. */
export function evaluateEnding(
  scenario: ScenarioDefinition,
  state: SimulationState,
): EndingOutcome | null {
  if (
    state.outcome ||
    state.pendingDilemmaIds.length ||
    state.turn <= scenario.start.turn
  )
    return null;
  const matchedTriggerIds = findSatisfiedPrerequisiteGroups(
    scenario.completion.prerequisiteGroups,
    state,
  )
    .map(({ id }) => id)
    .sort();
  if (!matchedTriggerIds.length) return null;
  const selected = [...scenario.completion.endings]
    .sort(
      (a, b) =>
        b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .map((definition) => ({
      definition,
      groups: findSatisfiedPrerequisiteGroups(
        definition.prerequisiteGroups,
        state,
      ),
    }))
    .find(({ groups }) => groups.length > 0);
  return {
    kind: "ending",
    turn: state.turn,
    endingId: selected?.definition.id ?? scenario.completion.fallbackEnding.id,
    matchedTriggerIds,
    matchedPrerequisiteGroupIds:
      selected?.groups.map(({ id }) => id).sort() ?? [],
    usedFallback: !selected,
  };
}

/** Append one terminal institutional record; terminal and pending states are unchanged. */
export function resolveEnding(
  scenario: ScenarioDefinition,
  state: SimulationState,
): SimulationState {
  const outcome = evaluateEnding(scenario, state);
  if (!outcome) return state;
  const definition =
    scenario.completion.endings.find(({ id }) => id === outcome.endingId) ??
    scenario.completion.fallbackEnding;
  return {
    ...state,
    outcome,
    history: [
      ...state.history,
      {
        id: `${definition.id}:ending:${state.turn}`,
        turn: state.turn,
        kind: "ending",
        title: definition.title,
        detail: definition.narrative,
      },
    ],
  };
}

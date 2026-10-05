import type {
  EventDefinition,
  ScenarioDefinition,
} from "../domain/definitions";
import type { SimulationState } from "../domain/runtime";
import { applyConsequences } from "./consequences";
import { conditionsMet } from "./shared";

/** Select Events from one completed-turn snapshot before applying consequences. */
export function selectEvents(
  scenario: ScenarioDefinition,
  state: SimulationState,
  randomValue?: number,
): readonly EventDefinition[] {
  if (state.outcome || !scenario.events?.length) return [];
  if (
    randomValue !== undefined &&
    (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1)
  )
    throw new RangeError("Event random value must be in [0, 1).");

  return scenario.events
    .filter((definition) => {
      const progress = state.events[definition.id];
      if (
        !conditionsMet(scenario, definition.requires) ||
        (progress.lastTriggerTurn !== null &&
          state.turn - progress.lastTriggerTurn <= definition.cooldownTurns)
      )
        return false;
      if (
        definition.influences.some(({ source }) => source === "_random_") &&
        randomValue === undefined
      )
        throw new RangeError(
          "A random value is required to evaluate this Event.",
        );
      const score = definition.influences.reduce(
        (sum, influence) =>
          sum +
          (influence.intercept ?? 0) +
          influence.coefficient *
            (influence.source === "_random_"
              ? randomValue!
              : state.nodes[influence.source].value),
        0,
      );
      return score >= definition.threshold;
    })
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
}

/** Resolve selected Events without another incident or persistent evaluation. */
export function resolveEvents(
  scenario: ScenarioDefinition,
  state: SimulationState,
  selected: readonly EventDefinition[],
): SimulationState {
  let next = state;
  for (const definition of selected) {
    const progress = next.events[definition.id];
    const triggerCount = progress.triggerCount + 1;
    const occurrenceId = `${definition.id}:event:${triggerCount}`;
    next = applyConsequences(
      scenario,
      next,
      definition.consequences,
      occurrenceId,
    );
    next = {
      ...next,
      events: {
        ...next.events,
        [definition.id]: { lastTriggerTurn: state.turn, triggerCount },
      },
      history: [
        ...next.history,
        {
          id: occurrenceId,
          turn: state.turn,
          kind: "event",
          title: definition.title,
          detail: definition.description,
        },
      ],
    };
  }
  return next;
}

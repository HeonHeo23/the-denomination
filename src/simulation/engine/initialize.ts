import type { ScenarioDefinition } from "../domain/definitions";
import type {
  EffectRuntimeState,
  IncidentRuntimeState,
  SimulationState,
} from "../domain/runtime";
import { validateScenario } from "./validateScenario";

/**
 * Validates a Scenario and creates its authoritative turn-zero snapshot.
 *
 * Initial node values are preserved rather than recalculated. Each Effect's
 * inertia window is seeded with its source's initial value so the first turn
 * begins with a stable causal history.
 *
 * @throws {Error} When the Scenario contains invalid definitions or references.
 */
export function initializeScenario(
  scenario: ScenarioDefinition,
): SimulationState {
  const errors = validateScenario(scenario);
  if (errors.length > 0) {
    throw new Error(`Invalid scenario:\n${errors.join("\n")}`);
  }

  const nodes = Object.fromEntries(
    scenario.nodes.map((node) => [
      node.id,
      {
        value: node.initialValue,
        baseValue: node.baselineValue ?? node.initialValue,
        isActive: node.isActive,
        isForced: node.isForced ?? false,
      },
    ]),
  );
  const effects: Record<string, EffectRuntimeState> = {};

  // Seed the full window; initialization itself does not advance the Effect.
  for (const effect of scenario.effects) {
    const sourceValue =
      effect.source === "_default_" ? 1 : nodes[effect.source].value;
    effects[effect.id] = {
      sourceHistory: Array.from(
        { length: effect.inertiaTurns ?? 1 },
        () => sourceValue,
      ),
      lastContribution: 0,
    };
  }

  const incidents: Record<string, IncidentRuntimeState> = Object.fromEntries(
    [...scenario.events, ...scenario.dilemmas].map((incident) => [
      incident.id,
      { timesTriggered: 0 },
    ]),
  );
  return {
    scenarioId: scenario.id,
    turn: scenario.startingTurn,
    year: scenario.startingYear,
    nodes,
    effects,
    grudges: [],
    incidents,
    history: [],
  };
}

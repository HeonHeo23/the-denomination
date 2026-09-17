import type { ScenarioDefinition } from "../domain/definitions";
import type { EffectRuntimeState, SimulationState } from "../domain/runtime";
import { loadScenario } from "./loadScenario";
import { responseValue } from "./responseValue";

/**
 * Validates a Scenario and creates its authoritative turn-zero snapshot.
 *
 * Initial node values are preserved rather than recalculated. Each Effect's
 * inertia window is seeded with its source's initial value so the first turn
 * begins with a stable causal history.
 *
 * @throws {Error} When the Scenario contains invalid definitions or references.
 */
export function initializeScenario(input: ScenarioDefinition): SimulationState {
  const loaded = loadScenario(input);
  if (!loaded.ok)
    throw new Error(`Invalid scenario:\n${loaded.diagnostics.join("\n")}`);
  const scenario = loaded.scenario;

  const nodes = Object.fromEntries(
    scenario.nodes.map((node) => [
      node.id,
      {
        value: node.initial.value,
        baseValue: node.baseline ?? node.initial.value,
        isActive: node.initial.isActive,
        isForced: node.initial.isForced,
      },
    ]),
  );
  const effects: Record<string, EffectRuntimeState> = {};

  // Seed the full window; initialization itself does not advance the Effect.
  for (const effect of scenario.effects) {
    const sourceValue =
      effect.source === "_default_"
        ? 1
        : nodes[effect.source].isActive
          ? nodes[effect.source].value
          : 0;
    effects[effect.id] = {
      sourceHistory: Array.from(
        { length: effect.inertiaTurns ?? 1 },
        () => sourceValue,
      ),
      lastContribution: 0,
    };
  }

  const state: SimulationState = {
    scenarioId: scenario.id,
    turn: scenario.start.turn,
    year: scenario.start.year,
    nodes,
    effects,
    grudges: [],
    history: [],
    gameOverProgress: Object.fromEntries(
      (scenario.gameOvers ?? []).map((definition) => [
        definition.id,
        {
          episode: 0,
          consecutiveTurns: 0,
          matchedPrerequisiteGroupIds: [],
        },
      ]),
    ),
    outcome: null,
  };
  for (const effect of scenario.effects) {
    const participates =
      effect.source === "_default_" || nodes[effect.source].isActive;
    effects[effect.id] = {
      ...effects[effect.id],
      lastContribution: participates
        ? responseValue(
            effect.response,
            effects[effect.id].sourceHistory[0],
            state,
          )
        : 0,
    };
  }
  return state;
}

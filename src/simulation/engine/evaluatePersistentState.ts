import type {
  EffectDefinition,
  ResponseDefinition,
  ScenarioDefinition,
} from "../domain/definitions";
import type { CalculationTrace } from "../domain/results";
import type {
  EffectRuntimeState,
  HistoryEntry,
  SimulationState,
} from "../domain/runtime";
import { clampValue } from "./shared";

interface EvaluationResult {
  readonly state: SimulationState;
  readonly trace: readonly CalculationTrace[];
}

/** Evaluates one declarative response function for an effective source value. */
function responseValue(
  response: ResponseDefinition,
  sourceValue: number,
  state: SimulationState,
): number {
  switch (response.kind) {
    case "constant":
      return response.value;
    case "linear":
      return (response.intercept ?? 0) + response.coefficient * sourceValue;
    case "power":
      return (
        (response.intercept ?? 0) +
        response.coefficient * sourceValue ** response.exponent
      );
    case "product":
      return (
        (response.intercept ?? 0) +
        response.coefficient *
          sourceValue *
          response.factors.reduce(
            (product, nodeId) => product * state.nodes[nodeId].value,
            1,
          )
      );
  }
}

/**
 * Evaluates one Effect for the current turn:
 *
 * 1. Reads the source value, using 1 for _default_ and 0 for inactive
 * 2. Appends that value to the Effect's history and keeps inertia window
 * 3. Averages the retained values (reduce) / length
 * 4. Applies the response function, or contributes 0 when inactive.
 * 5. Returns the updated history and calculation.
 */
function evaluateEffect(
  effect: EffectDefinition,
  state: SimulationState,
): { runtime: EffectRuntimeState; effectiveSource: number } {
  const sourceParticipates =
    effect.source === "_default_" || state.nodes[effect.source].isActive;
  const sourceValue =
    effect.source === "_default_"
      ? 1
      : sourceParticipates
        ? state.nodes[effect.source].value
        : 0;
  const inertiaTurns = effect.inertiaTurns ?? 1;
  const previous = state.effects[effect.id]?.sourceHistory ?? [];
  // Inertia is a moving average owned by this Effect, not by either node.
  const history = [...previous, sourceValue].slice(-inertiaTurns);
  const effectiveSource =
    history.reduce((total, value) => total + value, 0) / history.length;
  const contribution = sourceParticipates
    ? responseValue(effect.response, effectiveSource, state)
    : 0;

  return {
    runtime: { sourceHistory: history, lastContribution: contribution },
    effectiveSource,
  };
}

/**
 * Calculates the next persistent node values from one shared prior snapshot.
 *
 * Using the same input state for every Effect keeps results independent of
 * node and Effect declaration order. Stances remain player-controlled, while
 * inactive Situations still receive pressure so their thresholds can fire.
 */
export function evaluatePersistentState(
  scenario: ScenarioDefinition,
  state: SimulationState,
): EvaluationResult {
  const effects = { ...state.effects };
  // Maps each target node ID string to its summed Effect contributions number
  const effectTotalByTarget: Record<string, number> = {};

  // Sample every Effect and total contributions for eligible targets
  for (const effect of scenario.effects) {
    const effectResult = evaluateEffect(effect, state);
    effects[effect.id] = effectResult.runtime;

    effectTotalByTarget[effect.target] =
      (effectTotalByTarget[effect.target] ?? 0) +
      effectResult.runtime.lastContribution;
  }

  // Defer writes until all Effect totals have been sampled from prior state.
  const nodes = { ...state.nodes };
  const trace: CalculationTrace[] = [];
  const history: HistoryEntry[] = [...state.history];

  for (const definition of scenario.nodes) {
    const runtime = state.nodes[definition.id];
    if (definition.type === "stance") continue;

    const effectTotal = effectTotalByTarget[definition.id] ?? 0;
    const grudgeTotal = state.grudges
      .filter((grudge) => grudge.target === definition.id)
      .reduce((total, grudge) => total + grudge.magnitude, 0);
    const value = clampValue(
      runtime.baseValue + effectTotal + grudgeTotal,
      definition,
    );
    let activation = runtime.isActive;

    if (definition.type === "situation") {
      if (!activation && value >= definition.startThreshold) {
        activation = true;
        history.push({
          id: `${definition.id}:start:${state.turn}`,
          turn: state.turn,
          kind: "situation",
          title: `${definition.name} began`,
          detail: `Pressure reached ${Math.round(value * 100)}%.`,
        });
      } else if (activation && value <= definition.stopThreshold) {
        activation = false;
        history.push({
          id: `${definition.id}:stop:${state.turn}`,
          turn: state.turn,
          kind: "situation",
          title: `${definition.name} ended`,
          detail: `Pressure fell to ${Math.round(value * 100)}%.`,
        });
      }
    }

    nodes[definition.id] = { ...runtime, value, isActive: activation };
    trace.push({
      targetId: definition.id,
      baseline: runtime.baseValue,
      effectTotal,
      grudgeTotal,
      result: value,
    });
  }

  return { state: { ...state, nodes, effects, history }, trace };
}

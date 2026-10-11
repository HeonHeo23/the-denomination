import type {
  EffectDefinition,
  ScenarioDefinition,
} from "../domain/definitions";
import type { CalculationTrace, StanceEffectPreview } from "../domain/results";
import type {
  EffectRuntimeState,
  HistoryEntry,
  SimulationState,
} from "../domain/runtime";
import { responseValue } from "./responseValue";
import { clampValue } from "./shared";
import { createStancePreviewState, executeCommand } from "./playerActions";

interface EvaluationResult {
  readonly state: SimulationState;
  readonly trace: readonly CalculationTrace[];
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
  // Inertia is a moving average owned by this Effect.
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
 * Normalizes turn-start Resource balances, then calculates persistent values
 * from one shared snapshot.
 *
 * Using the same input state for every Effect keeps results independent of
 * node and Effect declaration order. Stances remain player-controlled, while
 * inactive Situations still receive pressure so their thresholds can fire.
 */
export function evaluatePersistentState(
  scenario: ScenarioDefinition,
  state: SimulationState,
): EvaluationResult {
  // Normalize clamped Resource balances at the turn boundary before any
  // Effect reads them as sources.
  const nodes = { ...state.nodes };
  for (const definition of scenario.nodes) {
    if (definition.type !== "resource" || !definition.domain.clamp) continue;
    const runtime = nodes[definition.id];
    if (runtime.value === undefined)
      throw new Error("Resource requires node runtime state.");
    nodes[definition.id] = {
      ...runtime,
      value: clampValue(runtime.value, definition),
    };
  }
  const evaluationState = { ...state, nodes };
  const effects = { ...state.effects };
  // Maps each target node ID string to its summed Effect contributions number
  const effectTotalByTarget: Record<string, number> = Object.create(null);

  // Sample every Effect and total contributions for eligible targets
  for (const effect of scenario.effects) {
    const effectResult = evaluateEffect(effect, evaluationState);
    effects[effect.id] = effectResult.runtime;

    const targetKey = effect.target;
    effectTotalByTarget[targetKey] =
      (effectTotalByTarget[targetKey] ?? 0) +
      effectResult.runtime.lastContribution;
  }

  // Defer writes until all Effect totals have been sampled from prior state.
  const trace: CalculationTrace[] = [];
  const history: HistoryEntry[] = [...state.history];

  /**
   * 1. Resolve each non-stance node's value.
   * 2. Update Situation activation and history.
   * 3. Store the node state and calculation trace.
   */
  for (const definition of scenario.nodes) {
    // Read the current node state.
    const runtime = evaluationState.nodes[definition.id];

    // Preserve player-controlled Stances and stored state of inactive ordinary targets.
    if (
      definition.type === "stance" ||
      (!runtime.isActive && definition.type !== "situation")
    )
      continue;

    if (runtime.value === undefined)
      throw new Error("Expected node runtime state.");

    // Sum persistent modifiers.
    const effectTotal = effectTotalByTarget[definition.id] ?? 0;
    const grudgeTotal = state.grudges
      .filter((grudge) => grudge.target === definition.id)
      .reduce((total, grudge) => total + grudge.magnitude, 0);

    // Resource flow follows the start-of-turn clamp; other nodes clamp here.
    const netFlow = effectTotal + grudgeTotal;
    const value =
      definition.type === "resource"
        ? runtime.value + netFlow
        : clampValue(
            (runtime.baseValue ?? runtime.value) + netFlow,
            definition,
          );

    // Carry forward the current activation.
    let isActive = runtime.isActive;

    if (definition.type === "situation") {
      // Update Situation activation.
      if (!isActive && value >= definition.startThreshold) {
        isActive = true;
        history.push({
          id: `${definition.id}:start:${state.turn}`,
          turn: state.turn,
          kind: "situation",
          title: `${definition.name} began`,
          detail: `Pressure reached ${value}.`,
        });
      } else if (
        isActive &&
        !runtime.isForced &&
        value <= definition.stopThreshold
      ) {
        isActive = false;
        history.push({
          id: `${definition.id}:stop:${state.turn}`,
          turn: state.turn,
          kind: "situation",
          title: `${definition.name} ended`,
          detail: `Pressure fell to ${value}.`,
        });
      }
    }

    // Store the resolved node state.
    nodes[definition.id] = {
      ...runtime,
      value,
      isActive,
      ...(definition.type === "resource" ? { netFlow } : {}),
    };

    // Record the calculation breakdown.
    trace.push({
      targetId: definition.id,
      ...(definition.type === "resource"
        ? { netFlow }
        : { baseline: runtime.baseValue }),
      effectTotal,
      grudgeTotal,
      result: value,
    });
  }

  // Apply shared numeric constraints after all values have been sampled and resolved.
  for (const constraint of scenario.constraints ?? []) {
    const members = scenario.nodes.filter(
      (node) => "constraintId" in node && node.constraintId === constraint.id,
    );
    const total = members.reduce((sum, node) => sum + nodes[node.id].value, 0);
    if (total <= constraint.maxTotal) continue;
    const scale = constraint.maxTotal / total;
    for (const member of members) {
      const previous = nodes[member.id].value;
      const value = previous * scale;
      nodes[member.id] = { ...nodes[member.id], value };
      const calculation = trace.find((entry) => entry.targetId === member.id);
      if (calculation) {
        const index = trace.indexOf(calculation);
        trace[index] = {
          ...calculation,
          constraintAdjustment: value - previous,
          result: value,
        };
      }
    }
  }
  return { state: { ...evaluationState, nodes, effects, history }, trace };
}

/**
 * Projects a Stance's outgoing Effects after its candidate value fills each
 * Effect's complete Inertia window. The preview never changes the live state.
 */
export function previewStanceEffects(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
  value: number,
): readonly StanceEffectPreview[] {
  const stanceDef = scenario.nodes.find((node) => node.id === stanceId);
  const stanceState = state.nodes[stanceId];

  // Validation
  if (
    stanceDef?.type !== "stance" ||
    !stanceState ||
    !Number.isFinite(value) ||
    value < stanceDef.domain.min ||
    value > stanceDef.domain.max ||
    (stanceDef.control.kind === "discrete" &&
      !stanceDef.control.states.some((option) => option.value === value))
  ) {
    return [];
  }

  let previewState = state;
  let kind: StanceEffectPreview["kind"] = "settled";
  if (!stanceState.isActive || value !== stanceState.value) {
    const command = executeCommand(scenario, state, {
      type: stanceState.isActive ? "set-stance" : "enact-stance",
      stanceId,
      value,
    });
    if (command.isAccepted) {
      previewState = command.state;
    } else {
      previewState = createStancePreviewState(
        scenario,
        state,
        stanceDef,
        value,
      );
      kind = "estimate";
    }
  }

  // A full window of the same source value averages to that value, so evaluate
  // only this Stance's outgoing Effects without simulating a temporary turn.
  const previewRuntime = previewState.nodes[stanceId];

  return scenario.effects
    .filter((effect) => effect.source === stanceId)
    .map((effect) => ({
      effectId: effect.id,
      contribution: previewRuntime.isActive
        ? responseValue(effect.response, previewRuntime.value, previewState)
        : 0,
      kind,
    }));
}

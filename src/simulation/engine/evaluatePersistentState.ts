import type {
  EffectDefinition,
  ScenarioDefinition,
  StanceDefinition,
} from "../domain/definitions";
import type { CalculationTrace, StanceEffectPreview } from "../domain/results";
import type {
  EffectRuntimeState,
  HistoryEntry,
  SimulationState,
} from "../domain/runtime";
import { responseValue } from "./responseValue";
import { conditionsMet, clampValue, indexNodes } from "./shared";
import { executeCommand } from "./playerActions";

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
  const effectTotalByTarget: Record<string, number> = Object.create(null);

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

  /**
   * 1. Resolve each non-stance node's value.
   * 2. Update Situation activation and history.
   * 3. Store the node state and calculation trace.
   */
  for (const definition of scenario.nodes) {
    // Read the current node state.
    const runtime = state.nodes[definition.id];

    // Preserve player-controlled Stances and stored state of inactive ordinary targets.
    if (
      definition.type === "stance" ||
      (!runtime.isActive && definition.type !== "situation")
    )
      continue;

    // Sum persistent modifiers.
    const effectTotal = effectTotalByTarget[definition.id] ?? 0;
    const grudgeTotal = state.grudges
      .filter((grudge) => grudge.target === definition.id)
      .reduce((total, grudge) => total + grudge.magnitude, 0);

    // Clamp the next value to node bounds.
    const value = clampValue(
      runtime.baseValue + effectTotal + grudgeTotal,
      definition,
    );

    // Carry forward the current activation.
    let activation = runtime.isActive;

    if (definition.type === "situation") {
      // Update Situation activation.
      if (
        !activation &&
        value >= definition.startThreshold &&
        conditionsMet(scenario, definition.requires)
      ) {
        activation = true;
        history.push({
          id: `${definition.id}:start:${state.turn}`,
          turn: state.turn,
          kind: "situation",
          title: `${definition.name} began`,
          detail: `Pressure reached ${value}.`,
        });
      } else if (
        activation &&
        !runtime.isForced &&
        value <= definition.stopThreshold
      ) {
        activation = false;
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
    nodes[definition.id] = { ...runtime, value, isActive: activation };

    // Record the calculation breakdown.
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
  const stance = scenario.nodes.find((node) => node.id === stanceId);
  const currentRuntime = state.nodes[stanceId];

  // Validation
  if (
    state.scenarioId !== scenario.id ||
    stance?.type !== "stance" ||
    !currentRuntime ||
    !Number.isFinite(value) ||
    value < stance.domain.min ||
    value > stance.domain.max ||
    (stance.control.kind === "discrete" &&
      !stance.control.states.some((option) => option.value === value))
  ) {
    return [];
  }

  let candidateState = state;
  let kind: StanceEffectPreview["kind"] = "settled";
  if (!currentRuntime.isActive || value !== currentRuntime.value) {
    const command = executeCommand(scenario, state, {
      type: currentRuntime.isActive ? "set-stance" : "enact-stance",
      stanceId,
      value,
    });
    if (command.accepted) {
      candidateState = command.state;
    } else {
      candidateState = hypotheticalStanceCandidate(
        scenario,
        state,
        stance,
        value,
      );
      kind = "estimate";
    }
  }

  // A full window of the same source value averages to that value, so evaluate
  // only this Stance's outgoing Effects without simulating a temporary turn.
  const candidateRuntime = candidateState.nodes[stanceId];

  return scenario.effects
    .filter((effect) => effect.source === stanceId)
    .map((effect) => ({
      effectId: effect.id,
      contribution: candidateRuntime.isActive
        ? responseValue(effect.response, candidateRuntime.value, candidateState)
        : 0,
      kind,
    }));
}

/**
 * Creates the value-only candidate used to estimate a blocked Stance action.
 * It mirrors command writes without checking legality or retaining any history.
 */
function hypotheticalStanceCandidate(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stance: StanceDefinition,
  value: number,
): SimulationState {
  const isEnactment = !state.nodes[stance.id].isActive;
  const cost = isEnactment
    ? (stance.enactmentCost?.amount ?? 0)
    : stance.cost
      ? stance.cost.base +
        stance.cost.perPoint * Math.abs(value - state.nodes[stance.id].value)
      : 0;
  const resourceId = isEnactment
    ? stance.enactmentCost?.resourceId
    : stance.cost?.resourceId;
  const nodes = { ...state.nodes };
  const definitions = indexNodes(scenario);
  const resource = resourceId ? definitions[resourceId] : undefined;

  if (resource?.type === "resource" && cost !== 0) {
    const runtime = nodes[resource.id];
    nodes[resource.id] = {
      ...runtime,
      baseValue: clampValue(runtime.baseValue - cost, resource),
      value: clampValue(runtime.value - cost, resource),
    };
  }

  nodes[stance.id] = {
    ...nodes[stance.id],
    value,
    baseValue: value,
    isActive: true,
  };

  return { ...state, nodes };
}

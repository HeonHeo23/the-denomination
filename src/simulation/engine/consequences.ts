import type {
  ConsequenceDefinition,
  ScenarioDefinition,
} from "../domain/definitions";
import type { SimulationState } from "../domain/runtime";
import { clampValue, indexNodes } from "./shared";

/** Apply reusable authored consequences as one immutable occurrence. */
export function applyConsequences(
  scenario: ScenarioDefinition,
  state: SimulationState,
  consequences: readonly ConsequenceDefinition[],
  occurrenceId: string,
): SimulationState {
  if (consequences.length === 0) return state;
  const definitions = indexNodes(scenario);
  const nodes = { ...state.nodes };
  const grudges = [...state.grudges];

  consequences.forEach((consequence, index) => {
    const definition = definitions[consequence.target];
    const runtime = nodes[consequence.target];
    if (!definition || !runtime) return;

    if (consequence.kind === "resource") {
      nodes[consequence.target] = {
        ...runtime,
        value: clampValue(runtime.value + consequence.amount, definition),
        baseValue: clampValue(
          runtime.baseValue + consequence.amount,
          definition,
        ),
      };
      return;
    }

    if (consequence.kind === "activation") {
      if (!consequence.active && runtime.isForced) return;
      nodes[consequence.target] = {
        ...runtime,
        isActive: consequence.active,
      };
      return;
    }

    grudges.push({
      id: `${occurrenceId}:grudge:${index}`,
      label: consequence.label,
      target: consequence.target,
      magnitude: consequence.magnitude,
      decay: consequence.decay,
      createdTurn: state.turn,
    });
  });

  return { ...state, nodes, grudges };
}

import type {
  ConsequenceDefinition,
  ScenarioDefinition,
} from "../domain/definitions";
import type { SimulationState } from "../domain/runtime";
import { indexNodes } from "./shared";

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
  const history = [...state.history];

  consequences.forEach((consequence, index) => {
    const definition = definitions[consequence.target];
    const runtime = nodes[consequence.target];
    if (!definition || !runtime) return;

    const historyId = `${occurrenceId}:consequence:${index}`;

    if (consequence.kind === "resource") {
      const value = runtime.value + consequence.amount;
      nodes[consequence.target] = {
        ...runtime,
        value,
      };
      history.push({
        id: historyId,
        turn: state.turn,
        kind: "consequence",
        title: `${definition.name} changed`,
        detail: `Resource balance changed by ${consequence.amount}.`,
      });
      return;
    }

    if (consequence.kind === "activation") {
      if (!consequence.active && runtime.isForced) return;
      nodes[consequence.target] = {
        ...runtime,
        isActive: consequence.active,
      };
      history.push({
        id: historyId,
        turn: state.turn,
        kind: "consequence",
        title: `${definition.name} activation set`,
        detail: `${definition.name} is now ${consequence.active ? "active" : "inactive"}.`,
      });
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
    history.push({
      id: historyId,
      turn: state.turn,
      kind: "consequence",
      title: `Grudge created: ${consequence.label}`,
      detail: `A temporary contribution of ${consequence.magnitude} was applied to ${definition.name} (decay ${consequence.decay}).`,
    });
  });

  return { ...state, nodes, grudges, history };
}

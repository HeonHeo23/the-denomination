import type { ScenarioDefinition } from "../domain/definitions";
import type { SimulationCommand } from "../domain/commands";
import type { CommandResult, StanceChangeAssessment } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { clampValue, conditionsMet, indexNodes } from "./shared";

/** The single source of command legality and cost for previews and execution. */
export function assessStanceChange(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
  value: number,
): StanceChangeAssessment {
  const reject = (message: string, cost = 0): StanceChangeAssessment => ({
    legal: false,
    cost,
    message,
  });
  if (state.scenarioId !== scenario.id)
    return reject("The runtime state belongs to another Scenario.");
  const stance = indexNodes(scenario)[stanceId];
  if (!stance || stance.type !== "stance")
    return reject("That node is not a Stance.");
  const runtime = state.nodes[stanceId];
  if (!Number.isFinite(value)) return reject("Choose a valid value.");
  if (value < stance.domain.min || value > stance.domain.max)
    return reject(`${stance.name} is outside its permitted range.`);
  if (
    stance.control.kind === "discrete" &&
    !stance.control.states.some((option) => option.value === value)
  )
    return reject(`${stance.name} does not permit that state.`);
  if (!conditionsMet(scenario, stance.requires))
    return reject(`The prerequisites for ${stance.name} are not met.`);
  const amountChanged = Math.abs(value - runtime.value);
  if (amountChanged === 0) return reject("That Stance is already selected.");
  const cost = stance.cost
    ? stance.cost.base + stance.cost.perPoint * amountChanged
    : 0;
  if (!Number.isFinite(cost))
    return reject("The configured Stance cost is not finite.");
  // Ignore only floating-point roundoff at an exact authored limit.
  const tolerance =
    Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(runtime.value)) * 4;
  if (
    stance.cost?.maxChange !== undefined &&
    amountChanged - stance.cost.maxChange > tolerance
  )
    return reject(
      `${stance.name} can change by at most ${stance.cost.maxChange} per action.`,
      cost,
    );
  let resourceName = "";
  if (stance.cost) {
    const resource = indexNodes(scenario)[stance.cost.resourceId];
    if (!resource || resource.type !== "resource")
      return reject("The configured Stance cost is invalid.", cost);
    resourceName = resource.name;
    if (state.nodes[resource.id].value < cost)
      return reject(
        `Not enough ${resource.name}. This change costs ${cost.toFixed(1)}.`,
        cost,
      );
  }
  return {
    legal: true,
    cost,
    message: `${stance.name} changed to ${value}${cost ? ` for ${cost.toFixed(1)} ${resourceName}` : ""}.`,
  };
}

/** Reassess against the current snapshot before applying an immutable transaction. */
export function executeCommand(
  scenario: ScenarioDefinition,
  state: SimulationState,
  command: SimulationCommand,
): CommandResult {
  const assessment = assessStanceChange(
    scenario,
    state,
    command.stanceId,
    command.value,
  );
  if (!assessment.legal)
    return { accepted: false, state, message: assessment.message };
  const stance = indexNodes(scenario)[command.stanceId];
  if (stance.type !== "stance")
    return { accepted: false, state, message: "That node is not a Stance." };
  const nodes = { ...state.nodes };
  if (stance.cost) {
    const resource = nodes[stance.cost.resourceId];
    const definition = indexNodes(scenario)[stance.cost.resourceId];
    // Preserve the existing provisional Resource/baseline interaction.
    nodes[stance.cost.resourceId] = {
      ...resource,
      baseValue: clampValue(resource.baseValue - assessment.cost, definition),
      value: clampValue(resource.value - assessment.cost, definition),
    };
  }
  nodes[stance.id] = {
    ...nodes[stance.id],
    value: command.value,
    baseValue: command.value,
    isActive: true,
  };
  return {
    accepted: true,
    message: assessment.message,
    state: {
      ...state,
      nodes,
      history: [
        ...state.history,
        {
          id: `${stance.id}:change:${state.turn}:${state.history.length}`,
          turn: state.turn,
          kind: "stance",
          title: `${stance.name} changed`,
          detail: `The Stance is now ${command.value}.`,
        },
      ],
    },
  };
}

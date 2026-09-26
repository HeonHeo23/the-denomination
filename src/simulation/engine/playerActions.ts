import type {
  ScenarioDefinition,
  StanceDefinition,
} from "../domain/definitions";
import type { SimulationCommand } from "../domain/commands";
import type {
  CommandResult,
  StanceChangeAssessment,
  StanceTransitionAssessment,
} from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { clampValue, conditionsMet, indexNodes } from "./shared";

type Assessment = StanceChangeAssessment | StanceTransitionAssessment;
const GAME_OVER_STANCE_MESSAGE = "The game is over. Stances are read-only.";

function reject(message: string, cost = 0): Assessment {
  return { legal: false, cost, message };
}

function stanceFor(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
): StanceDefinition | Assessment {
  if (state.scenarioId !== scenario.id)
    return reject("The runtime state belongs to another Scenario.");
  const stance = indexNodes(scenario)[stanceId];
  if (!stance || stance.type !== "stance")
    return reject("That node is not a Stance.");
  return stance;
}

function validValue(
  stance: StanceDefinition,
  value: number,
): Assessment | undefined {
  if (!Number.isFinite(value)) return reject("Choose a valid value.");
  if (value < stance.domain.min || value > stance.domain.max)
    return reject(`${stance.name} is outside its permitted range.`);
  if (
    stance.control.kind === "discrete" &&
    !stance.control.states.some((option) => option.value === value)
  )
    return reject(`${stance.name} does not permit that state.`);
  return undefined;
}

function assessTransitionCost(
  scenario: ScenarioDefinition,
  state: SimulationState,
  cost: number,
  resourceId: string | undefined,
  action: "enact" | "repeal",
): Assessment | { readonly resourceName: string } {
  if (!Number.isFinite(cost))
    return reject("The configured Stance cost is not finite.");
  if (!resourceId) return { resourceName: "" };
  const resource = indexNodes(scenario)[resourceId];
  if (!resource || resource.type !== "resource")
    return reject(`The configured ${action} cost is invalid.`, cost);
  if (state.nodes[resource.id].value < cost)
    return reject(
      `Not enough ${resource.name}. This ${action} costs ${cost.toFixed(1)}.`,
      cost,
    );
  return { resourceName: resource.name };
}

/** The single source of active Stance-change legality and cost. */
export function assessStanceChange(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
  value: number,
): StanceChangeAssessment {
  const gameOver = state.outcome !== null;
  const stance = stanceFor(scenario, state, stanceId);
  if ("legal" in stance)
    return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : stance;
  const invalid = validValue(stance, value);
  if (invalid) return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : invalid;
  const runtime = state.nodes[stanceId];
  const amountChanged = Math.abs(value - runtime.value);
  const cost =
    amountChanged === 0
      ? 0
      : stance.cost
        ? stance.cost.base + stance.cost.perPoint * amountChanged
        : 0;
  if (gameOver) return reject(GAME_OVER_STANCE_MESSAGE, cost);
  if (!runtime.isActive)
    return reject(`Enact ${stance.name} before changing it.`);
  if (!conditionsMet(scenario, stance.requires))
    return reject(`The prerequisites for ${stance.name} are not met.`);
  if (amountChanged === 0) return reject("That Stance is already selected.");
  if (!Number.isFinite(cost))
    return reject("The configured Stance cost is not finite.");
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

/** Assess whether an inactive Stance can be enacted at a selected value. */
export function assessStanceEnactment(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
  value: number,
): StanceTransitionAssessment {
  const gameOver = state.outcome !== null;
  const stance = stanceFor(scenario, state, stanceId);
  if ("legal" in stance)
    return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : stance;
  const invalid = validValue(stance, value);
  if (invalid) return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : invalid;
  const cost = stance.enactmentCost?.amount ?? 0;
  if (gameOver) return reject(GAME_OVER_STANCE_MESSAGE, cost);
  if (state.nodes[stanceId].isActive)
    return reject(`${stance.name} is already enacted.`);
  if (!conditionsMet(scenario, stance.requires))
    return reject(`The prerequisites for ${stance.name} are not met.`);
  const affordability = assessTransitionCost(
    scenario,
    state,
    cost,
    stance.enactmentCost?.resourceId,
    "enact",
  );
  if ("legal" in affordability) return affordability;
  return {
    legal: true,
    cost,
    message: `${stance.name} enacted at ${value}${cost ? ` for ${cost.toFixed(1)} ${affordability.resourceName}` : ""}.`,
  };
}

/** Assess whether an active ordinary Stance can be repealed. */
export function assessStanceRepeal(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
): StanceTransitionAssessment {
  const gameOver = state.outcome !== null;
  const stance = stanceFor(scenario, state, stanceId);
  if ("legal" in stance)
    return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : stance;
  const cost = stance.repealCost?.amount ?? 0;
  if (gameOver) return reject(GAME_OVER_STANCE_MESSAGE, cost);
  const runtime = state.nodes[stanceId];
  if (!runtime.isActive) return reject(`${stance.name} is not enacted.`);
  if (runtime.isForced)
    return reject(`${stance.name} is forced active and cannot be repealed.`);
  const affordability = assessTransitionCost(
    scenario,
    state,
    cost,
    stance.repealCost?.resourceId,
    "repeal",
  );
  if ("legal" in affordability) return affordability;
  return {
    legal: true,
    cost,
    message: `${stance.name} repealed${cost ? ` for ${cost.toFixed(1)} ${affordability.resourceName}` : ""}.`,
  };
}

function debitCost(
  scenario: ScenarioDefinition,
  nodes: Record<string, SimulationState["nodes"][string]>,
  resourceId: string | undefined,
  cost: number,
) {
  if (!resourceId || cost === 0) return;
  const resource = nodes[resourceId];
  const definition = indexNodes(scenario)[resourceId];
  nodes[resourceId] = {
    ...resource,
    baseValue: clampValue(resource.baseValue - cost, definition),
    value: clampValue(resource.value - cost, definition),
  };
}

/** Reassess against the current snapshot before applying an immutable transaction. */
export function executeCommand(
  scenario: ScenarioDefinition,
  state: SimulationState,
  command: SimulationCommand,
): CommandResult {
  const assessment =
    command.type === "set-stance"
      ? assessStanceChange(scenario, state, command.stanceId, command.value)
      : command.type === "enact-stance"
        ? assessStanceEnactment(
            scenario,
            state,
            command.stanceId,
            command.value,
          )
        : assessStanceRepeal(scenario, state, command.stanceId);
  if (!assessment.legal)
    return { accepted: false, state, message: assessment.message };
  const stance = indexNodes(scenario)[command.stanceId];
  if (!stance || stance.type !== "stance")
    return { accepted: false, state, message: "That node is not a Stance." };
  const nodes = { ...state.nodes };
  if (command.type === "set-stance") {
    debitCost(scenario, nodes, stance.cost?.resourceId, assessment.cost);
  } else {
    const transitionCost =
      command.type === "enact-stance"
        ? stance.enactmentCost
        : stance.repealCost;
    debitCost(scenario, nodes, transitionCost?.resourceId, assessment.cost);
  }
  if (command.type === "repeal-stance") {
    nodes[stance.id] = { ...nodes[stance.id], isActive: false };
  } else {
    nodes[stance.id] = {
      ...nodes[stance.id],
      value: command.value,
      baseValue: command.value,
      isActive: true,
    };
  }
  const action =
    command.type === "set-stance"
      ? "change"
      : command.type === "enact-stance"
        ? "enact"
        : "repeal";
  return {
    accepted: true,
    message: assessment.message,
    state: {
      ...state,
      nodes,
      history: [
        ...state.history,
        {
          id: `${stance.id}:${action}:${state.turn}:${state.history.length}`,
          turn: state.turn,
          kind: "stance",
          title:
            command.type === "set-stance"
              ? `${stance.name} changed`
              : command.type === "enact-stance"
                ? `${stance.name} enacted`
                : `${stance.name} repealed`,
          detail:
            command.type === "repeal-stance"
              ? "The Stance is no longer active."
              : command.type === "enact-stance"
                ? `The Stance was enacted at ${command.value}.`
                : `The Stance is now ${command.value}.`,
        },
      ],
    },
  };
}

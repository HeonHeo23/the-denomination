import type {
  ScenarioDefinition,
  StanceDefinition,
} from "../domain/definitions";
import type { SimulationCommand } from "../domain/commands";
import type { CommandResult, StanceAssessment } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { createNodeHistoryState, indexNodes } from "./shared";
import { resolveDilemma } from "./dilemmas";

const GAME_OVER_STANCE_MESSAGE = "The game is over. Stances are read-only.";

type StanceLookupResult =
  | { readonly ok: true; readonly stance: StanceDefinition }
  | { readonly ok: false; readonly assessment: StanceAssessment };

function reject(message: string, cost = 0): StanceAssessment {
  return { legal: false, cost, message };
}

function lookupStance(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stanceId: string,
): StanceLookupResult {
  if (state.scenarioId !== scenario.id)
    return {
      ok: false,
      assessment: reject("The runtime state belongs to another Scenario."),
    };
  const stance = indexNodes(scenario)[stanceId];
  if (!stance || stance.type !== "stance")
    return { ok: false, assessment: reject("That node is not a Stance.") };
  return { ok: true, stance };
}

function validStanceValue(
  stance: StanceDefinition,
  value: number,
): string | undefined {
  if (!Number.isFinite(value)) return "Choose a valid value.";
  if (value < stance.domain.min || value > stance.domain.max)
    return `${stance.name} is outside its permitted range.`;
  if (
    stance.control.kind === "discrete" &&
    !stance.control.states.some((option) => option.value === value)
  )
    return `${stance.name} does not permit that state.`;
  return undefined;
}

function assessTransitionCost(
  scenario: ScenarioDefinition,
  state: SimulationState,
  cost: number,
  resourceId: string | undefined,
  action: "enact" | "repeal",
): StanceAssessment | { readonly resourceName: string } {
  if (!Number.isFinite(cost))
    return reject("The configured Stance cost is not finite.");
  if (!resourceId) return { resourceName: "" };
  const resource = indexNodes(scenario)[resourceId];
  if (!resource || resource.type !== "resource")
    return reject(`The configured ${action} cost is invalid.`, cost);
  if (cost > 0 && state.nodes[resource.id].value < cost)
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
): StanceAssessment {
  const gameOver = state.outcome !== null;
  const stanceResult = lookupStance(scenario, state, stanceId);
  if (!stanceResult.ok)
    return gameOver
      ? reject(GAME_OVER_STANCE_MESSAGE)
      : stanceResult.assessment;
  const stance = stanceResult.stance;
  const invalid = validStanceValue(stance, value);
  if (invalid !== undefined)
    return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : reject(invalid);
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
    if (cost > 0 && state.nodes[resource.id].value < cost)
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
): StanceAssessment {
  const gameOver = state.outcome !== null;
  const stanceResult = lookupStance(scenario, state, stanceId);
  if (!stanceResult.ok)
    return gameOver
      ? reject(GAME_OVER_STANCE_MESSAGE)
      : stanceResult.assessment;
  const stance = stanceResult.stance;
  const invalid = validStanceValue(stance, value);
  if (invalid !== undefined)
    return gameOver ? reject(GAME_OVER_STANCE_MESSAGE) : reject(invalid);
  const cost = stance.enactmentCost?.amount ?? 0;
  if (gameOver) return reject(GAME_OVER_STANCE_MESSAGE, cost);
  if (state.nodes[stanceId].isActive)
    return reject(`${stance.name} is already enacted.`);
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
): StanceAssessment {
  const gameOver = state.outcome !== null;
  const stanceResult = lookupStance(scenario, state, stanceId);
  if (!stanceResult.ok)
    return gameOver
      ? reject(GAME_OVER_STANCE_MESSAGE)
      : stanceResult.assessment;
  const stance = stanceResult.stance;
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
  nodes: Record<string, SimulationState["nodes"][string]>,
  resourceId: string | undefined,
  cost: number,
) {
  if (!resourceId || cost === 0) return;
  const resource = nodes[resourceId];
  if (resource.value === undefined)
    throw new Error("Resource requires node runtime state.");
  nodes[resourceId] = {
    ...resource,
    value: resource.value - cost,
  };
}

function applyStanceValue(
  nodes: Record<string, SimulationState["nodes"][string]>,
  stance: StanceDefinition,
  value: number,
  resourceId: string | undefined,
  cost: number,
) {
  debitCost(nodes, resourceId, cost);
  const runtime = nodes[stance.id];
  if (runtime.value === undefined)
    throw new Error("Stance requires node runtime state.");
  nodes[stance.id] = {
    ...runtime,
    value,
    baseValue: value,
    isActive: true,
  };
}

/** Build temporary Stance values for an estimate, even when its command is blocked. */
export function createStancePreviewState(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stance: StanceDefinition,
  value: number,
): SimulationState {
  const isEnactment = !state.nodes[stance.id].isActive;
  const assessment = isEnactment
    ? assessStanceEnactment(scenario, state, stance.id, value)
    : assessStanceChange(scenario, state, stance.id, value);
  const resourceId = isEnactment
    ? stance.enactmentCost?.resourceId
    : stance.cost?.resourceId;
  const nodes = { ...state.nodes };
  applyStanceValue(nodes, stance, value, resourceId, assessment.cost);
  return { ...state, nodes };
}

/** Reassess against the current snapshot before applying an immutable transaction. */
export function executeCommand(
  scenario: ScenarioDefinition,
  state: SimulationState,
  command: SimulationCommand,
): CommandResult {
  if (command.type === "resolve-dilemma")
    return resolveDilemma(scenario, state, command.dilemmaId, command.choiceId);
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
    return { isAccepted: false, state, message: assessment.message };
  const stance = indexNodes(scenario)[command.stanceId];
  if (!stance || stance.type !== "stance")
    return { isAccepted: false, state, message: "That node is not a Stance." };
  const nodes = { ...state.nodes };
  if (command.type === "set-stance") {
    applyStanceValue(
      nodes,
      stance,
      command.value,
      stance.cost?.resourceId,
      assessment.cost,
    );
  } else if (command.type === "enact-stance") {
    applyStanceValue(
      nodes,
      stance,
      command.value,
      stance.enactmentCost?.resourceId,
      assessment.cost,
    );
  } else {
    debitCost(nodes, stance.repealCost?.resourceId, assessment.cost);
    nodes[stance.id] = { ...nodes[stance.id], isActive: false };
  }
  const action =
    command.type === "set-stance"
      ? "change"
      : command.type === "enact-stance"
        ? "enact"
        : "repeal";
  return {
    isAccepted: true,
    message: assessment.message,
    state: {
      ...state,
      nodes,
      nodeValueHistory: {
        ...state.nodeValueHistory,
        [state.turn]: Object.fromEntries(
          scenario.nodes.map((node) => [
            node.id,
            createNodeHistoryState(nodes[node.id]),
          ]),
        ),
      },
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

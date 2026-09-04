import type {
  ScenarioDefinition,
  StanceDefinition,
} from "../domain/definitions";
import type { SimulationCommand } from "../domain/commands";
import type { CommandResult } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { applyConsequences } from "./incidents";
import { clampValue, indexNodes } from "./shared";

/** Creates a rejected command result that preserves the original snapshot. */
function reject(state: SimulationState, message: string): CommandResult {
  return { accepted: false, state, message };
}

/** Validates and applies a player-requested Stance value and its cost. */
function changeStance(
  scenario: ScenarioDefinition,
  state: SimulationState,
  stance: StanceDefinition,
  value: number,
): CommandResult {
  const runtime = state.nodes[stance.id];
  if (!Number.isFinite(value)) return reject(state, "Choose a valid value.");
  if (value < stance.domain.min || value > stance.domain.max) {
    return reject(state, `${stance.name} is outside its permitted range.`);
  }
  if (
    stance.control.kind === "discrete" &&
    !stance.control.states.some((option) => option.value === value)
  ) {
    return reject(state, `${stance.name} does not permit that state.`);
  }
  if (
    !(stance.prerequisites ?? []).every((required) =>
      scenario.prerequisites.includes(required),
    )
  ) {
    return reject(state, `The prerequisites for ${stance.name} are not met.`);
  }

  const amountChanged = Math.abs(value - runtime.value);
  if (amountChanged === 0)
    return reject(state, "That Stance is already selected.");
  if (
    stance.cost?.maxChange !== undefined &&
    amountChanged > stance.cost.maxChange
  ) {
    return reject(
      state,
      `${stance.name} can change by at most ${stance.cost.maxChange} per action.`,
    );
  }

  const nodes = { ...state.nodes };
  let cost = 0;
  if (stance.cost) {
    cost = stance.cost.base + stance.cost.perPoint * amountChanged;
    const resource = nodes[stance.cost.resourceId];
    if (resource.value < cost) {
      return reject(
        state,
        `Not enough Authority. This change costs ${cost.toFixed(1)}.`,
      );
    }
    const resourceDefinition = scenario.nodes.find(
      (node) => node.id === stance.cost?.resourceId,
    );
    if (!resourceDefinition || resourceDefinition.type !== "resource") {
      return reject(state, "The configured Stance cost is invalid.");
    }
    nodes[stance.cost.resourceId] = {
      ...resource,
      baseValue: clampValue(resource.baseValue - cost, resourceDefinition),
      value: clampValue(resource.value - cost, resourceDefinition),
    };
  }

  nodes[stance.id] = {
    ...runtime,
    value,
    baseValue: value,
    isActive: runtime.isActive ? true : runtime.isActive,
  };

  return {
    accepted: true,
    message: `${stance.name} changed to ${Math.round(value * 100)}%${cost ? ` for ${cost.toFixed(1)} Authority` : ""}.`,
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
          detail: `The Stance is now ${Math.round(value * 100)}%.`,
        },
      ],
    },
  };
}

/** Applies a selected Dilemma choice and clears the pending Dilemma. */
function resolveDilemma(
  scenario: ScenarioDefinition,
  state: SimulationState,
  dilemmaId: string,
  choiceId: string,
): CommandResult {
  if (state.pendingDilemma?.dilemmaId !== dilemmaId) {
    return reject(state, "That Dilemma is not currently pending.");
  }
  const dilemma = scenario.dilemmas.find(({ id }) => id === dilemmaId);
  const choice = dilemma?.choices.find(({ id }) => id === choiceId);
  if (!dilemma || !choice)
    return reject(state, "That Dilemma choice is invalid.");

  const resolved = applyConsequences(
    scenario,
    state,
    `${dilemmaId}:${choiceId}`,
    choice.consequences,
  );
  return {
    accepted: true,
    message: choice.label,
    state: {
      ...resolved,
      pendingDilemma: undefined,
      history: [
        ...resolved.history,
        {
          id: `${dilemmaId}:${choiceId}:${state.turn}`,
          turn: state.turn,
          kind: "dilemma",
          title: dilemma.title,
          detail: choice.label,
        },
      ],
    },
  };
}

/**
 * Validates and applies one semantic player command to a runtime snapshot.
 * Rejected commands return the original state unchanged.
 */
export function executeCommand(
  scenario: ScenarioDefinition,
  state: SimulationState,
  command: SimulationCommand,
): CommandResult {
  if (state.scenarioId !== scenario.id) {
    return reject(state, "The runtime state belongs to another Scenario.");
  }

  switch (command.type) {
    case "set-stance": {
      const definition = indexNodes(scenario)[command.stanceId];
      if (!definition || definition.type !== "stance") {
        return reject(state, "That node is not a Stance.");
      }
      return changeStance(scenario, state, definition, command.value);
    }
    case "resolve-dilemma":
      return resolveDilemma(
        scenario,
        state,
        command.dilemmaId,
        command.choiceId,
      );
  }
}

import type {
  DilemmaDefinition,
  ScenarioDefinition,
} from "../domain/definitions";
import type { CommandResult } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { applyConsequences } from "./consequences";
import { createNodeHistoryState } from "./shared";

/** Capture every qualifying Dilemma from one shared completed-turn snapshot. */
export function queueDilemmas(
  scenario: ScenarioDefinition,
  state: SimulationState,
  randomValue?: number,
): SimulationState {
  if (state.outcome || !scenario.dilemmas?.length) return state;
  if (
    randomValue !== undefined &&
    (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1)
  )
    throw new RangeError("Dilemma random value must be in [0, 1).");
  const eligible: DilemmaDefinition[] = [];
  for (const definition of scenario.dilemmas) {
    const progress = state.dilemmas[definition.id];
    if (
      progress.lastTriggerTurn !== null &&
        state.turn - progress.lastTriggerTurn <= definition.cooldownTurns)
    )
      continue;
    if (
      definition.influences.some(({ source }) => source === "_random_") &&
      randomValue === undefined
    )
      throw new RangeError(
        "A random value is required to evaluate this Dilemma.",
      );
    const score = definition.influences.reduce(
      (sum, influence) =>
        sum +
        (influence.intercept ?? 0) +
        influence.coefficient *
          (influence.source === "_random_"
            ? randomValue!
            : state.nodes[influence.source].value),
      0,
    );
    if (score < definition.threshold) continue;
    eligible.push(definition);
  }
  if (!eligible.length) return state;
  const candidates = eligible.sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  if (candidates.length > 1 && randomValue === undefined)
    throw new RangeError("A random value is required to select a Dilemma.");
  const selected =
    candidates.length === 1
      ? candidates[0]
      : candidates[Math.floor(randomValue! * candidates.length)];
  const progress = state.dilemmas[selected.id];
  return {
    ...state,
    dilemmas: {
      ...state.dilemmas,
      [selected.id]: {
        ...progress,
        lastTriggerTurn: state.turn,
        triggerCount: progress.triggerCount + 1,
      },
    },
    pendingDilemmaIds: [selected.id],
  };
}

/** Apply one queued player's choice without rerunning turn calculations. */
export function resolveDilemma(
  scenario: ScenarioDefinition,
  state: SimulationState,
  dilemmaId: string,
  choiceId: string,
): CommandResult {
  if (state.scenarioId !== scenario.id)
    return {
      isAccepted: false,
      state,
      message: "The runtime state belongs to another Scenario.",
    };
  if (state.outcome)
    return { isAccepted: false, state, message: "The game is over." };
  if (!state.pendingDilemmaIds.includes(dilemmaId))
    return {
      isAccepted: false,
      state,
      message: "That Dilemma is not pending.",
    };
  const definition = scenario.dilemmas?.find(({ id }) => id === dilemmaId);
  const choice = definition?.choices.find(({ id }) => id === choiceId);
  if (!definition || !choice)
    return {
      isAccepted: false,
      state,
      message: "That Dilemma choice is unavailable.",
    };
  const occurrenceId = `${dilemmaId}:choice:${state.dilemmas[dilemmaId].triggerCount}`;
  const applied = applyConsequences(
    scenario,
    state,
    choice.consequences,
    occurrenceId,
  );
  const nodes = applied.nodes;
  const nodeValueHistory = {
    ...applied.nodeValueHistory,
    [state.turn]: Object.fromEntries(
      scenario.nodes.map((node) => [
        node.id,
        createNodeHistoryState(nodes[node.id]),
      ]),
    ),
  };
  return {
    isAccepted: true,
    message: `${definition.title}: ${choice.label}.`,
    state: {
      ...applied,
      dilemmas: {
        ...applied.dilemmas,
        [dilemmaId]: {
          ...applied.dilemmas[dilemmaId],
          lastResolvedTurn: state.turn,
          lastResolvedChoiceId: choiceId,
        },
      },
      nodeValueHistory,
      pendingDilemmaIds: state.pendingDilemmaIds.filter(
        (id) => id !== dilemmaId,
      ),
      history: [
        ...applied.history,
        {
          id: occurrenceId,
          turn: state.turn,
          kind: "dilemma",
          title: definition.title,
          detail: `${choice.label}: ${choice.description}`,
        },
      ],
    },
  };
}

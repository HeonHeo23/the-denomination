import type { ScenarioDefinition } from "../domain/definitions";
import type { GameOverOutcomeCause, SimulationState } from "../domain/runtime";
import { applyConsequences } from "./consequences";
import { matchingPrerequisiteGroups } from "./prerequisites";

/** Advance every recoverable terminal trajectory from the same evaluated state. */
export function evaluateGameOvers(
  scenario: ScenarioDefinition,
  state: SimulationState,
): SimulationState {
  if (state.outcome || !scenario.gameOvers?.length) return state;

  const matches = new Map(
    scenario.gameOvers.map((definition) => [
      definition.id,
      matchingPrerequisiteGroups(definition.prerequisiteGroups, state).map(
        ({ id }) => id,
      ),
    ]),
  );
  const progress = { ...state.gameOverProgress };
  const terminalCauses: GameOverOutcomeCause[] = scenario.gameOvers.flatMap(
    (definition) => {
      const previous = progress[definition.id];
      const matchedPrerequisiteGroupIds = matches.get(definition.id) ?? [];
      return matchedPrerequisiteGroupIds.length > 0 &&
        (previous?.consecutiveTurns ?? 0) + 1 >= definition.terminalAfterTurns
        ? [{ gameOverId: definition.id, matchedPrerequisiteGroupIds }]
        : [];
    },
  );

  // A terminal result takes precedence over every nonterminal occurrence on
  // the same turn, preserving the exact snapshot that satisfied its causes.
  if (terminalCauses.length > 0) {
    for (const definition of scenario.gameOvers) {
      const previous = progress[definition.id] ?? {
        episode: 0,
        consecutiveTurns: 0,
        matchedPrerequisiteGroupIds: [],
      };
      const matchedPrerequisiteGroupIds = matches.get(definition.id) ?? [];
      progress[definition.id] =
        matchedPrerequisiteGroupIds.length === 0
          ? {
              ...previous,
              consecutiveTurns: 0,
              matchedPrerequisiteGroupIds: [],
            }
          : {
              episode:
                previous.consecutiveTurns === 0
                  ? previous.episode + 1
                  : previous.episode,
              consecutiveTurns: previous.consecutiveTurns + 1,
              matchedPrerequisiteGroupIds,
            };
    }
    const terminalIds = new Set(
      terminalCauses.map(({ gameOverId }) => gameOverId),
    );
    return {
      ...state,
      gameOverProgress: progress,
      outcome: {
        kind: "game-over",
        turn: state.turn,
        causes: terminalCauses,
      },
      history: [
        ...state.history,
        ...scenario.gameOvers
          .filter(({ id }) => terminalIds.has(id))
          .map((definition) => ({
            id: `${definition.id}:game-over:${progress[definition.id].episode}:${state.turn}`,
            turn: state.turn,
            kind: "game-over" as const,
            title: definition.report.title,
            detail: definition.report.narrative,
          })),
      ],
    };
  }

  let next = state;

  for (const definition of scenario.gameOvers) {
    const previous = progress[definition.id] ?? {
      episode: 0,
      consecutiveTurns: 0,
      matchedPrerequisiteGroupIds: [],
    };
    const matchedPrerequisiteGroupIds = matches.get(definition.id) ?? [];

    if (matchedPrerequisiteGroupIds.length === 0) {
      if (previous.consecutiveTurns > 0) {
        const recovery = definition.recovery;
        if (recovery) {
          next = applyConsequences(
            scenario,
            next,
            recovery.consequences ?? [],
            `${definition.id}:recovery:${previous.episode}:${state.turn}`,
          );
          next = {
            ...next,
            history: [
              ...next.history,
              {
                id: `${definition.id}:recovery:${previous.episode}:${state.turn}`,
                turn: state.turn,
                kind: "crisis",
                title: recovery.title,
                detail: recovery.description,
              },
            ],
          };
        }
      }
      progress[definition.id] = {
        ...previous,
        consecutiveTurns: 0,
        matchedPrerequisiteGroupIds: [],
      };
      continue;
    }

    const episode =
      previous.consecutiveTurns === 0 ? previous.episode + 1 : previous.episode;
    const consecutiveTurns = previous.consecutiveTurns + 1;
    progress[definition.id] = {
      episode,
      consecutiveTurns,
      matchedPrerequisiteGroupIds,
    };

    const stage = definition.stages.find(
      ({ atTurn }) => atTurn === consecutiveTurns,
    );
    if (!stage) continue;
    const occurrenceId = `${definition.id}:${stage.id}:${episode}:${state.turn}`;
    next = applyConsequences(
      scenario,
      next,
      stage.consequences ?? [],
      occurrenceId,
    );
    next = {
      ...next,
      history: [
        ...next.history,
        {
          id: occurrenceId,
          turn: state.turn,
          kind: "crisis",
          title: stage.title,
          detail: stage.description,
        },
      ],
    };
  }

  return {
    ...next,
    gameOverProgress: progress,
    outcome: null,
  };
}

import type { ScenarioDefinition } from "../domain/definitions";
import type { TurnResult } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { evaluatePersistentState } from "./evaluatePersistentState";
import { resolveEnding } from "./resolveEnding";
import { evaluateGameOvers } from "./evaluateGameOvers";
import { queueDilemmas } from "./dilemmas";
import { resolveEvents, selectEvents } from "./events";
import { createNodeHistoryState } from "./shared";

const GRUDGE_CLEANUP_THRESHOLD = 0.001;

/**
 * Advances a runtime snapshot by one turn.
 *
 * Persistent evaluation applies the turn-start Resource clamp before Effects
 * sample sources. Grudges contribute at current magnitude before decaying.
 */
export function advanceTurn(
  scenario: ScenarioDefinition,
  state: SimulationState,
  randomValue?: number,
): TurnResult {
  if (state.outcome)
    return {
      state,
      message: "The game is over. No further turns can be advanced.",
      trace: [],
    };
  if (state.pendingDilemmaIds.length)
    return {
      state,
      message: "Resolve pending Dilemmas before advancing.",
      trace: [],
    };
  const turn = state.turn + 1;
  const year = state.year === undefined ? undefined : state.year + 1;
  const atNextTurn = { ...state, turn, year };
  const evaluated = evaluatePersistentState(scenario, atNextTurn);
  // Grudges contribute during evaluation and decay only afterward.
  const decayed = {
    ...evaluated.state,
    grudges: evaluated.state.grudges
      .map((grudge) => ({
        ...grudge,
        magnitude: grudge.magnitude * grudge.decay,
      }))
      .filter(
        (grudge) => Math.abs(grudge.magnitude) >= GRUDGE_CLEANUP_THRESHOLD,
      ),
  };
  const selectedEvents = selectEvents(scenario, decayed, randomValue);
  const afterEvents = resolveEvents(scenario, decayed, selectedEvents);
  const resolved = evaluateGameOvers(scenario, afterEvents);
  const completed = resolveEnding(scenario, {
    ...resolved,
    nodeValueHistory: {
      ...resolved.nodeValueHistory,
      [turn]: Object.fromEntries(
        scenario.nodes.map((node) => [
          node.id,
          createNodeHistoryState(resolved.nodes[node.id]),
        ]),
      ),
    },
  });
  const nextState = queueDilemmas(scenario, completed, randomValue);
  return {
    state: nextState,
    message:
      nextState.outcome?.kind === "game-over"
        ? "Game over. The institution can no longer continue under your leadership."
        : nextState.outcome?.kind === "ending"
          ? "Scenario complete. Review the institution’s final report."
          : `Advanced to turn ${turn}.`,
    trace: evaluated.trace,
  };
}

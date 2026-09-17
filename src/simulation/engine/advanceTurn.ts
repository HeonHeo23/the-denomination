import type { ScenarioDefinition } from "../domain/definitions";
import type { TurnResult } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { evaluatePersistentState } from "./evaluatePersistentState";
import { evaluateGameOvers } from "./evaluateGameOvers";

const GRUDGE_CLEANUP_THRESHOLD = 0.001;

/**
 * Advances a runtime snapshot by one turn.
 *
 * Persistent values are evaluated before Grudges decay, so each Grudge
 * contributes its current magnitude for the turn.
 */
export function advanceTurn(
  scenario: ScenarioDefinition,
  state: SimulationState,
): TurnResult {
  if (state.outcome)
    return {
      state,
      message: "The game is over. No further turns can be advanced.",
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
  const resolved = evaluateGameOvers(scenario, decayed);
  return {
    state: resolved,
    message: resolved.outcome
      ? "Game over. The institution can no longer continue under your leadership."
      : `Advanced to turn ${turn}.`,
    trace: evaluated.trace,
  };
}

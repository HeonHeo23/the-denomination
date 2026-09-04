import type { ScenarioDefinition } from "../domain/definitions";
import type { TurnResult } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { evaluatePersistentState } from "./evaluatePersistentState";
import {
  defaultRandomSource,
  evaluateIncidents,
  type RandomSource,
} from "./incidents";

const GRUDGE_CLEANUP_THRESHOLD = 0.001;

/**
 * Advances a runtime snapshot by one turn.
 *
 * Persistent values are evaluated before Grudges decay, so each Grudge
 * contributes its current magnitude for the turn. Incident evaluation then
 * observes the resulting persistent state.
 */
export function advanceTurn(
  scenario: ScenarioDefinition,
  state: SimulationState,
  random: RandomSource = defaultRandomSource,
): TurnResult {
  if (state.pendingDilemma) {
    return {
      advanced: false,
      state,
      message: "Resolve the pending Dilemma before advancing.",
      trace: [],
    };
  }

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
  const afterIncidents = evaluateIncidents(scenario, decayed, random);

  return {
    advanced: true,
    state: afterIncidents,
    message: `Advanced to turn ${turn}.`,
    trace: evaluated.trace,
  };
}

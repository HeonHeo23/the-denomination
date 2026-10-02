import type { ScenarioDefinition } from "../domain/definitions";
import type { TurnResult } from "../domain/results";
import type { SimulationState } from "../domain/runtime";
import { evaluatePersistentState } from "./evaluatePersistentState";
import { resolveEnding } from "./resolveEnding";
import { evaluateGameOvers } from "./evaluateGameOvers";
import { queueDilemmas } from "./dilemmas";
import { resolveEvents, selectEvents } from "./events";

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
  const resolved = evaluateGameOvers(scenario, decayed);
  const selectedEvents = selectEvents(scenario, resolved, randomValue);
  const queued = queueDilemmas(scenario, resolved, randomValue);
  const afterEvents = resolveEvents(scenario, queued, selectedEvents);
  const completed = resolveEnding(scenario, {
    ...afterEvents,
    nodeValueHistory: [
      ...afterEvents.nodeValueHistory,
      {
        turn,
        values: Object.fromEntries(
          scenario.nodes.map((node) => [
            node.id,
            {
              value: afterEvents.nodes[node.id].value,
              isActive: afterEvents.nodes[node.id].isActive,
            },
          ]),
        ),
      },
    ],
  });
  return {
    state: completed,
    message: resolved.outcome
      ? "Game over. The institution can no longer continue under your leadership."
      : completed.outcome?.kind === "ending"
        ? "Scenario complete. Review the institution’s final report."
        : `Advanced to turn ${turn}.`,
    trace: evaluated.trace,
  };
}

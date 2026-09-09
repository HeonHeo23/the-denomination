import { useReducer } from "react";
import type { SimulationState } from "../simulation";
import { createGameSession, reduceGameSession } from "./gameSession";

/** Content is loaded once for this session; reset uses its owned definition. */
export function useGameSession(
  content: unknown,
  restoredState?: SimulationState,
) {
  const [session, dispatch] = useReducer(
    reduceGameSession,
    { content, restoredState },
    ({ content: initialContent, restoredState: initialState }) =>
      createGameSession(initialContent, initialState),
  );
  return {
    ...session,
    setStance: (stanceId: string, value: number) =>
      dispatch({ type: "set-stance", stanceId, value }),
    nextTurn: () => dispatch({ type: "advance" }),
    reset: () => dispatch({ type: "reset" }),
  };
}

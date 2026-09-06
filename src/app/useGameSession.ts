import { useReducer } from "react";
import { createGameSession, reduceGameSession } from "./gameSession";

/** Content is loaded once for this session; reset uses its owned definition. */
export function useGameSession(content: unknown) {
  const [session, dispatch] = useReducer(
    reduceGameSession,
    content,
    createGameSession,
  );
  return {
    ...session,
    setStance: (stanceId: string, value: number) =>
      dispatch({ type: "set-stance", stanceId, value }),
    nextTurn: () => dispatch({ type: "advance" }),
    reset: () => dispatch({ type: "reset" }),
  };
}

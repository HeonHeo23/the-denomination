import { useCallback, useState } from "react";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type CalculationTrace,
  type ScenarioDefinition,
  type SimulationState,
} from "../simulation";

function turnRandom(turn: number) {
  let seed = (turn + 1) * 0x6d2b79f5;
  return {
    next: () => {
      seed += 0x6d2b79f5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * Owns the active runtime snapshot and coordinates UI intent with the engine.
 *
 * The hook stores presentation feedback and calculation traces alongside the
 * canonical simulation state, but delegates all game transitions to simulation
 * commands and turn advancement.
 */
export function useGameSession(scenario: ScenarioDefinition) {
  const [state, setState] = useState<SimulationState>(() =>
    initializeScenario(scenario),
  );
  const [message, setMessage] = useState("The Fellowship is ready.");
  const [trace, setTrace] = useState<readonly CalculationTrace[]>([]);

  const setStance = useCallback(
    (stanceId: string, value: number) => {
      // Functional updates ensure commands always receive the latest snapshot.
      setState((current) => {
        const result = executeCommand(scenario, current, {
          type: "set-stance",
          stanceId,
          value,
        });
        setMessage(result.message);
        return result.state;
      });
    },
    [scenario],
  );

  const resolveDilemma = useCallback(
    (dilemmaId: string, choiceId: string) => {
      setState((current) => {
        const result = executeCommand(scenario, current, {
          type: "resolve-dilemma",
          dilemmaId,
          choiceId,
        });
        setMessage(result.message);
        return result.state;
      });
    },
    [scenario],
  );

  const nextTurn = useCallback(() => {
    setState((current) => {
      const result = advanceTurn(scenario, current, turnRandom(current.turn));
      setMessage(result.message);
      setTrace(result.trace);
      return result.state;
    });
  }, [scenario]);

  const reset = useCallback(() => {
    setState(initializeScenario(scenario));
    setMessage("The Scenario was reset.");
    setTrace([]);
  }, [scenario]);

  return {
    state,
    message,
    trace,
    setStance,
    resolveDilemma,
    nextTurn,
    reset,
  };
}

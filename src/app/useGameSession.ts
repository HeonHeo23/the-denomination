import { useCallback, useState } from "react";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type CalculationTrace,
  type ScenarioDefinition,
  type SimulationState,
} from "../simulation";

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

  const nextTurn = useCallback(() => {
    setState((current) => {
      const result = advanceTurn(scenario, current);
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
    nextTurn,
    reset,
  };
}

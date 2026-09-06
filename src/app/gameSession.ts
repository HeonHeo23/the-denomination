import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  loadScenario,
  type CalculationTrace,
  type ScenarioDefinition,
  type SimulationState,
} from "../simulation";

export type GameSession =
  | { readonly ok: false; readonly diagnostics: readonly string[] }
  | {
      readonly ok: true;
      readonly scenario: ScenarioDefinition;
      readonly state: SimulationState;
      readonly message: string;
      readonly trace: readonly CalculationTrace[];
    };
export type SessionAction =
  | {
      readonly type: "set-stance";
      readonly stanceId: string;
      readonly value: number;
    }
  | { readonly type: "advance" }
  | { readonly type: "reset" };

export function createGameSession(content: unknown): GameSession {
  const loaded = loadScenario(content);
  if (!loaded.ok) return loaded;
  return {
    ok: true,
    scenario: loaded.scenario,
    state: initializeScenario(loaded.scenario),
    message: `${loaded.scenario.title} is ready.`,
    trace: [],
  };
}

/** A session always transitions its definition, snapshot and feedback together. */
export function reduceGameSession(
  session: GameSession,
  action: SessionAction,
): GameSession {
  if (!session.ok) return session;
  if (action.type === "reset")
    return {
      ...session,
      state: initializeScenario(session.scenario),
      message: "The Scenario was reset.",
      trace: [],
    };
  if (action.type === "advance") {
    const result = advanceTurn(session.scenario, session.state);
    return { ...session, ...result };
  }
  const result = executeCommand(session.scenario, session.state, action);
  return { ...session, state: result.state, message: result.message };
}

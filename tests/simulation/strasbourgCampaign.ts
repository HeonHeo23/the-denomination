import assert from "node:assert/strict";
import { strasbourgScenario } from "../../src/scenarios/strasbourg";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type ScenarioDefinition,
  type SimulationState,
} from "../../src/simulation";

export type Policy = Readonly<Record<string, number>>;
export const strasbourg: ScenarioDefinition = strasbourgScenario;

export const strasbourgStrategies = {
  refuge: {
    "common-assessments": 1,
    "endowment-allocation": 1,
    "religious-forbearance": 0.8,
    "poor-relief": 0.85,
    "refugee-reception": 0.75,
    "grain-purchasing": 0.25,
  },
  concord: {
    "common-assessments": 1,
    "endowment-allocation": 1,
    "pastoral-training": 0.85,
    "evangelical-diplomacy": 0.85,
    "grain-purchasing": 0,
  },
  civic: {
    "common-assessments": 0.9,
    "endowment-allocation": 0.9,
    "council-oversight": 0.85,
    "worship-reform": 0.8,
    "devotional-images": 0.3,
  },
  plural: {
    "common-assessments": 0.8,
    "endowment-allocation": 0.6,
    "religious-forbearance": 0.65,
    "parish-appointments": 0.65,
    schooling: 0.3,
    "hospital-provision": 0.35,
  },
} satisfies Record<string, Policy>;

/** One legal adjustment per requested Stance per visit; no runtime edits. */
export function adjustPolicy(
  scenario: ScenarioDefinition,
  original: SimulationState,
  policy: Policy,
  strict = true,
) {
  let state = original;
  let actions = 0;
  for (const [stanceId, target] of Object.entries(policy)) {
    const current = state.nodes[stanceId].value;
    if (Math.abs(current - target) < 1e-8) continue;
    const result = executeCommand(scenario, state, {
      type: "set-stance",
      stanceId,
      value: Math.max(current - 0.25, Math.min(current + 0.25, target)),
    });
    if (strict) assert(result.accepted, `${stanceId}: ${result.message}`);
    if (result.accepted) {
      state = result.state;
      actions++;
    }
  }
  return { state, actions };
}

export function decide(
  scenario: ScenarioDefinition,
  original: SimulationState,
  choiceIndex: number,
) {
  let state = original;
  for (const dilemmaId of state.pendingDilemmaIds) {
    const dilemma = scenario.dilemmas!.find(({ id }) => id === dilemmaId)!;
    const result = executeCommand(scenario, state, {
      type: "resolve-dilemma",
      dilemmaId,
      choiceId: dilemma.choices[choiceIndex].id,
    });
    assert(result.accepted, result.message);
    state = result.state;
  }
  return state;
}

export function campaign(
  policy: Policy,
  seed: number,
  choiceIndex: number,
  options: {
    scenario?: ScenarioDefinition;
    maxTurns?: number;
    strict?: boolean;
    policyTurns?: number;
    onTurn?: (state: SimulationState) => void;
  } = {},
) {
  const scenario = options.scenario ?? strasbourg;
  let state = initializeScenario(scenario);
  let actions = 0;
  let quietTurns = 0;
  const snapshots = [state];
  for (
    let turn = 0;
    turn < (options.maxTurns ?? 56) && !state.outcome;
    turn++
  ) {
    const changed =
      turn < (options.policyTurns ?? 4)
        ? adjustPolicy(scenario, state, policy, options.strict ?? true)
        : { state, actions: 0 };
    state = changed.state;
    actions += changed.actions;
    if (!changed.actions) quietTurns++;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    state = advanceTurn(scenario, state, seed / 2 ** 32).state;
    options.onTurn?.(state);
    state = decide(scenario, state, choiceIndex);
    snapshots.push(state);
  }
  return { state, snapshots, actions, quietTurns };
}

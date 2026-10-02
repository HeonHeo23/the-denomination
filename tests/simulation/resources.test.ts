import { ongoingCompletion } from "./fixtures";
import { exampleScenario } from "../../src/scenarios/example";
import { applyConsequences } from "../../src/simulation/engine/consequences";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type ScenarioDefinition,
} from "../../src/simulation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function resourceScenario(
  flow: number,
  { id = "resource-test", min = 0, cost = 4, initial = 5, clamp = true } = {},
): ScenarioDefinition {
  return {
    schemaVersion: 3,
    historicalActors: [],
    completion: ongoingCompletion,
    id,
    title: "Resource test",
    description: "Exercises Resource balance and flow.",
    start: { turn: 0 },
    nodes: [
      {
        id: "reserve",
        type: "resource",
        name: "Reserve",
        description: "Spendable reserve.",
        domain: { min, max: 10, clamp },
        initial: { value: initial, isActive: true, isForced: true },
      },
      {
        id: "policy",
        type: "stance",
        name: "Policy",
        description: "A costly policy.",
        domain: { min: 0, max: 1, clamp: true },
        initial: { value: 0, isActive: true, isForced: true },
        control: { kind: "continuous" },
        cost: { resourceId: "reserve", base: 0, perPoint: cost },
      },
    ],
    effects: [
      {
        id: "flow",
        source: "_default_",
        target: "reserve",
        response: { kind: "constant", value: flow },
      },
    ],
  };
}

function turns(
  scenario: ScenarioDefinition,
  count: number,
  state = initializeScenario(scenario),
) {
  for (let i = 0; i < count; i++) state = advanceTurn(scenario, state).state;
  return state;
}

function changeResource(
  scenario: ScenarioDefinition,
  state: ReturnType<typeof initializeScenario>,
  amount: number,
) {
  return applyConsequences(
    scenario,
    state,
    [{ kind: "resource", target: "reserve", amount }],
    `resource-${amount}`,
  );
}

export function runResourceTests() {
  const income = resourceScenario(3);
  let state = initializeScenario(income);
  assert(
    state.nodes.reserve.value === 5 && state.nodes.reserve.netFlow === 3,
    "Turn zero should preserve the balance and project seeded flow",
  );
  const spending = resourceScenario(3, { id: "spending", cost: 8 });
  state = turns(spending, 3);
  assert(
    state.nodes.reserve.value === 13,
    "The start-of-turn clamp should precede the new turn's flow",
  );
  const expensive = resourceScenario(3, { id: "expensive-policy", cost: 14 });
  const expensiveState = turns(expensive, 3);
  assert(
    !executeCommand(expensive, expensiveState, {
      type: "set-stance",
      stanceId: "policy",
      value: 1,
    }).accepted,
    "Affordability should use the current balance",
  );

  const spent = executeCommand(spending, state, {
    type: "set-stance",
    stanceId: "policy",
    value: 1,
  });
  assert(
    spent.accepted &&
      spent.state.nodes.reserve.value === 5 &&
      spent.state.nodes.reserve.netFlow === 3,
    "A Stance cost should debit the current balance and preserve flow",
  );
  const credited = changeResource(spending, spent.state, 6);
  state = advanceTurn(spending, credited).state;
  assert(
    state.nodes.reserve.value === 13 && state.nodes.reserve.netFlow === 3,
    "The next turn should discard overflow before applying new flow",
  );

  const expense = resourceScenario(-3);
  state = turns(expense, 3);
  assert(
    state.nodes.reserve.value === -3 && state.nodes.reserve.netFlow === -3,
    "Flow may move the balance below the floor during a turn",
  );
  state = changeResource(expense, state, 2);
  assert(
    state.nodes.reserve.value === -1,
    "A credit should change the current balance without clamping",
  );
  const grudgeState = {
    ...initializeScenario(income),
    grudges: [
      {
        id: "bonus",
        label: "Bonus",
        target: "reserve",
        magnitude: 2,
        decay: 0.5,
        createdTurn: 0,
      },
    ],
  };
  state = advanceTurn(income, grudgeState).state;
  const next = advanceTurn(income, state).state;
  assert(
    state.nodes.reserve.value === 10 &&
      state.nodes.reserve.netFlow === 5 &&
      next.nodes.reserve.value === 14 &&
      next.nodes.reserve.netFlow === 4,
    "Grudges should add flow after the start-of-turn clamp",
  );

  const free = resourceScenario(-3, { id: "free-debt", min: -10, cost: 0 });
  state = turns(free, 2);
  assert(
    state.nodes.reserve.value === -1,
    "A negative domain should display debt and preserve free actions",
  );
  assert(
    executeCommand(free, state, {
      type: "set-stance",
      stanceId: "policy",
      value: 1,
    }).accepted,
    "A free Stance action should remain available during debt",
  );

  const unbounded = resourceScenario(3, {
    id: "unbounded",
    initial: 14,
    clamp: false,
  });
  state = initializeScenario(unbounded);
  assert(
    state.nodes.reserve.value === 14,
    "Unclamped initial value should remain intact",
  );
  state = advanceTurn(unbounded, state).state;
  assert(
    state.nodes.reserve.value === 17,
    "Unclamped flow should retain overflow",
  );
  assert(
    exampleScenario.nodes.find((node) => node.id === "money")?.domain.clamp ===
      false,
    "Bundled Money should have no effective balance cap",
  );

  const insolvency = exampleScenario.gameOvers?.find(
    ({ id }) => id === "institutional-insolvency",
  );
  assert(insolvency, "The sample should define institutional insolvency");
  const scenario: ScenarioDefinition = {
    ...exampleScenario,
    completion: ongoingCompletion,
    id: "resource-insolvency-test",
    effects: [],
    events: [],
    dilemmas: [],
    gameOvers: [insolvency],
  };
  state = applyConsequences(
    scenario,
    initializeScenario(scenario),
    [{ kind: "resource", target: "money", amount: -75 }],
    "debt-shock",
  );
  state = turns(scenario, 3, state);
  assert(
    state.outcome?.kind === "game-over" &&
      state.outcome.causes.some(
        ({ gameOverId, matchedPrerequisiteGroupIds }) =>
          gameOverId === "institutional-insolvency" &&
          matchedPrerequisiteGroupIds.includes("severe-debt"),
      ),
    "Sustained Resource debt should trigger the authored insolvency outcome",
  );
}

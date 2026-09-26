import { runComplianceTests } from "./compliance.test";
import { exampleScenario } from "../../src/scenarios/example/index";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  validateScenario,
  type GrudgeRuntimeState,
  type ScenarioDefinition,
} from "../../src/simulation/index";
import { runNodeEffectProjectionTests } from "../ui/projectNodeEffects.test";
import { runTurnReportProjectionTests } from "../ui/projectTurnReport.test";
import { runInterfaceSoundTests } from "../ui/interfaceSound.test";
import { runNodeValueHistoryProjectionTests } from "../ui/projectNodeValueHistory.test";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function closeTo(actual: number, expected: number, message: string) {
  assert(
    Math.abs(actual - expected) < 0.000001,
    `${message}: ${actual} !== ${expected}`,
  );
}

assert(
  validateScenario(exampleScenario).length === 0,
  "Example Scenario must validate",
);
assert(
  exampleScenario.nodes.length === 48,
  "Expanded Scenario should contain the original and expanded ministry nodes",
);
assert(
  exampleScenario.nodes.find((node) => node.id === "institutional-authority")
    ?.type === "indicator",
  "Institutional Authority should be a simulated Indicator",
);
assert(
  exampleScenario.nodes.find((node) => node.id === "authority")?.baseline ===
    25,
  "Authority should have a lower underlying baseline",
);
assert(
  exampleScenario.nodes.find((node) => node.id === "ministry-capacity")
    ?.type === "indicator",
  "Ministry Capacity should be a simulated Indicator",
);
assert(
  exampleScenario.nodes.find((node) => node.id === "money")?.type ===
    "resource",
  "Money should be a spendable Resource",
);
assert(
  exampleScenario.nodes.find((node) => node.id === "revenue")?.type ===
    "indicator",
  "Revenue should be a simulated Indicator",
);
assert(
  exampleScenario.nodes.find((node) => node.id === "expenditure")?.type ===
    "indicator",
  "Expenditure should be a simulated Indicator",
);
assert(
  exampleScenario.effects.some(
    (effect) => effect.id === "revenue-to-money" && effect.target === "money",
  ),
  "Budget should receive calculated Revenue",
);
assert(
  exampleScenario.effects.some(
    (effect) =>
      effect.id === "expenditure-to-money" && effect.target === "money",
  ),
  "Budget should subtract calculated Expenditure",
);
assert(
  exampleScenario.effects.some(
    (effect) =>
      effect.id === "institutional-authority-to-authority-resource" &&
      effect.source === "institutional-authority" &&
      effect.target === "authority",
  ),
  "Institutional Authority should feed the Authority Resource",
);
assert(
  exampleScenario.effects.length >= 40,
  "Expanded Scenario should contain the original and ministry Effects",
);
assert(
  new Set(exampleScenario.nodes.map((node) => node.id)).size ===
    exampleScenario.nodes.length,
  "Scenario node identifiers must be unique",
);
assert(
  new Set(exampleScenario.effects.map((effect) => effect.id)).size ===
    exampleScenario.effects.length,
  "Scenario Effect identifiers must be unique",
);
const scenarioNodeIds = new Set(exampleScenario.nodes.map((node) => node.id));
for (const effect of exampleScenario.effects) {
  assert(
    effect.source === "_default_" || scenarioNodeIds.has(effect.source),
    `Effect source ${effect.source} must reference a node`,
  );
  assert(
    scenarioNodeIds.has(effect.target),
    `Effect target ${effect.target} must reference a node`,
  );
}

const initial = initializeScenario(exampleScenario);
assert(
  !initial.nodes["governance-tension"].isActive,
  "Governance Tension should start inactive",
);
assert(
  initial.nodes["governance-tension"].value > 0,
  "An inactive Situation must still evaluate incoming Effects",
);
assert(
  initial.effects["worship-to-participation"].lastContribution > 0,
  "New Worship Effect should contribute at initialization",
);
assert(
  initial.effects["outreach-to-reach"].lastContribution > 0,
  "New Mission Effect should contribute at initialization",
);
closeTo(
  initial.effects["tension-to-trust"].lastContribution,
  0,
  "An inactive source must not exert outgoing Effects",
);

const first = advanceTurn(exampleScenario, initial).state;
const second = advanceTurn(exampleScenario, first).state;
assert(
  first.nodes["membership-decline"].value > 0,
  "Membership Decline should evaluate incoming pressure while inactive",
);
assert(
  first.nodes["financial-strain"].value > 0,
  "Financial Strain should evaluate incoming pressure while inactive",
);
closeTo(
  first.nodes["governance-reach"].value,
  second.nodes["governance-reach"].value,
  "Persistent Effects must not accumulate every turn",
);

const reversedScenario: ScenarioDefinition = {
  ...exampleScenario,
  effects: [...exampleScenario.effects].reverse(),
};
let normalOrder = initializeScenario(exampleScenario);
let reverseOrder = initializeScenario(reversedScenario);
for (let index = 0; index < 3; index += 1) {
  normalOrder = advanceTurn(exampleScenario, normalOrder).state;
  reverseOrder = advanceTurn(reversedScenario, reverseOrder).state;
}
for (const node of exampleScenario.nodes) {
  closeTo(
    normalOrder.nodes[node.id].value,
    reverseOrder.nodes[node.id].value,
    `Effect declaration order changed ${node.id}`,
  );
}

const formationChange = executeCommand(exampleScenario, initial, {
  type: "set-stance",
  stanceId: "clergy-formation",
  value: 0.4,
});
assert(formationChange.accepted, "A permitted Stance change should succeed");
const afterFormationChange = advanceTurn(
  exampleScenario,
  formationChange.state,
).state;
assert(
  afterFormationChange.nodes["clergy-quality"].value <
    initial.nodes["clergy-quality"].value,
  "Inertia should begin moving the target toward the new contribution",
);
assert(
  afterFormationChange.nodes["clergy-quality"].value > 0.44,
  "Inertia should not apply the full change immediately",
);

let crisisState = initial;
for (const value of [0.75, 0.95, 1]) {
  const change = executeCommand(exampleScenario, crisisState, {
    type: "set-stance",
    stanceId: "centralization",
    value,
  });
  assert(change.accepted, `Centralization change to ${value} should succeed`);
  crisisState = change.state;
}
for (let index = 0; index < 5; index += 1) {
  crisisState = advanceTurn(exampleScenario, crisisState).state;
}
assert(
  crisisState.nodes["governance-tension"].isActive,
  "Situation should activate at its start threshold",
);
const pressuredState = {
  ...initial,
  effects: {
    ...initial.effects,
    "retention-to-membership-decline": {
      ...initial.effects["retention-to-membership-decline"],
      sourceHistory: [0, 0],
    },
    "stability-to-financial-strain": {
      ...initial.effects["stability-to-financial-strain"],
      sourceHistory: [0, 0],
    },
  },
  nodes: {
    ...initial.nodes,
    "member-retention": {
      ...initial.nodes["member-retention"],
      value: 0,
    },
    "financial-stability": {
      ...initial.nodes["financial-stability"],
      value: 0,
    },
  },
};
const pressuredTurn = advanceTurn(exampleScenario, pressuredState).state;
assert(
  pressuredTurn.nodes["membership-decline"].isActive,
  "Membership Decline should activate when retention pressure crosses its threshold",
);
assert(
  pressuredTurn.nodes["financial-strain"].isActive,
  "Financial Strain should activate when stability pressure crosses its threshold",
);

const grudge: GrudgeRuntimeState = {
  id: "test-grudge",
  label: "Temporary test effect",
  target: "leadership-trust",
  magnitude: -0.12,
  decay: 0.86,
  createdTurn: initial.turn,
};
const magnitude = grudge.magnitude;
const afterDecay = advanceTurn(exampleScenario, {
  ...initial,
  grudges: [grudge],
}).state;
assert(
  Math.abs(afterDecay.grudges[0].magnitude) < Math.abs(magnitude),
  "A Grudge should decay after contributing to a turn",
);

const terminalScenario: ScenarioDefinition = {
  schemaVersion: 3,
  id: "terminal-test",
  title: "Terminal test",
  description: "Exercises reusable prerequisites and consequences.",
  start: { turn: 0 },
  nodes: [
    {
      id: "risk",
      type: "stance",
      name: "Risk",
      description: "Controllable risk.",
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.1, isActive: true, isForced: true },
      control: { kind: "continuous" },
    },
    {
      id: "reserve",
      type: "resource",
      name: "Reserve",
      description: "Available reserve.",
      domain: { min: 0, max: 10, clamp: true },
      initial: { value: 10, isActive: true, isForced: true },
      baseline: 10,
    },
    {
      id: "confidence",
      type: "indicator",
      name: "Confidence",
      description: "Public confidence.",
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.5, isActive: true, isForced: true },
      baseline: 0.5,
    },
    {
      id: "council",
      type: "faction",
      name: "Council",
      description: "Governing council.",
      valueMeaning: "support",
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.5, isActive: true, isForced: false },
    },
  ],
  effects: [],
  gameOvers: [
    {
      id: "collapse",
      title: "Collapse",
      prerequisiteGroups: [
        {
          id: "low-risk",
          title: "Risk threshold",
          allOf: [
            {
              kind: "node-value",
              nodeId: "risk",
              comparison: "at-most",
              value: 0.2,
            },
          ],
        },
        {
          id: "council-gone",
          title: "Council inactive",
          allOf: [
            { kind: "node-activation", nodeId: "council", active: false },
          ],
        },
      ],
      terminalAfterTurns: 3,
      stages: [
        {
          id: "warning",
          atTurn: 1,
          title: "Warning",
          description: "The crisis begins.",
          consequences: [
            { kind: "resource", target: "reserve", amount: -3 },
            {
              kind: "grudge",
              target: "confidence",
              magnitude: -0.1,
              decay: 0.5,
              label: "Crisis shock",
            },
            { kind: "activation", target: "council", active: false },
          ],
        },
        {
          id: "final-warning",
          atTurn: 2,
          title: "Final warning",
          description: "The crisis deepens.",
        },
      ],
      recovery: {
        title: "Recovered",
        description: "The crisis clears.",
        consequences: [{ kind: "resource", target: "reserve", amount: 2 }],
      },
      report: { title: "Removed", narrative: "The institution removes you." },
    },
  ],
};

let terminalState = advanceTurn(
  terminalScenario,
  initializeScenario(terminalScenario),
).state;
assert(
  terminalState.gameOverProgress.collapse.consecutiveTurns === 1 &&
    terminalState.nodes.reserve.value === 7 &&
    terminalState.nodes.reserve.baseValue === 7 &&
    !terminalState.nodes.council.isActive &&
    terminalState.grudges.some(({ label }) => label === "Crisis shock"),
  "A warning stage should apply every reusable consequence exactly once",
);
const safeRisk = executeCommand(terminalScenario, terminalState, {
  type: "set-stance",
  stanceId: "risk",
  value: 0.8,
});
assert(safeRisk.accepted, "The player should be able to answer a crisis");
terminalState = advanceTurn(terminalScenario, safeRisk.state).state;
assert(
  terminalState.gameOverProgress.collapse.consecutiveTurns === 2 &&
    terminalState.gameOverProgress.collapse.matchedPrerequisiteGroupIds[0] ===
      "council-gone",
  "Switching between alternative prerequisite groups should preserve progress",
);
terminalState = advanceTurn(terminalScenario, terminalState).state;
assert(
  terminalState.outcome?.causes[0]?.gameOverId === "collapse",
  "A persistent trajectory should become terminal on its authored turn",
);
assert(
  advanceTurn(terminalScenario, terminalState).state === terminalState,
  "A terminal turn advance must preserve the original snapshot",
);
assert(
  !executeCommand(terminalScenario, terminalState, {
    type: "set-stance",
    stanceId: "risk",
    value: 0.1,
  }).accepted,
  "Terminal snapshots must reject player commands",
);

const recoveryScenario: ScenarioDefinition = {
  ...terminalScenario,
  id: "recovery-test",
  gameOvers: [
    {
      ...terminalScenario.gameOvers![0],
      prerequisiteGroups: [
        terminalScenario.gameOvers![0].prerequisiteGroups[0],
      ],
      stages: [
        {
          ...terminalScenario.gameOvers![0].stages[0],
          consequences: [{ kind: "resource", target: "reserve", amount: -3 }],
        },
        terminalScenario.gameOvers![0].stages[1],
      ],
    },
  ],
};
let recoveryState = advanceTurn(
  recoveryScenario,
  initializeScenario(recoveryScenario),
).state;
const recoveryAnswer = executeCommand(recoveryScenario, recoveryState, {
  type: "set-stance",
  stanceId: "risk",
  value: 0.8,
});
recoveryState = advanceTurn(recoveryScenario, recoveryAnswer.state).state;
assert(
  recoveryState.gameOverProgress.collapse.consecutiveTurns === 0 &&
    recoveryState.nodes.reserve.value === 9 &&
    recoveryState.history.filter(({ title }) => title === "Recovered")
      .length === 1,
  "Recovery should reset progress and apply its reward once per episode",
);
recoveryState = advanceTurn(recoveryScenario, recoveryState).state;
assert(
  recoveryState.nodes.reserve.value === 9 &&
    recoveryState.history.filter(({ title }) => title === "Recovered")
      .length === 1,
  "A cleared crisis must not repeat its recovery reward",
);
const repeatedBreach = executeCommand(recoveryScenario, recoveryState, {
  type: "set-stance",
  stanceId: "risk",
  value: 0.1,
});
recoveryState = advanceTurn(recoveryScenario, repeatedBreach.state).state;
assert(
  recoveryState.gameOverProgress.collapse.episode === 2 &&
    recoveryState.nodes.reserve.value === 6,
  "A later breach should begin a new episode and may apply its stages again",
);

const simultaneousScenario: ScenarioDefinition = {
  ...recoveryScenario,
  id: "simultaneous-test",
  gameOvers: [
    recoveryScenario.gameOvers![0],
    {
      ...recoveryScenario.gameOvers![0],
      id: "second-collapse",
      title: "Second collapse",
    },
  ],
};
let simultaneousState = initializeScenario(simultaneousScenario);
for (let index = 0; index < 3; index += 1)
  simultaneousState = advanceTurn(
    simultaneousScenario,
    simultaneousState,
  ).state;
assert(
  simultaneousState.outcome?.causes.length === 2,
  "Every trajectory becoming terminal on the same turn should be reported",
);

runComplianceTests();
runNodeEffectProjectionTests();
runNodeValueHistoryProjectionTests();
runTurnReportProjectionTests();
runInterfaceSoundTests();

console.log("Engine checks passed across core MVP mechanics.");

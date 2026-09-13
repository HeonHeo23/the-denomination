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

runComplianceTests();
runNodeEffectProjectionTests();
runTurnReportProjectionTests();

console.log("Engine checks passed across core MVP mechanics.");

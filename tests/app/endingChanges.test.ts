import assert from "node:assert/strict";
import { createGameSession } from "../../src/app/gameSession";
import {
  initializeScenario,
  executeCommand,
  advanceTurn,
  type ScenarioDefinition,
} from "../../src/simulation";
import { exampleScenario } from "../../src/scenarios/example";
import { endingScenario } from "../simulation/endings.test";
import {
  projectEndingChanges,
  projectEndingReport,
  projectChanges,
} from "../../src/ui/panels/projectReport";
import { formatSignedValue } from "../../src/ui/formatValue";

export function runEndingChangesTests() {
  const scenario: ScenarioDefinition = {
    ...endingScenario(),
    completion: { ...endingScenario().completion, reportNodeIds: [] },
    nodes: endingScenario().nodes.map((node) =>
      node.type === "stance" && node.id === "policy"
        ? { ...node, graphVisible: false }
        : node,
    ),
  };
  const initial = initializeScenario(scenario);
  assert.deepEqual(projectEndingChanges(scenario, initial), []);
  const changed = {
    ...initial,
    nodes: {
      ...initial.nodes,
      policy: { ...initial.nodes.policy, value: 0.8 },
      health: { ...initial.nodes.health, value: 0.45 },
      reserve: { ...initial.nodes.reserve, value: 5 },
      crisis: { ...initial.nodes.crisis, value: 0.3, isActive: true },
    },
  };
  const changes = projectEndingChanges(scenario, changed);
  assert.deepEqual(
    changes.map((c) => c.node.id),
    ["policy", "health", "reserve", "crisis"],
  );
  assert.equal(changes[0].node.graphVisible, false);
  assert.deepEqual(
    changes.map((c) => formatSignedValue(c.delta, c.node.domain, true)),
    ["+30.0%p", "-15.0%p", "+3.0", "+10.0%p"],
  );
  assert.equal(changes[3].previousActive, false);
  assert.equal(changes[3].isActive, true);
  const combined = projectChanges(scenario, initial, changed).find(
    (change) => change.node.id === "crisis",
  )!;
  assert.equal(combined.previousValue, 0.2);
  assert.equal(combined.value, 0.3);
  assert.equal(combined.previousActive, false);
  assert.equal(combined.isActive, true);
  assert.ok(Math.abs(combined.delta - 0.1) < 1e-9);
  for (const delta of [0, -0.000001, 0.000001]) {
    assert.equal(
      formatSignedValue(delta, scenario.nodes[0].domain, true),
      "0.0%p",
    );
  }
  assert.equal(
    formatSignedValue(0.15, scenario.nodes[0].domain),
    "+15.0%",
    "Other signed displays retain percentage notation",
  );
  assert.equal(
    formatSignedValue(-0.000001, scenario.nodes[2].domain, true),
    "0.0",
  );

  const action = executeCommand(scenario, initial, {
    type: "set-stance",
    stanceId: "policy",
    value: 0.8,
  });
  assert.equal(action.accepted, true);
  assert.equal(action.state.nodeValueHistory[0].policy.value, 0.8);
  assert.equal(
    projectEndingChanges(scenario, action.state)[0].previousValue,
    0.5,
  );
  const reversed = executeCommand(scenario, action.state, {
    type: "set-stance",
    stanceId: "policy",
    value: 0.5,
  });
  assert.equal(reversed.accepted, true);
  assert.deepEqual(
    projectEndingChanges(scenario, reversed.state),
    [],
    "Reversed changes have no net difference",
  );
  const completed = advanceTurn(scenario, action.state).state;
  const restored = createGameSession(
    scenario,
    JSON.parse(JSON.stringify(completed)),
  );
  assert.ok(restored.ok);
  assert.deepEqual(
    projectEndingChanges(scenario, restored.state),
    projectEndingChanges(scenario, completed),
  );
  assert.equal(
    projectEndingReport(scenario, restored.state)?.changes[0].previousValue,
    0.5,
  );
  const fallbackScenario = {
    ...scenario,
    completion: { ...scenario.completion, endings: [] },
  };
  const fallback = advanceTurn(
    fallbackScenario,
    executeCommand(fallbackScenario, initializeScenario(fallbackScenario), {
      type: "set-stance",
      stanceId: "policy",
      value: 0.8,
    }).state,
  ).state;
  assert.equal(
    projectEndingReport(fallbackScenario, fallback)?.usedFallback,
    true,
  );
  assert.equal(
    projectEndingReport(fallbackScenario, fallback)?.changes[0].previousValue,
    0.5,
  );

  const clamped: ScenarioDefinition = {
    ...scenario,
    nodes: scenario.nodes.map((node) =>
      node.type === "resource" && node.id === "reserve"
        ? { ...node, initial: { ...node.initial, value: 15 } }
        : node,
    ),
  };
  const clampedStart = initializeScenario(clamped);
  const spent = {
    ...clampedStart,
    nodes: {
      ...clampedStart.nodes,
      reserve: { ...clampedStart.nodes.reserve, value: 7 },
    },
  };
  assert.equal(projectEndingChanges(clamped, spent)[0].previousValue, 10);
  assert.equal(projectEndingChanges(clamped, spent)[0].delta, -3);

  const factionStart = initializeScenario(exampleScenario);
  const group = exampleScenario.factionGroups[0];
  const ids: string[] = exampleScenario.factionMetrics.map(
    (metric) => group.metrics[metric.id],
  );
  const factionChanged = {
    ...factionStart,
    nodes: {
      ...factionStart.nodes,
      ...Object.fromEntries(
        ids.map((id) => [
          id,
          {
            ...factionStart.nodes[id],
            value: factionStart.nodes[id].value - 0.1,
          },
        ]),
      ),
    },
  };
  const factions = projectEndingChanges(exampleScenario, factionChanged);
  assert.deepEqual(
    factions.map((c) => c.node.id),
    exampleScenario.nodes.filter((n) => ids.includes(n.id)).map((n) => n.id),
  );
  assert.ok(factions.every((c) => c.node.name === group.name));
  assert.deepEqual(
    new Set(factions.map((c) => c.metric?.id)),
    new Set(exampleScenario.factionMetrics.map((m) => m.id)),
  );
  const terminal = {
    ...changed,
    outcome: { kind: "game-over" as const, turn: 1, causes: [] },
  };
  assert.deepEqual(
    projectEndingChanges(scenario, terminal),
    changes,
    "Game Over uses the same comparisons",
  );
}

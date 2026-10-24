import assert from "node:assert/strict";
import { createGameSession } from "../../src/app/gameSession";
import {
  initializeScenario,
  executeCommand,
  advanceTurn,
  type ScenarioDefinition,
  type SimulationState,
} from "../../src/simulation";
import { exampleScenario } from "../../src/scenarios/example";
import { endingScenario } from "../simulation/fixtures";
import {
  projectFinalChanges,
  projectFinalReport,
  projectChanges,
  projectTurnReport,
  serializeTurnReport,
  restoreTurnReport,
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
  assert.deepEqual(projectFinalChanges(scenario, initial), []);
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
  const changes = projectFinalChanges(scenario, changed);
  assert.deepEqual(
    changes.map((c) => c.nodeId),
    ["policy", "health", "reserve", "crisis"],
  );
  assert.equal(changes[0].name, scenario.nodes[0].name);
  assert.deepEqual(
    changes.map((c) => formatSignedValue(c.amount, c.domain, true)),
    ["+30.0%p", "-15.0%p", "+3.0", "+10.0%p"],
  );
  assert.equal(changes[3].isActive, true);
  assert.ok(
    changes.slice(0, 3).every((change) => change.isActive === undefined),
  );
  const combined = projectChanges(scenario, initial, changed).find(
    (change) => change.nodeId === "crisis",
  )!;
  assert.equal(combined.previousValue, 0.2);
  assert.equal(combined.value, 0.3);
  assert.equal(combined.isActive, true);
  assert.ok(Math.abs(combined.amount - 0.1) < 1e-9);
  const deactivated = {
    ...changed,
    nodes: {
      ...changed.nodes,
      crisis: { ...changed.nodes.crisis, isActive: false },
    },
  };
  assert.equal(
    projectChanges(scenario, changed, deactivated)[0].isActive,
    false,
  );
  const inactiveValueChange = {
    ...deactivated,
    nodes: {
      ...deactivated.nodes,
      crisis: { ...deactivated.nodes.crisis, value: 0.4 },
    },
  };
  assert.equal(
    projectChanges(scenario, deactivated, inactiveValueChange)[0].isActive,
    undefined,
  );
  for (const [before, after] of [
    [initial, changed],
    [changed, deactivated],
    [deactivated, inactiveValueChange],
  ] as readonly [SimulationState, SimulationState][]) {
    const report = projectTurnReport(scenario, before, after);
    const saved = serializeTurnReport(report);
    const restoredReport = restoreTurnReport(scenario, saved);
    assert.deepEqual(restoredReport.changes, report.changes);
    assert.deepEqual(restoredReport.highlights, report.highlights);
    for (const change of report.changes.filter(
      (c) => c.isActive === undefined,
    )) {
      const savedChange = saved.changes.find(
        (c) => c.nodeId === change.nodeId,
      )!;
      assert.equal(Object.hasOwn(savedChange, "isActive"), false);
      assert.equal(Object.hasOwn(savedChange, "wasActive"), false);
    }
  }
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
  assert.equal(action.isAccepted, true);
  assert.equal(action.state.nodeValueHistory[0].policy.value, 0.8);
  assert.equal(
    projectFinalChanges(scenario, action.state)[0].previousValue,
    0.5,
  );
  const reversed = executeCommand(scenario, action.state, {
    type: "set-stance",
    stanceId: "policy",
    value: 0.5,
  });
  assert.equal(reversed.isAccepted, true);
  assert.deepEqual(
    projectFinalChanges(scenario, reversed.state),
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
    projectFinalChanges(scenario, restored.state),
    projectFinalChanges(scenario, completed),
  );
  assert.equal(
    projectFinalReport(scenario, restored.state)?.changes[0].previousValue,
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
  const fallbackReport = projectFinalReport(fallbackScenario, fallback);
  assert.ok(fallbackReport?.kind === "ending");
  assert.equal(fallbackReport.reason.usedFallback, true);
  assert.equal(
    projectFinalReport(fallbackScenario, fallback)?.changes[0].previousValue,
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
  assert.equal(projectFinalChanges(clamped, spent)[0].previousValue, 10);
  assert.equal(projectFinalChanges(clamped, spent)[0].amount, -3);

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
  const factions = projectFinalChanges(exampleScenario, factionChanged);
  assert.deepEqual(
    factions.map((c) => c.nodeId),
    exampleScenario.nodes.filter((n) => ids.includes(n.id)).map((n) => n.id),
  );
  assert.ok(factions.every((c) => c.name === group.name));
  assert.deepEqual(
    new Set(factions.map((c) => c.metric?.id)),
    new Set(exampleScenario.factionMetrics.map((m) => m.id)),
  );
  const factionReport = projectTurnReport(
    exampleScenario,
    factionStart,
    factionChanged,
  );
  const restoredFactionReport = restoreTurnReport(
    exampleScenario,
    serializeTurnReport(factionReport),
  );
  assert.deepEqual(restoredFactionReport.changes, factionReport.changes);
  assert.deepEqual(restoredFactionReport.highlights, factionReport.highlights);
  const terminal = {
    ...changed,
    outcome: { kind: "game-over" as const, turn: 1, causes: [] },
  };
  assert.deepEqual(
    projectFinalChanges(scenario, terminal),
    changes,
    "Game Over uses the same comparisons",
  );
}

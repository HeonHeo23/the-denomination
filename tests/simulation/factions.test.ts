import assert from "node:assert/strict";
import {
  advanceTurn,
  initializeScenario,
  loadScenario,
  validateScenario,
  prerequisiteMet,
  type FactionDefinition,
  type ScenarioDefinition,
} from "../../src/simulation";
import { ongoingCompletion } from "./fixtures";
import {
  projectToReactFlow,
  projectEffectsToReactFlow,
  projectGraphNavigationCategories,
} from "../../src/ui/graph/projectToReactFlow";
import {
  findFactionContext,
  getFactionGroupIndex,
  createFactionGraphId,
} from "../../src/ui/projections/projectFactionGroups";
import {
  filterNodeSearchEntries,
  projectNodeSearchEntries,
} from "../../src/ui/graph/projectNodeSearch";
import {
  projectTurnReport,
  projectEndingReport,
  serializeTurnReport,
  restoreTurnReport,
} from "../../src/ui/panels/projectReport";
import { projectNodeValueHistory } from "../../src/ui/panels/projectNodeValueHistory";
import { projectNodeEffects } from "../../src/ui/panels/projectNodeEffects";
import { projectEventOccurrence } from "../../src/ui/game/projectEventOccurrence";
import { validateSavedGame, type SavedGame } from "../../src/app/persistence";

function fixture(): ScenarioDefinition {
  const metricIds = ["satisfaction", "membership", "confidence"];
  const nodes: FactionDefinition[] = ["a", "b", "c"].flatMap((group, i) =>
    metricIds.map((metric) => ({
      id: `${group}-${metric}`,
      type: "faction",
      factionCategory: "theological",
      name: `${group} ${metric}`,
      description: "A numeric reading",
      domain:
        metric === "membership"
          ? { min: 0, max: 1, clamp: true }
          : metric === "confidence"
            ? { min: -5, max: 20, clamp: false }
            : { min: 0, max: 10, clamp: true },
      initial: {
        value: metric === "membership" ? [0.2, 0.3, 0.1][i] : 5,
        isActive: true,
        isForced: true,
      },
      ...(metric === "satisfaction" ? { baseline: 2 } : {}),
      ...(metric === "membership" ? { constraintId: "shared" } : {}),
    })),
  );
  return {
    schemaVersion: 3,
    id: "faction-metrics",
    title: "Factions",
    description: "Faction Metrics",
    start: { turn: 0 },
    historicalActors: [],
    completion: ongoingCompletion,
    factionMetrics: metricIds.map((id) => ({
      id,
      label:
        id === "confidence"
          ? "Institutional confidence"
          : id.charAt(0).toUpperCase() + id.slice(1),
    })),
    factionGroups: ["a", "b", "c"].map((id) => ({
      id,
      name: `Group ${id}`,
      description: "A static constituency",
      metrics: Object.fromEntries(
        metricIds.map((metric) => [metric, `${id}-${metric}`]),
      ),
    })),
    constraints: [{ id: "shared", kind: "sum-limit", maxTotal: 1 }],
    nodes: [
      ...nodes,
      {
        id: "measure",
        type: "indicator",
        name: "Measure",
        description: "Ordinary numeric value",
        domain: { min: 0, max: 100, clamp: true },
        initial: { value: 1, isActive: true, isForced: true },
        baseline: 0.1,
      },
    ],
    effects: [
      ...["a", "b", "c"].map((group, i) => ({
        id: `grow-${group}`,
        source: "_default_" as const,
        target: `${group}-membership`,
        response: { kind: "constant" as const, value: [0.8, 0.7, 0.6][i] },
      })),
      {
        id: "ordinary-to-group",
        source: "measure",
        target: "a-confidence",
        response: { kind: "constant", value: 0 },
      },
      {
        id: "group-to-ordinary",
        source: "a-satisfaction",
        target: "measure",
        response: { kind: "linear", coefficient: 0.1 },
      },
      {
        id: "product-reference",
        source: "measure",
        target: "c-satisfaction",
        response: {
          kind: "product",
          coefficient: 1,
          factors: ["a-membership"],
        },
      },
      {
        id: "within-group",
        source: "a-satisfaction",
        target: "a-confidence",
        response: { kind: "linear", coefficient: 0.1 },
        inertiaTurns: 2,
      },
      {
        id: "cross-metric",
        source: "a-membership",
        target: "b-satisfaction",
        response: { kind: "linear", coefficient: 1 },
      },
      {
        id: "parallel",
        source: "a-confidence",
        target: "b-satisfaction",
        response: { kind: "constant", value: 1 },
      },
    ],
  };
}
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
export function runFactionTests() {
  const scenario = fixture();
  assert.deepEqual(validateScenario(scenario), []);
  const loaded = loadScenario({
    ...scenario,
    constraints: [],
    nodes: scenario.nodes.map((node) =>
      node.type === "faction" ? { ...node, constraintId: undefined } : node,
    ),
  });
  assert.equal(loaded.ok, true, "Theological groups do not imply constraints");
  const empty = loadScenario({
    ...scenario,
    nodes: [],
    effects: [],
    factionGroups: undefined,
    factionMetrics: undefined,
    constraints: undefined,
  });
  assert.ok(
    empty.ok &&
      empty.scenario.factionGroups?.length === 0 &&
      empty.scenario.constraints?.length === 0,
  );
  const initial = initializeScenario(scenario);
  assert.equal(initial.nodes["a-satisfaction"].value, 5);
  assert.equal(initial.nodes["a-satisfaction"].baseValue, 2);
  assert.equal("membership" in initial.nodes["a-membership"], false);
  assert.equal("factionGroups" in initial, false);
  const result = advanceTurn(scenario, initial, 0);
  close(result.state.nodes["a-membership"].value, 1 / 2.7);
  close(result.state.nodes["b-membership"].value, 1 / 2.7);
  close(result.state.nodes["c-membership"].value, 0.7 / 2.7);
  close(result.state.nodes["b-satisfaction"].value, 3.2);
  assert.ok(
    result.trace.find((trace) => trace.targetId === "a-membership")!
      .constraintAdjustment! < 0,
  );
  assert.deepEqual(initial.effects["within-group"].sourceHistory, [5, 5]);
  const reversed = {
    ...scenario,
    nodes: [...scenario.nodes].reverse(),
    effects: [...scenario.effects].reverse(),
  };
  const reordered = advanceTurn(
    reversed,
    initializeScenario(reversed),
    0,
  ).state;
  for (const node of scenario.nodes)
    close(result.state.nodes[node.id].value, reordered.nodes[node.id].value);
  const unchanged = { ...scenario, effects: [] };
  close(
    advanceTurn(unchanged, initializeScenario(unchanged), 0).state.nodes[
      "a-membership"
    ].value,
    0.2,
  );
  const pair = {
    ...scenario,
    nodes: scenario.nodes.map((node) =>
      node.id === "c-membership" ? { ...node, constraintId: undefined } : node,
    ),
  };
  assert.deepEqual(validateScenario(pair), []);
  close(
    advanceTurn(pair, initializeScenario(pair), 0).state.nodes["a-membership"]
      .value,
    0.5,
  );
  const grudged = advanceTurn(
    scenario,
    {
      ...initial,
      grudges: [
        {
          id: "shock",
          label: "Shock",
          target: "a-satisfaction",
          magnitude: -1,
          decay: 0.5,
          createdTurn: 0,
        },
      ],
    },
    0,
  ).state;
  close(grudged.nodes["a-satisfaction"].value, 1);
  assert.equal(grudged.grudges[0].magnitude, -0.5);
  assert.ok(
    prerequisiteMet(
      {
        kind: "node-value",
        nodeId: "a-satisfaction",
        comparison: "at-least",
        value: 1,
      },
      grudged,
    ),
  );
  assert.equal(
    result.state.nodeValueHistory[result.state.turn]["a-satisfaction"].value,
    2,
  );
  const history = projectNodeValueHistory(
    scenario,
    scenario.nodes[0],
    result.state,
  );
  assert.equal(history.maximum, 10);
  assert.equal(history.guides[0].value, 2);

  const graph = projectToReactFlow(scenario, initial);
  assert.deepEqual(
    graph.navigationCategories,
    projectGraphNavigationCategories(scenario, initial),
  );
  assert.equal(graph.nodes.length, 4);
  assert.deepEqual(
    graph.nodes
      .filter((node) => node.data.nodeType === "faction")
      .map((node) => node.data.label),
    ["Group a", "Group b", "Group c"],
  );
  const switched = projectToReactFlow(
    scenario,
    initial,
    undefined,
    undefined,
    [],
    undefined,
    "confidence",
  );
  assert.deepEqual(switched.navigationCategories, graph.navigationCategories);
  assert.equal(
    switched.nodes.find((node) => node.id === createFactionGraphId("a"))!.data
      .metricLabel,
    "Institutional confidence",
  );
  assert.equal(
    switched.nodes.find((node) => node.id === createFactionGraphId("a"))!.data
      .domain.min,
    -5,
  );
  assert.equal(
    switched.nodes.find((node) => node.id === createFactionGraphId("a"))!.data
      .nodeId,
    "a-confidence",
  );
  assert.deepEqual(
    graph.edges.map((edge) => edge.id),
    switched.edges.map((edge) => edge.id),
  );
  const edge = graph.edges.find((edge) => edge.id === "cross-metric")!;
  assert.equal(edge.source, createFactionGraphId("a"));
  assert.equal(edge.target, createFactionGraphId("b"));
  assert.equal(edge.data!.sourceNodeId, "a-membership");
  assert.equal(edge.data!.targetNodeId, "b-satisfaction");
  assert.equal(edge.data!.sourceMetric?.label, "Membership");
  assert.equal(edge.data!.targetMetric?.label, "Satisfaction");
  assert.equal(
    edge.data!.sourceMetric,
    scenario.factionMetrics!.find(({ id }) => id === "membership"),
  );
  const self = graph.edges.find((edge) => edge.id === "within-group")!;
  assert.equal(self.source, self.target);
  assert.equal(edge.type, "smoothstep");
  assert.equal(self.type, "smoothstep");
  assert.ok(edge.label === undefined);
  const hovered = projectToReactFlow(
    scenario,
    initial,
    createFactionGraphId("a"),
  );
  assert.deepEqual(hovered.navigationCategories, graph.navigationCategories);
  const hoveredEdge = hovered.edges.find((item) => item.id === "cross-metric")!;
  assert.match(
    hoveredEdge.label as string,
    /Group a \(Membership\) → Group b \(Satisfaction\)/,
  );
  assert.deepEqual(
    hovered.edges.map((item) => item.type),
    graph.edges.map((item) => item.type),
  );
  assert.equal(
    graph.edges.find((edge) => edge.id === "ordinary-to-group")!.source,
    "measure",
  );
  assert.equal(
    graph.edges.find((edge) => edge.id === "ordinary-to-group")!.target,
    createFactionGraphId("a"),
  );
  assert.equal(
    graph.edges.find((edge) => edge.id === "group-to-ordinary")!.target,
    "measure",
  );
  close(result.state.nodes["c-satisfaction"].value, 2.2);
  close(
    advanceTurn(scenario, result.state, 0).state.nodes["a-confidence"].value,
    5.35,
  );
  assert.equal(
    projectEffectsToReactFlow(scenario, initial, "a-membership").length,
    graph.edges.length,
  );
  assert.equal(
    getFactionGroupIndex(scenario).byNode.get("a-confidence")!.metric.id,
    "confidence",
  );
  const searchEntries = projectNodeSearchEntries(scenario, initial);
  const factionEntries = searchEntries.filter(
    (entry) => entry.factionMetric !== undefined,
  );
  const expectedMetricIds = scenario.factionMetrics!.map(({ id }) => id);
  assert.equal(factionEntries.length, 9);
  assert.equal(
    new Set(factionEntries.map(({ id }) => id)).size,
    factionEntries.length,
  );
  assert.deepEqual(
    [...new Set(factionEntries.map(({ name }) => name))],
    ["Group a", "Group b", "Group c"],
  );
  for (const name of ["Group a", "Group b", "Group c"]) {
    assert.deepEqual(
      factionEntries
        .filter((entry) => entry.name === name)
        .map((entry) => entry.factionMetric?.id),
      expectedMetricIds,
    );
  }
  for (const entry of factionEntries) {
    assert.equal(
      findFactionContext(scenario, entry.id)?.metric.id,
      entry.factionMetric?.id,
      `Selecting ${entry.name}'s ${entry.factionMetric?.label} result should resolve to that metric`,
    );
  }
  const confidenceEntry = factionEntries.find(
    (entry) => entry.id === "a-confidence",
  );
  assert.ok(confidenceEntry);
  assert.equal(
    confidenceEntry.factionMetric?.label,
    "Institutional confidence",
  );
  assert.ok(
    filterNodeSearchEntries(searchEntries, "institutional confidence").some(
      (entry) => entry.id === "a-confidence",
    ),
  );
  for (const metricId of expectedMetricIds) {
    const graph = projectToReactFlow(
      scenario,
      initial,
      undefined,
      undefined,
      [],
      undefined,
      metricId,
    );
    assert.equal(
      graph.nodes.find((node) => node.id === createFactionGraphId("a"))?.data
        .nodeId,
      `a-${metricId}`,
    );
  }
  assert.equal(
    projectNodeEffects("b-satisfaction", scenario, initial).incoming.find(
      (effect) => effect.id === "cross-metric",
    )!.sourceMetric?.label,
    "Membership",
  );

  const report = projectTurnReport(scenario, initial, result.state);
  const savedReport = serializeTurnReport(report);
  assert.ok(savedReport.changes.every((change) => !("metric" in change)));
  assert.equal(
    restoreTurnReport(scenario, savedReport).changes.find(
      (change) => change.node.id === "a-membership",
    )!.metric?.label,
    "Membership",
  );
  const save: SavedGame = {
    version: 4,
    scenarioId: scenario.id,
    scenarioContentVersion: 4,
    playerName: "Player",
    denominationName: "Test",
    state: result.state,
    turnReport: savedReport,
  };
  const catalog = [{ contentVersion: 4, scenario }];
  assert.ok(validateSavedGame(save, catalog));
  const unclampedScenario: ScenarioDefinition = {
    ...scenario,
    effects: scenario.effects.map((effect) =>
      effect.id === "ordinary-to-group"
        ? { ...effect, response: { kind: "constant", value: 50 } }
        : effect,
    ),
  };
  const unclampedInitial = initializeScenario(unclampedScenario);
  const unclampedState = advanceTurn(unclampedScenario, unclampedInitial).state;
  assert.ok(unclampedState.nodes["a-confidence"].value > 20);
  assert.ok(
    validateSavedGame(
      {
        ...save,
        state: unclampedState,
        turnReport: serializeTurnReport(
          projectTurnReport(
            unclampedScenario,
            unclampedInitial,
            unclampedState,
          ),
        ),
      },
      [{ contentVersion: 4, scenario: unclampedScenario }],
    ),
    "Unclamped Faction readings and reports survive restoration",
  );
  assert.equal(
    validateSavedGame(
      {
        ...save,
        state: {
          ...save.state,
          nodes: {
            ...save.state.nodes,
            "a-membership": {
              membership: { value: 0.4 },
              satisfaction: { value: 0.5 },
              isActive: true,
              isForced: true,
            },
          },
        },
      },
      catalog,
    ),
    undefined,
  );
  assert.equal(
    validateSavedGame(
      {
        ...save,
        state: {
          ...save.state,
          nodes: {
            ...save.state.nodes,
            "a-membership": { ...save.state.nodes["a-membership"], value: 0.9 },
          },
        },
      },
      catalog,
    ),
    undefined,
  );
  const completion = {
    ...ongoingCompletion,
    reportNodeIds: ["a-membership", "a-satisfaction", "a-confidence"],
  };
  const ending = projectEndingReport(
    { ...scenario, completion },
    {
      ...result.state,
      outcome: {
        kind: "ending",
        turn: 1,
        endingId: "fallback",
        matchedTriggerIds: [],
        matchedPrerequisiteGroupIds: [],
        usedFallback: true,
      },
    },
  )!;
  assert.ok(
    ending.changes.some((change) => change.node.id === "a-satisfaction"),
  );
  assert.ok(
    ending.changes
      .filter((change) => change.node.type === "faction")
      .every((change) => change.metric?.label && change.metric.id),
  );
  assert.ok(
    ending.changes.some(
      (change) => !completion.reportNodeIds.includes(change.node.id),
    ),
    "Report-node selection does not restrict net changes",
  );

  const eventScenario: ScenarioDefinition = {
    ...scenario,
    events: [
      {
        id: "discontent",
        kind: "event",
        title: "Discontent",
        description: "Incident",
        influences: [{ source: "a-satisfaction", coefficient: 1 }],
        threshold: 0,
        cooldownTurns: 1,
        consequences: [
          {
            kind: "grudge",
            target: "a-confidence",
            magnitude: -1,
            decay: 0.5,
            label: "Concern",
          },
        ],
      },
    ],
  };
  const eventState = advanceTurn(
    eventScenario,
    initializeScenario(eventScenario),
    0,
  ).state;
  assert.equal(eventState.grudges[0].target, "a-confidence");
  assert.ok(
    projectEventOccurrence(eventScenario, eventState, "discontent:event:1"),
  );

  const invalid: unknown[] = [
    { ...scenario, factionMetrics: null },
    { ...scenario, factionGroups: null },
    { ...scenario, constraints: null },
    {
      ...scenario,
      factionGroups: [...scenario.factionGroups!, scenario.factionGroups![0]],
    },
    { ...scenario, factionMetrics: [] },
    { ...scenario, factionGroups: [] },
    {
      ...scenario,
      factionMetrics: [
        ...scenario.factionMetrics!,
        scenario.factionMetrics![0],
      ],
    },
    {
      ...scenario,
      factionGroups: scenario.factionGroups!.map((group, i) =>
        i === 0 ? { ...group, metrics: { membership: "a-membership" } } : group,
      ),
    },
    {
      ...scenario,
      factionGroups: scenario.factionGroups!.map((group, i) =>
        i === 0
          ? {
              ...group,
              metrics: { ...group.metrics, satisfaction: "b-satisfaction" },
            }
          : group,
      ),
    },
    {
      ...scenario,
      constraints: [{ id: "shared", kind: "sum-limit", maxTotal: 0 }],
    },
    {
      ...scenario,
      constraints: [{ id: "shared", kind: "sum-limit", maxTotal: 0.1 }],
    },
    {
      ...scenario,
      constraints: [scenario.constraints![0], scenario.constraints![0]],
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) =>
        node.id === "a-membership"
          ? { ...node, constraintId: "missing" }
          : node,
      ),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) =>
        node.id === "a-membership"
          ? { ...node, domain: { min: -1, max: 1, clamp: true } }
          : node,
      ),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) =>
        node.id === "a-membership"
          ? { ...node, domain: { min: 0, max: 1, clamp: false } }
          : node,
      ),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) =>
        node.id === "a-satisfaction"
          ? { ...node, factionCategory: "demographic" }
          : node,
      ),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) => ({ ...node, graphVisible: false })),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) => ({
        ...node,
        initial: { ...node.initial, isForced: false },
      })),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) => ({
        ...node,
        initial: { ...node.initial, isActive: false },
      })),
    },
    {
      ...scenario,
      nodes: scenario.nodes.map((node) => ({
        id: node.id,
        type: "faction",
        name: node.name,
        description: node.description,
        factionCategory: "theological",
        initial: { isActive: true, isForced: false },
        membership: { initial: 0.1 },
        satisfaction: { initial: 0.5 },
      })),
    },
    {
      ...scenario,
      events: [
        {
          id: "cancel",
          kind: "event",
          title: "Cancel",
          description: "Invalid",
          influences: [],
          threshold: 0,
          cooldownTurns: 1,
          consequences: [
            { kind: "activation", target: "a-satisfaction", active: false },
          ],
        },
      ],
    },
    {
      ...scenario,
      effects: [{ ...scenario.effects[0], targetMetric: "membership" }],
    },
    {
      ...scenario,
      effects: [
        {
          ...scenario.effects[0],
          response: {
            kind: "product",
            coefficient: 1,
            factors: [{ nodeId: "a-membership", metric: "membership" }],
          },
        },
      ],
    },
  ];
  for (const content of invalid)
    assert.ok(validateScenario(content).length > 0, JSON.stringify(content));
  const single = {
    ...scenario,
    nodes: scenario.nodes.map((node) =>
      node.id !== "a-membership" ? { ...node, constraintId: undefined } : node,
    ),
  };
  assert.ok(validateScenario(single).length > 0);
  console.log(
    "Faction metrics, groups, constraints, projections and saves passed.",
  );
}

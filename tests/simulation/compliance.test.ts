import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  assessStanceChange,
  executeCommand,
  initializeScenario,
  loadScenario,
  validateScenario,
  type ScenarioDefinition,
  type NodeDefinition,
} from "../../src/simulation";
import {
  createGameSession,
  reduceGameSession,
} from "../../src/app/gameSession";
import {
  projectEffectsToReactFlow,
  projectToReactFlow,
} from "../../src/ui/graph/projectToReactFlow";
import { formatValue, meterPercent } from "../../src/ui/formatValue";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const editNode = (
  id: string,
  edit: (node: NodeDefinition) => NodeDefinition,
): ScenarioDefinition => ({
  ...exampleScenario,
  nodes: exampleScenario.nodes.map((node) =>
    node.id === id ? edit(node) : node,
  ),
});

export function runComplianceTests() {
  const loaded = loadScenario(JSON.parse(JSON.stringify(exampleScenario)));
  assert.ok(loaded.ok);
  assert.deepEqual(validateScenario(loaded.scenario), []);
  assert.ok(Object.isFrozen(loaded.scenario.nodes[0].initial));
  assert.equal(loaded.scenario.nodes[0].graphVisible, true);
  assert.equal(loaded.scenario.effects[0].inertiaTurns, 1);
  assert.deepEqual(loaded.scenario.events, []);
  assert.equal(loaded.scenario.nodes[0].baseline, undefined);
  const minimal: ScenarioDefinition = {
    schemaVersion: 1,
    id: "minimal",
    title: "Minimal",
    description: "Empty content",
    start: { turn: 7 },
    nodes: [],
    effects: [],
  };
  const minimalLoad = loadScenario(minimal);
  assert.ok(minimalLoad.ok);
  assert.deepEqual(minimalLoad.scenario.conditions, []);

  const invalid: [unknown, string][] = [
    [null, "$"],
    [{}, "$.schemaVersion"],
    [{ ...exampleScenario, schemaVersion: 2 }, "$.schemaVersion"],
    [{ ...exampleScenario, startingTurn: 0 }, "$.startingTurn"],
    [
      {
        ...exampleScenario,
        nodes: exampleScenario.nodes.map((n, i) =>
          i === 0
            ? {
                ...n,
                initial: { value: n.initial.value, activation: "active" },
              }
            : n,
        ),
      },
      "$.nodes[0].initial.activation",
    ],
    [
      {
        ...exampleScenario,
        nodes: exampleScenario.nodes.map((n, i) =>
          i === 0
            ? { ...n, initial: { value: n.initial.value, isForced: false } }
            : n,
        ),
      },
      "$.nodes[0].initial.isActive",
    ],
    [
      {
        ...exampleScenario,
        nodes: exampleScenario.nodes.map((n, i) =>
          i === 0
            ? {
                ...n,
                initial: {
                  value: n.initial.value,
                  isActive: "yes",
                  isForced: false,
                },
              }
            : n,
        ),
      },
      "$.nodes[0].initial.isActive",
    ],
    [
      {
        ...exampleScenario,
        nodes: exampleScenario.nodes.map((n, i) =>
          i === 0
            ? {
                ...n,
                initial: {
                  value: n.initial.value,
                  isActive: false,
                  isForced: true,
                },
              }
            : n,
        ),
      },
      "$.nodes[0].initial.isActive",
    ],
    [{ ...exampleScenario, conditions: ["_has_seminary"] }, "$.conditions[0]"],
    [{ ...exampleScenario, events: [{}] }, "$.events"],
    [{ ...exampleScenario, nodes: undefined }, "$.nodes"],
    [
      editNode(
        "centralization",
        (n) =>
          ({ ...n, initial: { ...n.initial, value: NaN } }) as NodeDefinition,
      ),
      "$.nodes[0].initial.value",
    ],
    [
      editNode("centralization", (n) => ({ ...n, baseline: 2 })),
      "$.nodes[0].baseline",
    ],
    [
      editNode("centralization", (n) => ({ ...n, id: "_default_" })),
      "$.nodes[0].id",
    ],
    [
      editNode("centralization", (n) => ({
        ...n,
        domain: { ...n.domain, max: Infinity },
      })),
      "$.nodes[0].domain.max",
    ],
    [
      editNode(
        "governance-tension",
        (n) => ({ ...n, startThreshold: 2 }) as NodeDefinition,
      ),
      "$.nodes[8].startThreshold",
    ],
    [
      editNode(
        "governance-tension",
        (n) => ({ ...n, stopThreshold: 0.9 }) as NodeDefinition,
      ),
      "$.nodes[8].stopThreshold",
    ],
    [
      editNode(
        "localist-movement",
        (n) => ({ ...n, valueMeaning: "" }) as NodeDefinition,
      ),
      "$.nodes[6].valueMeaning",
    ],
    [
      {
        ...exampleScenario,
        effects: exampleScenario.effects.map((e, i) =>
          i === 0 ? { ...e, inertiaTurns: 1.5 } : e,
        ),
      },
      "$.effects[0].inertiaTurns",
    ],
    [
      {
        ...exampleScenario,
        effects: [
          {
            id: "bad",
            source: "missing",
            target: "centralization",
            response: { kind: "constant", value: 1 },
          },
        ],
      },
      "$.effects[0].source",
    ],
    [
      {
        ...exampleScenario,
        effects: [
          {
            id: "bad",
            source: "centralization",
            target: "missing",
            response: { kind: "product", coefficient: 1, factors: ["missing"] },
          },
        ],
      },
      "$.effects[0].response.factors[0]",
    ],
    [
      editNode(
        "centralization",
        (n) =>
          ({
            ...n,
            cost: { resourceId: "clergy-quality", base: 1, perPoint: 1 },
          }) as NodeDefinition,
      ),
      "$.nodes[0].cost.resourceId",
    ],
    [
      editNode(
        "centralization",
        (n) =>
          ({
            ...n,
            control: {
              kind: "discrete",
              states: [
                { value: 0.2, label: "A" },
                { value: 0.2, label: "B" },
              ],
            },
          }) as NodeDefinition,
      ),
      "$.nodes[0].control.states[1].value",
    ],
    [
      {
        ...exampleScenario,
        nodes: exampleScenario.nodes.map((n) =>
          n.type === "indicator"
            ? {
                ...n,
                initial: {
                  value: n.initial.value,
                  isActive: false,
                  isForced: false,
                },
              }
            : n,
        ),
      },
      "$.nodes[2].initial",
    ],
    [
      {
        ...exampleScenario,
        effects: [
          {
            id: "bad",
            source: "_default_",
            target: "clergy-quality",
            response: { kind: "constant", value: () => 1 },
          },
        ],
      },
      "$.effects[0].response.value",
    ],
  ];
  for (const [input, path] of invalid) {
    const result = loadScenario(input);
    assert.ok(!result.ok, `should reject ${path}`);
    assert.ok(
      result.diagnostics.some((d) => d.startsWith(path)),
      result.diagnostics.join("\n"),
    );
  }

  const accessor = {
    ...exampleScenario,
    get title(): string {
      throw new Error("must not execute content");
    },
  };
  assert.ok(!loadScenario(accessor).ok);
  const cyclic: Record<string, unknown> = { ...exampleScenario };
  cyclic.extra = cyclic;
  assert.ok(!loadScenario(cyclic).ok);
  assert.ok(!loadScenario({ ...exampleScenario, nodes: new Array(1) }).ok);
  const mutable = { ...exampleScenario, title: "Original title" };
  const detached = loadScenario(mutable);
  assert.ok(detached.ok);
  mutable.title = "Changed title";
  assert.equal(detached.scenario.title, "Original title");

  const initial = initializeScenario(exampleScenario);
  for (const node of exampleScenario.nodes)
    assert.equal(initial.nodes[node.id].value, node.initial.value);
  close(initial.effects["centralization-to-reach"].lastContribution, 0.4125);
  assert.equal(initial.effects["tension-to-trust"].lastContribution, 0);
  assert.deepEqual(
    initial.effects["formation-to-quality"].sourceHistory,
    [0.6, 0.6, 0.6],
  );
  assert.deepEqual(initial.history, []);
  const nonEquilibrium = editNode(
    "clergy-quality",
    (n) => ({ ...n, initial: { ...n.initial, value: 0.9 } }) as NodeDefinition,
  );
  assert.equal(
    initializeScenario(nonEquilibrium).nodes["clergy-quality"].value,
    0.9,
  );
  close(
    advanceTurn(nonEquilibrium, initializeScenario(nonEquilibrium)).state.nodes[
      "clergy-quality"
    ].value,
    0.57,
  );

  const inactive = editNode(
    "localist-movement",
    (n) =>
      ({
        ...n,
        initial: { value: 0.2, isActive: false, isForced: false },
      }) as NodeDefinition,
  );
  const inactiveInitial = initializeScenario(inactive);
  const inactiveTurn = advanceTurn(inactive, inactiveInitial);
  assert.strictEqual(
    inactiveTurn.state.nodes["localist-movement"],
    inactiveInitial.nodes["localist-movement"],
  );
  assert.equal(
    inactiveTurn.state.effects["localists-to-cohesion"].lastContribution,
    0,
  );
  const forced = editNode("governance-tension", (n) => ({
    ...n,
    initial: { ...n.initial, isActive: true, isForced: true },
  }));
  const forcedTurn = advanceTurn(forced, initializeScenario(forced)).state;
  assert.equal(forcedTurn.nodes["governance-tension"].isActive, true);
  assert.equal(forcedTurn.nodes["governance-tension"].isForced, true);

  const gated = editNode(
    "governance-tension",
    (n) =>
      ({
        ...n,
        startThreshold: 0.4,
        stopThreshold: 0.3,
        requires: ["permission"],
      }) as NodeDefinition,
  );
  const blockedTurn = advanceTurn(gated, initializeScenario(gated)).state;
  assert.ok(blockedTurn.nodes["governance-tension"].value >= 0.4);
  assert.equal(blockedTurn.nodes["governance-tension"].isActive, false);
  const permitted = {
    ...gated,
    conditions: [...(gated.conditions ?? []), "permission"],
  };
  const started = advanceTurn(permitted, initializeScenario(permitted)).state;
  assert.equal(started.nodes["governance-tension"].isActive, true);
  assert.equal(started.effects["tension-to-trust"].lastContribution, 0);
  assert.ok(
    advanceTurn(permitted, started).state.effects["tension-to-trust"]
      .lastContribution < 0,
  );
  const initiallyActive = {
    ...gated,
    nodes: gated.nodes.map((n) =>
      n.type === "situation" && n.id === "governance-tension"
        ? { ...n, initial: { ...n.initial, isActive: true, isForced: false } }
        : n,
    ),
  };
  assert.equal(
    initializeScenario(initiallyActive).nodes["governance-tension"].isActive,
    true,
  );
  assert.equal(
    advanceTurn(initiallyActive, initializeScenario(initiallyActive)).state
      .nodes["governance-tension"].isActive,
    true,
  );

  const capped = editNode(
    "centralization",
    (n) =>
      ({
        ...n,
        initial: { value: 0.55, isActive: false, isForced: false },
        cost: {
          resourceId: "authority",
          base: 0.5,
          perPoint: 12,
          maxChange: 0.2,
        },
      }) as NodeDefinition,
  );
  const cappedInitial = initializeScenario(capped);
  const snapshot = structuredClone(cappedInitial);
  const quote = assessStanceChange(
    capped,
    cappedInitial,
    "centralization",
    0.75,
  );
  assert.ok(quote.legal);
  const command = {
    type: "set-stance" as const,
    stanceId: "centralization",
    value: 0.75,
  };
  const changed = executeCommand(capped, cappedInitial, command);
  assert.ok(changed.accepted);
  assert.equal(changed.state.nodes.centralization.isActive, true);
  close(
    cappedInitial.nodes.authority.value - changed.state.nodes.authority.value,
    quote.cost,
  );
  assert.ok(
    executeCommand(capped, changed.state, { ...command, value: 0.95 }).accepted,
  );
  const rejected = executeCommand(capped, cappedInitial, {
    ...command,
    value: 0.751,
  });
  assert.equal(rejected.accepted, false);
  assert.strictEqual(rejected.state, cappedInitial);
  assert.deepEqual(cappedInitial, snapshot);
  assert.equal(
    executeCommand(capped, cappedInitial, { ...command, value: 0.55 }).accepted,
    false,
  );
  assert.equal(
    executeCommand({ ...exampleScenario, conditions: [] }, initial, {
      type: "set-stance",
      stanceId: "clergy-formation",
      value: 0.4,
    }).accepted,
    false,
  );
  const poor = {
    ...cappedInitial,
    nodes: {
      ...cappedInitial.nodes,
      authority: { ...cappedInitial.nodes.authority, value: 0 },
    },
  };
  assert.equal(executeCommand(capped, poor, command).accepted, false);
  const discrete = editNode(
    "centralization",
    (n) =>
      ({
        ...n,
        initial: { value: 0.5, isActive: true, isForced: true },
        control: {
          kind: "discrete",
          states: [
            { value: 0.5, label: "Low" },
            { value: 1, label: "High" },
          ],
        },
      }) as NodeDefinition,
  );
  assert.deepEqual(validateScenario(discrete), []);
  assert.equal(
    executeCommand(discrete, initializeScenario(discrete), {
      ...command,
      value: 0.75,
    }).accepted,
    false,
  );
  const forcedChange = executeCommand(discrete, initializeScenario(discrete), {
    ...command,
    value: 1,
  });
  assert.ok(forcedChange.accepted);
  assert.equal(forcedChange.state.nodes.centralization.isForced, true);

  // Each Grudge is applied once to the baseline, then decayed, without accumulating.
  const grudged = {
    ...initial,
    grudges: [
      {
        id: "test",
        label: "Aftermath",
        target: "leadership-trust",
        magnitude: -0.1,
        decay: 0.5,
        createdTurn: 0,
      },
    ],
  };
  const normalTurn = advanceTurn(exampleScenario, initial).state;
  const grudgeTurn = advanceTurn(exampleScenario, grudged).state;
  close(
    grudgeTurn.nodes["leadership-trust"].value,
    normalTurn.nodes["leadership-trust"].value - 0.1,
  );
  close(grudgeTurn.grudges[0].magnitude, -0.05);
  assert.equal(
    grudgeTurn.nodes["leadership-trust"].baseValue,
    initial.nodes["leadership-trust"].baseValue,
  );
  const frozenInput = Object.freeze(structuredClone(initial));
  advanceTurn(exampleScenario, frozenInput);
  assert.deepEqual(frozenInput, initial);

  const domain = { min: -50, max: 50, clamp: true };
  assert.equal(formatValue(25, domain), "25.0");
  assert.equal(meterPercent(25, domain), 75);
  assert.equal(meterPercent(100, domain), 100);
  assert.equal(formatValue(0.4, { min: 0, max: 1, clamp: true }), "40%");
  const graph = projectToReactFlow(exampleScenario, initial);
  assert.ok(!graph.nodes.some((n) => n.id === "authority"));
  assert.deepEqual(graph.nodes[0].data.domain, exampleScenario.nodes[0].domain);
  assert.deepEqual(
    graph.nodes.map(({ id, position }) => ({ id, position })),
    projectToReactFlow(exampleScenario, initial).nodes.map(
      ({ id, position }) => ({ id, position }),
    ),
    "Graph layout should be stable for the same Scenario",
  );
  assert.ok(
    new Set(graph.nodes.map((node) => node.position.x)).size > 3,
    "Category clusters should use more than the legacy type columns",
  );
  assert.ok(
    graph.nodes.some((node) => node.data.category === "Governance"),
    "Authored categories should be retained by the graph projection",
  );
  assert.ok(
    graph.edges.every((edge) => edge.label === undefined),
    "Unfocused Effects should not display labels",
  );
  const tracedEdges = projectEffectsToReactFlow(
    exampleScenario,
    initial,
    "centralization",
  );
  assert.ok(
    tracedEdges.some(
      (edge) => edge.source === "centralization" && edge.label !== undefined,
    ),
    "Hovering a node should reveal its connected Effect labels",
  );
  assert.ok(
    tracedEdges.some(
      (edge) =>
        edge.source !== "centralization" &&
        edge.target !== "centralization" &&
        edge.style?.opacity === 0.1,
    ),
    "Hovering a node should fade unrelated Effects",
  );
  assert.ok(
    normalTurn.nodes.authority.value !== initial.nodes.authority.baseValue,
  );

  const namedConstructor: ScenarioDefinition = {
    ...minimal,
    nodes: [
      {
        id: "constructor",
        type: "indicator",
        name: "Measure",
        description: "A valid identifier",
        domain: { min: 0, max: 10, clamp: true },
        initial: { value: 2, isActive: true, isForced: true },
        baseline: 1,
      },
    ],
    effects: [
      {
        id: "pressure",
        source: "_default_",
        target: "constructor",
        response: { kind: "constant", value: 3 },
      },
    ],
  };
  assert.equal(
    advanceTurn(namedConstructor, initializeScenario(namedConstructor)).state
      .nodes[namedConstructor.nodes[0].id].value,
    4,
  );

  const session = createGameSession({
    ...exampleScenario,
    start: { turn: 7, year: 2040 },
  });
  assert.ok(session.ok);
  const advanced = reduceGameSession(session, { type: "advance" });
  assert.ok(advanced.ok);
  assert.equal(advanced.state.turn, 8);
  assert.equal(advanced.state.year, 2041);
  const reset = reduceGameSession(advanced, { type: "reset" });
  assert.ok(reset.ok);
  assert.strictEqual(reset.scenario, session.scenario);
  assert.deepEqual(reset.state, session.state);
  assert.deepEqual(reset.trace, []);
  const noYear = createGameSession(minimal);
  assert.ok(noYear.ok);
  assert.equal(noYear.state.year, undefined);
  const failure = createGameSession({});
  assert.ok(!failure.ok);
  assert.strictEqual(reduceGameSession(failure, { type: "advance" }), failure);
}

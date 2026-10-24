import assert from "node:assert/strict";
import {
  advanceTurn,
  getEndingsInSelectionOrder,
  initializeScenario,
  type GameOverDefinition,
  type ScenarioDefinition,
} from "../../src/simulation";
import { exampleScenario } from "../../src/scenarios/example";
import { date, group, endingScenario } from "../simulation/fixtures";
import {
  projectOutcomeConditions,
  projectOutcomeConditionDetail,
} from "../../src/ui/game/projectOutcome";

function createOutcomeFixture() {
  const base = endingScenario();
  const healthy = base.completion.endings[0].prerequisiteGroups[0];
  const impossible = group("impossible", 0.95);
  const crisis: GameOverDefinition = {
    id: "revival",
    title: "Shared ID crisis",
    prerequisiteGroups: [healthy],
    turnsToGameOver: 2,
    stages: [
      {
        id: "warning",
        atTurn: 1,
        title: "An inquiry",
        description: "Conditions persisted.",
      },
    ],
    description: "Leadership ended.",
  };
  const scenario: ScenarioDefinition = {
    ...base,
    nodes: base.nodes.map((node) =>
      node.id === "health" && node.type !== "faction"
        ? { ...node, graphVisible: false }
        : node,
    ),
    effects: [
      {
        id: "health-flow",
        source: "policy",
        target: "health",
        response: { kind: "constant", value: 0.1 },
      },
    ],
    gameOvers: [crisis],
    completion: {
      ...base.completion,
      endings: [
        { ...base.completion.endings[0], id: "z", priority: 20 },
        {
          ...base.completion.endings[0],
          id: "a",
          priority: 20,
          prerequisiteGroups: [impossible, healthy],
        },
        {
          ...base.completion.endings[0],
          id: "revival",
          priority: 10,
          title: "Inspect revival",
          description: "A report narrative.",
        },
        {
          ...base.completion.endings[0],
          id: "unmet",
          priority: 30,
          prerequisiteGroups: [impossible],
        },
      ],
    },
  };
  const state = {
    ...initializeScenario(scenario),
    turn: 1,
    grudges: [
      {
        id: "memory",
        label: "Remembered support",
        target: "health",
        magnitude: 0.05,
        decay: 0.9,
        createdTurn: 0,
      },
    ],
    gameOverProgress: {
      revival: {
        episode: 1,
        consecutiveTurns: 1,
        matchedPrerequisiteGroupIds: [healthy.id],
      },
    },
  };
  const recorded = {
    ...state,
    nodes: { ...state.nodes, health: { ...state.nodes.health, value: 0.1 } },
    outcome: {
      kind: "ending" as const,
      turn: 1,
      endingId: "a",
      usedFallback: false,
      matchedTriggerIds: [base.completion.prerequisiteGroups[0].id],
      matchedPrerequisiteGroupIds: [healthy.id, impossible.id],
    },
  };

  return { base, healthy, impossible, crisis, scenario, state, recorded };
}

function assertSummaryAndDetailProjections(
  fixture: ReturnType<typeof createOutcomeFixture>,
) {
  const { base, healthy, impossible, crisis, scenario, state, recorded } =
    fixture;
  const summaries = projectOutcomeConditions(scenario, state);
  const suppliedCrises = summaries.crises;
  assert.equal(
    projectOutcomeConditions(scenario, state, suppliedCrises).crises,
    suppliedCrises,
    "Supplied crisis summaries are reused without copying",
  );
  const emptyCrises: readonly [] = [];
  assert.equal(
    projectOutcomeConditions(scenario, state, emptyCrises).crises,
    emptyCrises,
    "A supplied empty crisis summary array is not recomputed",
  );
  assert.deepEqual(
    summaries.endings.map(({ id }) => id),
    ["unmet", "a", "z", "revival"],
  );
  assert.equal(summaries.completion[0].status, "met");
  assert.deepEqual(
    summaries.endings.map(({ id, status }) => ({ id, status })),
    getEndingsInSelectionOrder(scenario).map(({ id }) => ({
      id,
      status: id === "unmet" ? "unmet" : "met",
    })),
  );
  const reversed = {
    ...scenario,
    completion: {
      ...scenario.completion,
      endings: [...scenario.completion.endings].reverse(),
    },
  };
  assert.deepEqual(
    projectOutcomeConditions(reversed, state).endings,
    summaries.endings,
    "Ending summaries preserve selection order regardless of authored order",
  );
  assert.deepEqual(
    projectOutcomeConditions(
      { ...scenario, completion: { ...scenario.completion, endings: [] } },
      state,
    ).endings,
    [],
  );
  assert.equal("allGroups" in summaries.endings[0], false);
  assert.equal(
    "contributions" in summaries.crises[0],
    false,
    "Summaries do not construct detail analysis",
  );

  const detail = projectOutcomeConditionDetail(scenario, state, {
    kind: "ending",
    id: "a",
  })!;
  assert.equal(detail.matchSource, "current");
  assert.deepEqual(
    detail.allGroups.map(({ matched }) => matched),
    [false, true],
  );
  assert.deepEqual(
    detail.contributions.map(({ id }) => id),
    ["health-flow", "memory"],
  );
  assert.ok(detail.contributionGroups[0].currentReading);
  assert.equal(
    projectOutcomeConditionDetail(scenario, state, {
      kind: "ending",
      id: "unmet",
    })?.contributions.length,
    0,
  );
  assert.equal(
    projectOutcomeConditionDetail(scenario, state, {
      kind: "ending",
      id: "missing",
    }),
    undefined,
  );
  const sameIdCrisis = projectOutcomeConditionDetail(scenario, state, {
    kind: "crisis",
    id: "revival",
  });
  assert.deepEqual(
    [sameIdCrisis?.kind, sameIdCrisis?.title, sameIdCrisis?.description],
    ["crisis", crisis.title, crisis.description],
  );
  const sameIdEnding = projectOutcomeConditionDetail(scenario, state, {
    kind: "ending",
    id: "revival",
  });
  assert.equal(sameIdEnding?.kind, "ending", "IDs are scoped by kind");
  assert.equal(sameIdEnding?.title, "Inspect revival");
  assert.equal(sameIdEnding?.description, "A report narrative.");

  const recordedDetail = projectOutcomeConditionDetail(scenario, recorded, {
    kind: "ending",
    id: "a",
  })!;
  assert.equal(recordedDetail.matchSource, "outcome");
  assert.equal(recordedDetail.matchedGroups[0].matched, true);
  assert.equal(
    recordedDetail.matchedGroups[0].prerequisites[0].isMet,
    false,
    "Recorded matches do not replace current readings",
  );
  assert.deepEqual(
    recordedDetail.matchedGroups.map(({ id }) => id),
    [healthy.id, impossible.id],
    "Recorded group order is preserved independently of authored group order",
  );
  assert.deepEqual(summaries.fallback, {
    title: base.completion.fallbackEnding.title,
    description: base.completion.fallbackEnding.description,
  });
}

function assertCrisisDetailProjections(
  fixture: ReturnType<typeof createOutcomeFixture>,
) {
  const { base, crisis, scenario, state } = fixture;
  const recovered = {
    ...state,
    gameOverProgress: {
      revival: {
        ...state.gameOverProgress.revival,
        consecutiveTurns: 0,
        matchedPrerequisiteGroupIds: [],
      },
    },
  };
  assert.equal(
    projectOutcomeConditionDetail(scenario, recovered, {
      kind: "crisis",
      id: "revival",
    }),
    undefined,
  );
  const recoveredDetail = projectOutcomeConditionDetail(
    scenario,
    recovered,
    { kind: "crisis", id: "revival" },
    ["revival"],
  );
  assert.ok(recoveredDetail?.kind === "crisis");
  assert.equal(recoveredDetail.contributions.length, 0);

  const phasedScenario: ScenarioDefinition = {
    ...base,
    completion: {
      ...base.completion,
      prerequisiteGroups: [date(100)],
    },
    gameOvers: [
      {
        ...crisis,
        prerequisiteGroups: [group("reserves", 2, "reserve")],
        stages: [
          {
            ...crisis.stages[0],
            consequences: [{ kind: "resource", target: "reserve", amount: -1 }],
          },
        ],
      },
    ],
  };
  const afterStage = advanceTurn(
    phasedScenario,
    initializeScenario(phasedScenario),
  ).state;
  const stageDetail = projectOutcomeConditionDetail(
    phasedScenario,
    afterStage,
    { kind: "crisis", id: crisis.id },
  );
  assert.ok(stageDetail?.kind === "crisis");
  assert.equal(stageDetail.matchSource, "crisis-evaluation");
  assert.equal(stageDetail.matchedGroups[0].matched, true);
  assert.equal(
    stageDetail.matchedGroups[0].prerequisites[0].isMet,
    false,
    "Stage consequences can clear current readings without undoing this turn's crisis match",
  );
}

function assertFactionMetricProjection() {
  const metricNodeId = "traditionalist-coalition-satisfaction";
  const factionScenario: ScenarioDefinition = {
    ...exampleScenario,
    effects: [
      ...exampleScenario.effects,
      {
        id: "metric-pressure",
        source: "_default_",
        target: metricNodeId,
        response: { kind: "constant", value: 0.1 },
      },
    ],
    completion: {
      ...exampleScenario.completion,
      endings: [
        {
          ...exampleScenario.completion.endings[0],
          prerequisiteGroups: [group("metric-group", 0, metricNodeId)],
        },
      ],
    },
  };
  const metricDetail = projectOutcomeConditionDetail(
    factionScenario,
    initializeScenario(factionScenario),
    { kind: "ending", id: exampleScenario.completion.endings[0].id },
  );
  assert.ok(metricDetail);
  assert.equal(
    metricDetail.allGroups[0].prerequisites[0].metric?.id,
    "satisfaction",
  );
  assert.equal(
    metricDetail.allGroups[0].prerequisites[0].title,
    "Traditionalist Members",
  );
  assert.equal(
    metricDetail.contributions.find(({ id }) => id === "metric-pressure")
      ?.targetMetric?.id,
    "satisfaction",
  );
}

export function runProjectOutcomeTests() {
  const fixture = createOutcomeFixture();
  const before = JSON.stringify(fixture);

  assertSummaryAndDetailProjections(fixture);
  assertCrisisDetailProjections(fixture);
  assertFactionMetricProjection();

  assert.equal(
    JSON.stringify(fixture),
    before,
    "Outcome projections preserve their inputs",
  );
}

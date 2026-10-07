import assert from "node:assert/strict";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  loadScenario,
  type ScenarioDefinition,
  type SimulationState,
} from "../../src/simulation";
import {
  adjustPolicy,
  campaign,
  decide,
  strasbourg as scenario,
  strasbourgStrategies,
  type Policy,
} from "./strasbourgCampaign";

function close(actual: number, expected: number, message: string) {
  assert(
    Math.abs(actual - expected) < 1e-6,
    `${message}: ${actual} / ${expected}`,
  );
}

function invariants(state: SimulationState) {
  for (const node of scenario.nodes) {
    const runtime = state.nodes[node.id];
    assert(Number.isFinite(runtime.value), `${node.id} must remain finite`);
    if (node.type !== "resource")
      assert(
        runtime.value >= node.domain.min && runtime.value <= node.domain.max,
      );
    if (runtime.isForced) assert(runtime.isActive);
  }
  const religiousShare = scenario.nodes
    .filter(
      (node) =>
        node.type === "faction" && node.constraintId === "religious-households",
    )
    .reduce((sum, node) => sum + state.nodes[node.id].value, 0);
  assert(religiousShare <= 1 + 1e-10);
  assert(state.pendingDilemmaIds.length <= 1);
}

function testReferenceCampaigns() {
  const expected: Record<string, string> = {
    refuge: "a-church-of-refuge",
    concord: "a-city-in-concord",
    civic: "the-magistrates-church",
    plural: "a-negotiated-church",
  };
  const summary: Record<string, unknown> = {};
  for (const [name, policy] of Object.entries(strasbourgStrategies)) {
    const endings = new Set<string>();
    let minimum = Infinity,
      maximum = -Infinity,
      maxActions = 0;
    for (let seed = 1; seed <= 64; seed++) {
      for (const choiceIndex of [0, 1, 2]) {
        const result = campaign(policy, seed, choiceIndex, {
          onTurn: invariants,
        });
        const { state } = result;
        assert(
          state.outcome?.kind === "ending",
          `${name}/${seed}/${choiceIndex} must survive`,
        );
        endings.add(state.outcome.endingId);
        assert(state.turn >= 25 && state.turn <= 55);
        assert.equal(state.year, 1523 + state.turn);
        assert(result.actions <= 12 && result.quietTurns >= 10);
        assert.equal(state.pendingDilemmaIds.length, 0);
        assert(
          Object.values(state.dilemmas).every(
            (dilemma) => dilemma.triggerCount <= 1,
          ),
        );
        assert(
          Object.values(state.dilemmas).filter(
            (dilemma) => dilemma.triggerCount,
          ).length < 30,
        );
        minimum = Math.min(minimum, state.nodes.money.value);
        maximum = Math.max(maximum, state.nodes.money.value);
        maxActions = Math.max(maxActions, result.actions);
      }
    }
    assert(
      endings.has(expected[name]),
      `${name} must reach its distinct settlement`,
    );
    assert(
      maximum - minimum > 15,
      "Incident responses must materially change reserves",
    );
    summary[name] = {
      money: [Number(minimum.toFixed(2)), Number(maximum.toFixed(2))],
      maxActions,
      endings: [...endings],
    };
  }
  console.log(
    "Strasbourg: 768 reference campaigns passed.",
    JSON.stringify(summary),
  );
}

function testIncidentReachability() {
  // Move a relevant policy through real commands with competing incidents,
  // costs, and crises enabled. No synthetic trigger snapshots are used.
  for (const incident of [...scenario.events!, ...scenario.dilemmas!]) {
    const influence = incident.influences[0];
    assert(
      scenario.nodes.some(
        (node) => node.type === "stance" && node.id === influence.source,
      ),
    );
    const result = campaign(
      { [influence.source]: influence.coefficient > 0 ? 0.85 : 0.15 },
      17,
      2,
      { maxTurns: 18 },
    );
    const progress =
      incident.kind === "event"
        ? result.state.events[incident.id]
        : result.state.dilemmas[incident.id];
    assert(
      progress.triggerCount > 0,
      `${incident.id} must be reachable through legal play`,
    );
    assert(incident.description.includes("Historical reference:"));
    assert(incident.description.includes("Fictional playable situation:"));
  }
}

function testRecovery() {
  const cases: Array<{ id: string; danger: Policy; repair: Policy }> = [
    {
      id: "common-insolvency",
      danger: {},
      repair: { "common-assessments": 1, "endowment-allocation": 1 },
    },
    {
      id: "withdrawn-confidence",
      danger: {
        "religious-forbearance": 0,
        "worship-reform": 1,
        "devotional-images": 1,
      },
      repair: { "religious-forbearance": 0.75, "devotional-images": 0.5 },
    },
    {
      id: "broken-communion",
      danger: {
        "council-oversight": 1,
        "religious-forbearance": 0,
        "confessional-subscription": 1,
        "pastoral-training": 0,
        "catechetical-instruction": 0,
        "congregational-singing": 0,
        "devotional-images": 1,
      },
      repair: {
        "religious-forbearance": 0.5,
        "confessional-subscription": 0.5,
        "devotional-images": 0.5,
      },
    },
  ];
  for (const { id, danger, repair } of cases) {
    let state = initializeScenario(scenario);
    // Keep capacity to reverse course before provoking a sustained fracture.
    if (id === "broken-communion") {
      for (let i = 0; i < 5; i++)
        state = decide(scenario, advanceTurn(scenario, state, 0.5).state, 2);
    }
    for (
      let i = 0;
      i < 25 && !state.outcome && !state.gameOverProgress[id].consecutiveTurns;
      i++
    ) {
      state = adjustPolicy(scenario, state, danger, false).state;
      state = decide(scenario, advanceTurn(scenario, state, 0.5).state, 2);
    }
    assert(
      !state.outcome && state.gameOverProgress[id].consecutiveTurns > 0,
      `${id} warning must be reachable`,
    );
    let abandoned = state;
    for (let i = 0; i < 8 && !abandoned.outcome; i++)
      abandoned = decide(
        scenario,
        advanceTurn(scenario, abandoned, 0.5).state,
        2,
      );
    assert(
      abandoned.outcome?.kind === "game-over",
      `${id} must end if ignored`,
    );
    assert(
      abandoned.outcome.causes.some((cause) => cause.gameOverId === id),
      `${id} must be terminal if ignored`,
    );
    for (
      let i = 0;
      i < 8 && !state.outcome && state.gameOverProgress[id].consecutiveTurns;
      i++
    ) {
      state = adjustPolicy(scenario, state, repair, false).state;
      if (id === "common-insolvency")
        state = adjustPolicy(scenario, state, repair).state;
      state = decide(scenario, advanceTurn(scenario, state, 0.5).state, 2);
    }
    assert(!state.outcome, `${id} must leave a viable recovery window`);
    assert.equal(
      state.gameOverProgress[id].consecutiveTurns,
      0,
      `${id} should recover`,
    );
    assert(state.history.some((entry) => entry.id.includes(`${id}:recovery:`)));
    if (id === "common-insolvency") {
      while (!state.outcome && state.turn < 56)
        state = decide(scenario, advanceTurn(scenario, state, 0.5).state, 2);
      assert(state.outcome?.kind === "ending");
      assert.equal(state.outcome.endingId, "unfinished-settlement");
      assert(
        state.outcome.usedFallback,
        "Survival with depleted reserves has its own ending",
      );
    }
  }
}

function testCostsAndInertia() {
  const isolated: ScenarioDefinition = {
    ...scenario,
    events: [],
    dilemmas: [],
    gameOvers: [],
  };
  const initial = initializeScenario(isolated);
  const changed = executeCommand(isolated, initial, {
    type: "set-stance",
    stanceId: "pastoral-training",
    value: 0.75,
  });
  assert(changed.accepted);
  close(
    changed.state.nodes.authority.value,
    41.5,
    "Adjustment debits Authority immediately",
  );
  close(
    changed.state.nodes["teaching-quality"].value,
    initial.nodes["teaching-quality"].value,
    "Teaching does not change during a Stance command",
  );
  let state = changed.state;
  const first = advanceTurn(isolated, state, 0).state;
  for (let i = 0; i < 4; i++) state = advanceTurn(isolated, state, 0).state;
  assert(
    first.nodes["teaching-quality"].value >
      initial.nodes["teaching-quality"].value,
  );
  assert(
    first.nodes["teaching-quality"].value <
      state.nodes["teaching-quality"].value,
  );
  const repealed = executeCommand(isolated, initial, {
    type: "repeal-stance",
    stanceId: "schooling",
  });
  assert(repealed.accepted);
  close(repealed.state.nodes.authority.value, 42, "Repeal has its stated cost");
  assert.equal(repealed.state.nodes.schooling.value, 0.5);
  const enacted = executeCommand(isolated, repealed.state, {
    type: "enact-stance",
    stanceId: "schooling",
    value: 0.5,
  });
  assert(enacted.accepted);
  close(
    enacted.state.nodes.authority.value,
    37,
    "Re-enactment cannot refund resources",
  );
  assert(
    !executeCommand(isolated, initial, {
      type: "repeal-stance",
      stanceId: "worship-reform",
    }).accepted,
  );
  const quiet = advanceTurn(isolated, repealed.state, 0);
  assert.equal(
    quiet.state.effects["schooling-to-expenditure"].lastContribution,
    0,
  );
  assert.equal(
    quiet.state.effects["schooling-to-literacy"].lastContribution,
    0,
  );
  const reversed = { ...isolated, effects: [...isolated.effects].reverse() };
  let normalState = initial,
    reverseState = initializeScenario(reversed);
  for (let turn = 0; turn < 8; turn++) {
    normalState = advanceTurn(isolated, normalState, 0).state;
    reverseState = advanceTurn(reversed, reverseState, 0).state;
  }
  for (const node of scenario.nodes)
    close(
      normalState.nodes[node.id].value,
      reverseState.nodes[node.id].value,
      `${node.id} respects snapshot order`,
    );
}

function testStressAndStability() {
  for (const choiceIndex of [0, 1, 2]) {
    const neglected = campaign({}, 7, choiceIndex).state;
    assert(neglected.outcome?.kind === "game-over");
    assert(
      neglected.turn > 8 && neglected.turn < 25,
      "The starting deficit requires a response, not immediate crisis management",
    );
  }
  const overfunded = campaign(
    {
      "poor-relief": 1,
      "refugee-reception": 1,
      "hospital-provision": 1,
      "pastoral-training": 1,
      schooling: 1,
      "evangelical-diplomacy": 1,
    },
    7,
    2,
  ).state;
  assert(overfunded.outcome?.kind === "game-over");
  assert(
    overfunded.outcome.causes.some(
      (cause) => cause.gameOverId === "common-insolvency",
    ),
  );
  const persistent: ScenarioDefinition = {
    ...scenario,
    events: [],
    dilemmas: [],
    gameOvers: [],
    completion: {
      ...scenario.completion,
      prerequisiteGroups: [
        {
          id: "after-probe",
          title: "After probe",
          description: "Test only",
          allOf: [{ kind: "turn", atTurn: 101 }],
        },
      ],
    },
  };
  for (const policy of [{}, ...Object.values(strasbourgStrategies)]) {
    const { snapshots } = campaign(policy, 5, 2, {
      scenario: persistent,
      maxTurns: 100,
      onTurn: invariants,
    });
    for (const node of scenario.nodes) {
      if (node.type === "indicator" || node.type === "faction")
        close(
          snapshots[90].nodes[node.id].value,
          snapshots[100].nodes[node.id].value,
          `${node.id} settles without runaway feedback`,
        );
      if (node.type === "faction" && node.id.endsWith("-membership")) {
        for (let i = 1; i < snapshots.length; i++)
          assert(
            Math.abs(
              snapshots[i].nodes[node.id].value -
                snapshots[i - 1].nodes[node.id].value,
            ) <= 0.081,
            `${node.id} moves modestly`,
          );
      }
    }
    const measurements = scenario.nodes.filter(
      (node) => node.type === "indicator" && node.domain.max === 1,
    );
    assert(
      measurements.every(
        (node) =>
          snapshots[100].nodes[node.id].value > 0 &&
          snapshots[100].nodes[node.id].value < 1,
      ),
      "Coherent policies should not rely on clamp saturation",
    );
  }
  for (const extreme of [0, 1]) {
    const policy = Object.fromEntries(
      scenario.nodes
        .filter((node) => node.type === "stance")
        .map((node) => [node.id, extreme]),
    );
    campaign(policy, 13, 2, {
      strict: false,
      policyTurns: 25,
      onTurn: invariants,
    });
  }
  // Retain concurrent Events rather than testing an artificially isolated pool.
  let checked = false;
  let previousMoney = 65;
  campaign(strasbourgStrategies.refuge, 11, 1, {
    onTurn(state) {
      const fired = scenario.events!.filter(
        (event) => state.events[event.id].lastTriggerTurn === state.turn,
      );
      const eventMoney = fired
        .flatMap((event) => event.consequences)
        .reduce(
          (sum, consequence) =>
            sum +
            (consequence.kind === "resource" && consequence.target === "money"
              ? consequence.amount
              : 0),
          0,
        );
      close(
        state.nodes.money.value,
        Math.max(-200, Math.min(300, previousMoney)) +
          state.nodes.money.netFlow! +
          eventMoney,
        "All simultaneous Money consequences apply once",
      );
      // Negotiated choices in this run spend Authority, not Money.
      previousMoney = state.nodes.money.value;
      if (fired.length < 2) return;
      checked = true;
      for (const event of fired)
        assert(
          state.history.some(
            (entry) =>
              entry.kind === "event" &&
              entry.turn === state.turn &&
              entry.title === event.title,
          ),
        );
      assert(state.nodes.money.value > 0);
    },
  });
  assert(
    checked,
    "Reference play must exercise simultaneous automatic incidents",
  );
}

export function runStrasbourgTests() {
  const loaded = loadScenario(JSON.parse(JSON.stringify(scenario)));
  assert(loaded.ok, loaded.ok ? undefined : loaded.diagnostics.join("\n"));
  assert.equal(scenario.nodes.length, 86);
  assert(scenario.effects.length >= 200 && scenario.effects.length <= 220);
  assert.equal(scenario.events!.length, 24);
  assert.equal(scenario.dilemmas!.length, 30);
  assert.equal(scenario.factionGroups!.length, 12);
  assert.equal(scenario.historicalActors.length, 16);
  assert.deepEqual(
    scenario.nodes
      .filter((node) => node.type === "resource")
      .map(({ id, name }) => [id, name]),
    [
      ["money", "Money"],
      ["authority", "Authority"],
    ],
  );
  const initial = initializeScenario(loaded.scenario);
  assert.equal(initial.nodes.money.value, 65);
  assert.equal(initial.nodes.authority.value, 45);
  assert(
    initial.nodes.money.netFlow! < -2 && initial.nodes.money.netFlow! > -5,
  );
  assert.equal(initial.nodes["anabaptists-membership"].value, 0);
  assert.equal(initial.nodes["french-refugees-membership"].value, 0);
  testReferenceCampaigns();
  testIncidentReachability();
  testRecovery();
  testCostsAndInertia();
  testStressAndStability();
  console.log(
    "Strasbourg: all 54 incidents reachable; crisis recovery, costs, delays, and stability passed.",
  );
}

import assert from "node:assert/strict";
import {
  advanceTurn,
  evaluateEnding,
  executeCommand,
  initializeScenario,
  loadScenario,
  prerequisiteMet,
  validateScenario,
  type CompletionDefinition,
  type EndingDefinition,
  type PrerequisiteGroupDefinition,
  type ScenarioDefinition,
} from "../../src/simulation";
import { exampleScenario } from "../../src/scenarios/example";
import { resolveEnding } from "../../src/simulation/engine/resolveEnding";
import { projectGameOverWarnings } from "../../src/ui/game/projectGameOvers";
import { projectPrerequisite } from "../../src/ui/game/projectPrerequisite";
import { projectEndingReport } from "../../src/ui/game/projectEndingReport";
import {
  beginAutomaticEvents,
  closeEventPresentation,
} from "../../src/ui/game/eventDialogFlow";

const date = (
  atTurn = 1,
): CompletionDefinition["prerequisiteGroups"][number] => ({
  id: "review",
  title: "Review",
  description: "The institutional review.",
  allOf: [{ kind: "turn", atTurn }],
});
const group = (id = "healthy", value = 0.6): PrerequisiteGroupDefinition => ({
  id,
  title: id,
  allOf: [
    { kind: "node-value", nodeId: "health", comparison: "at-least", value },
  ],
});
const ending = (
  id: string,
  priority: number,
  prerequisiteGroups = [group()],
): EndingDefinition => ({
  id,
  title: id,
  narrative: `${id} institutional narrative.`,
  priority,
  prerequisiteGroups,
});

export function endingScenario(): ScenarioDefinition {
  return {
    schemaVersion: 3,
    id: "ending-test",
    title: "Ending test",
    description: "Institutional ending tests.",
    start: { turn: 0, year: 1980 },
    historicalActors: [
      {
        id: "delegates",
        name: "Delegates",
        role: "Assembly",
        description: "Represent the institution.",
      },
    ],
    completion: {
      prerequisiteGroups: [date()],
      endings: [ending("revival", 10)],
      fallbackEnding: {
        id: "unresolved",
        title: "Unresolved",
        narrative: "The institution retains unresolved tensions.",
      },
      reportNodeIds: ["health", "reserve"],
    },
    nodes: [
      {
        id: "policy",
        type: "stance",
        name: "Policy",
        description: "A policy.",
        domain: { min: 0, max: 1, clamp: true },
        initial: { value: 0.5, isActive: true, isForced: false },
        control: { kind: "continuous" },
      },
      {
        id: "health",
        type: "indicator",
        name: "Health",
        description: "Institutional health.",
        domain: { min: 0, max: 1, clamp: true },
        initial: { value: 0.6, isActive: true, isForced: true },
        baseline: 0.6,
      },
      {
        id: "reserve",
        type: "resource",
        name: "Reserve",
        description: "Reserves.",
        domain: { min: 0, max: 10, clamp: true },
        initial: { value: 2, isActive: true, isForced: true },
      },
      {
        id: "crisis",
        type: "situation",
        name: "Crisis",
        description: "Institutional tension.",
        domain: { min: 0, max: 1, clamp: true },
        initial: { value: 0.2, isActive: false, isForced: false },
        baseline: 0.2,
        startThreshold: 0.7,
        stopThreshold: 0.3,
      },
    ],
    effects: [],
  };
}

export function assemblyScenario(
  scenario: ScenarioDefinition = endingScenario(),
): ScenarioDefinition {
  return {
    ...scenario,
    events: [],
    dilemmas: [
      {
        id: "assembly",
        kind: "dilemma",
        title: "Assembly",
        description: "Choose succession.",
        influences: [],
        threshold: 0,
        cooldownTurns: 1,
        choices: [
          {
            id: "accept",
            label: "Accept",
            description: "Authorize succession.",
            consequences: [{ kind: "resource", target: "reserve", amount: 4 }],
          },
          {
            id: "decline",
            label: "Decline",
            description: "Continue deliberation.",
            consequences: [],
          },
        ],
      },
    ],
  };
}

export function runEndingTests() {
  const scenario = endingScenario();
  assert.deepEqual(validateScenario(scenario), []);
  const loaded = loadScenario(scenario);
  assert.ok(loaded.ok);
  assert.ok(Object.isFrozen(loaded.scenario.completion.prerequisiteGroups));
  assert.ok(Object.isFrozen(loaded.scenario.historicalActors));
  const initial = initializeScenario(scenario);
  assert.equal(initial.outcome, null);
  assert.equal(evaluateEnding(scenario, initial), null);
  const first = advanceTurn(scenario, initial).state;
  assert.deepEqual(first.outcome, {
    kind: "ending",
    turn: 1,
    endingId: "revival",
    matchedTriggerIds: ["review"],
    matchedPrerequisiteGroupIds: ["healthy"],
    usedFallback: false,
  });
  assert.strictEqual(resolveEnding(scenario, first), first);
  assert.strictEqual(advanceTurn(scenario, first).state, first);
  assert.equal(first.history.filter(({ kind }) => kind === "ending").length, 1);
  for (const command of [
    { type: "set-stance", stanceId: "policy", value: 0.9 },
    { type: "enact-stance", stanceId: "policy", value: 0.9 },
    { type: "repeal-stance", stanceId: "policy" },
    { type: "resolve-dilemma", dilemmaId: "assembly", choiceId: "accept" },
  ] as const) {
    const result = executeCommand(scenario, first, command);
    assert.equal(result.accepted, false);
    assert.strictEqual(result.state, first);
  }
  const later = {
    ...scenario,
    start: { turn: 7, year: 1980 },
    completion: { ...scenario.completion, prerequisiteGroups: [date(9)] },
  };
  const eight = advanceTurn(later, initializeScenario(later)).state;
  assert.equal(eight.outcome, null);
  assert.equal(advanceTurn(later, eight).state.outcome?.turn, 9);
  assert.equal(
    evaluateEnding(later, { ...eight, turn: 10 })?.turn,
    10,
    "Turn triggers remain reached after the specified date",
  );

  const objective: CompletionDefinition["prerequisiteGroups"][number] = {
    id: "objective",
    title: "Objective",
    description: "An objective.",
    allOf: group().allOf,
  };
  const multiple = {
    ...scenario,
    completion: {
      ...scenario.completion,
      prerequisiteGroups: [
        date(),
        {
          ...objective,
          id: "objective-too-high",
          allOf: group("too-high", 0.9).allOf,
        },
        objective,
      ],
      endings: [
        ending("unqualified", 100, [group("too-high", 0.9)]),
        ending("zulu", 20),
        ending("alpha", 20, [group("alternative", 0.4), group()]),
        ending("lower", 5),
      ],
    },
  };
  const multi = advanceTurn(multiple, initializeScenario(multiple)).state;
  assert.equal(multi.outcome?.kind, "ending");
  if (multi.outcome?.kind !== "ending") throw new Error("Expected ending");
  assert.equal(multi.outcome.endingId, "alpha");
  assert.deepEqual(multi.outcome.matchedTriggerIds, ["objective", "review"]);
  assert.deepEqual(multi.outcome.matchedPrerequisiteGroupIds, [
    "alternative",
    "healthy",
  ]);
  const reversed = {
    ...multiple,
    completion: {
      ...multiple.completion,
      prerequisiteGroups: [...multiple.completion.prerequisiteGroups].reverse(),
      endings: [...multiple.completion.endings].reverse(),
    },
  };
  assert.deepEqual(
    advanceTurn(reversed, initializeScenario(reversed)).state.outcome,
    multi.outcome,
  );
  const unmatched = {
    ...scenario,
    completion: {
      ...scenario.completion,
      endings: [
        ending("impossible", 99, [
          {
            ...group(),
            allOf: [
              ...group().allOf,
              {
                kind: "node-activation" as const,
                nodeId: "crisis",
                active: true,
              },
            ],
          },
        ]),
      ],
    },
  };
  const fallback = advanceTurn(unmatched, initializeScenario(unmatched)).state;
  assert.equal(fallback.outcome?.kind, "ending");
  if (fallback.outcome?.kind === "ending") {
    assert.equal(fallback.outcome.usedFallback, true);
    assert.equal(fallback.outcome.endingId, "unresolved");
    assert.deepEqual(fallback.outcome.matchedPrerequisiteGroupIds, []);
  }

  const eventScenario: ScenarioDefinition = {
    ...scenario,
    completion: {
      ...scenario.completion,
      prerequisiteGroups: [
        {
          id: "council",
          title: "Council",
          description: "A historical council.",
          allOf: [{ kind: "event", eventId: "council" }],
        },
      ],
      endings: [
        ending("funded", 20, [
          {
            id: "funded",
            title: "Funded",
            allOf: [
              {
                kind: "node-value",
                nodeId: "reserve",
                comparison: "at-least",
                value: 5,
              },
            ],
          },
        ]),
      ],
    },
    events: [
      {
        id: "council",
        kind: "event",
        title: "Council",
        description: "Council held.",
        influences: [],
        threshold: 0,
        cooldownTurns: 1,
        consequences: [{ kind: "resource", target: "reserve", amount: 4 }],
      },
    ],
  };
  const unfired = {
    ...eventScenario,
    events: eventScenario.events!.map((event) => ({ ...event, threshold: 1 })),
  };
  assert.equal(
    advanceTurn(unfired, initializeScenario(unfired)).state.outcome,
    null,
  );
  const eventEnd = advanceTurn(
    eventScenario,
    initializeScenario(eventScenario),
  ).state;
  assert.equal(eventEnd.nodes.reserve.value, 6);
  assert.equal(
    eventEnd.outcome?.kind === "ending" && eventEnd.outcome.endingId,
    "funded",
  );
  assert.deepEqual(
    eventEnd.history.map(({ kind }) => kind),
    ["consequence", "event", "ending"],
  );

  const milestone: CompletionDefinition["prerequisiteGroups"][number] = {
    id: "funded-council-review",
    title: "Funded council review",
    description: "The council is funded by the second turn.",
    allOf: [
      { kind: "turn", atTurn: 2 },
      { kind: "event", eventId: "council" },
      {
        kind: "node-value",
        nodeId: "reserve",
        comparison: "at-least",
        value: 5,
      },
    ],
  };
  const combined: ScenarioDefinition = {
    ...eventScenario,
    completion: {
      ...eventScenario.completion,
      prerequisiteGroups: [milestone],
      endings: [ending("council-reviewed", 40, [milestone])],
    },
  };
  assert.deepEqual(validateScenario(combined), []);
  const fundedFirst = advanceTurn(combined, initializeScenario(combined)).state;
  assert.equal(
    fundedFirst.outcome,
    null,
    "Completion requires every predicate, even after the Event fires",
  );
  const reviewed = advanceTurn(combined, fundedFirst).state;
  assert.equal(
    reviewed.outcome?.kind === "ending" && reviewed.outcome.endingId,
    "council-reviewed",
  );
  assert.deepEqual(projectEndingReport(combined, reviewed)?.triggers, [
    milestone,
  ]);
  const dateStatus = projectPrerequisite(
    milestone.allOf[0],
    combined,
    reviewed,
  );
  const eventStatus = projectPrerequisite(
    milestone.allOf[1],
    combined,
    reviewed,
  );
  assert.equal(dateStatus.met, true);
  assert.equal(dateStatus.nodeId, undefined);
  assert.equal(eventStatus.title, "Council");
  assert.equal(eventStatus.nodeId, undefined);
  assert.equal(
    projectPrerequisite(milestone.allOf[2], combined, reviewed).nodeId,
    "reserve",
  );

  const incidentGameOver = {
    id: "exhausted",
    title: "Reserves exhausted",
    prerequisiteGroups: [
      {
        id: "reserve-threshold",
        title: "Reserve threshold",
        allOf: [
          {
            kind: "node-value",
            nodeId: "reserve",
            comparison: "at-least",
            value: 5,
          },
        ],
      },
    ],
    terminalAfterTurns: 2,
    stages: [
      {
        id: "warning",
        atTurn: 1,
        title: "Warning",
        description: "An authored warning.",
      },
    ],
    report: {
      title: "Terminal",
      narrative: "The institution can no longer continue.",
    },
  } as const;
  const afterEventScenario = {
    ...eventScenario,
    gameOvers: [incidentGameOver],
  };
  const afterEvent = advanceTurn(
    afterEventScenario,
    initializeScenario(afterEventScenario),
  ).state;
  assert.equal(afterEvent.gameOverProgress.exhausted.consecutiveTurns, 0);
  assert.equal(afterEvent.outcome?.kind, "ending");

  const dilemmaScenario = assemblyScenario({
    ...eventScenario,
    completion: {
      ...eventScenario.completion,
      prerequisiteGroups: [
        {
          id: "succession",
          title: "Succession",
          description: "The assembly resolves succession.",
          allOf: [
            {
              kind: "dilemma-choice",
              dilemmaId: "assembly",
              choiceId: "accept",
            },
          ],
        },
      ],
    },
  });
  const afterChoiceScenario = {
    ...dilemmaScenario,
    gameOvers: [incidentGameOver],
  };
  const afterChoiceQueued = advanceTurn(
    afterChoiceScenario,
    initializeScenario(afterChoiceScenario),
  ).state;
  const afterChoice = executeCommand(afterChoiceScenario, afterChoiceQueued, {
    type: "resolve-dilemma",
    dilemmaId: "assembly",
    choiceId: "accept",
  }).state;
  assert.equal(afterChoice.gameOverProgress.exhausted.consecutiveTurns, 0);
  assert.equal(afterChoice.outcome, null);
  const afterChoiceTurn = advanceTurn(afterChoiceScenario, afterChoice).state;
  assert.equal(afterChoiceTurn.gameOverProgress.exhausted.consecutiveTurns, 1);
  assert.equal(afterChoiceTurn.outcome?.kind, "ending");
  const queued = advanceTurn(
    dilemmaScenario,
    initializeScenario(dilemmaScenario),
  ).state;
  assert.equal(queued.outcome, null);
  assert.equal(queued.dilemmas.assembly.lastResolvedTurn, null);
  const accepted = executeCommand(dilemmaScenario, queued, {
    type: "resolve-dilemma",
    dilemmaId: "assembly",
    choiceId: "accept",
  }).state;
  assert.equal(accepted.turn, queued.turn);
  assert.equal(accepted.dilemmas.assembly.lastResolvedChoiceId, "accept");
  assert.equal(accepted.dilemmas.assembly.lastResolvedTurn, 1);
  assert.equal(accepted.outcome, null, "A choice does not evaluate completion");
  assert.equal(
    accepted.history.filter(({ kind }) => kind === "ending").length,
    0,
  );
  const completedChoice = advanceTurn(dilemmaScenario, accepted).state;
  assert.equal(completedChoice.turn, 2);
  assert.equal(
    completedChoice.outcome?.kind === "ending" &&
      completedChoice.outcome.endingId,
    "funded",
  );
  assert.equal(
    completedChoice.history.filter(({ kind }) => kind === "ending").length,
    1,
  );
  assert.strictEqual(
    advanceTurn(dilemmaScenario, completedChoice).state,
    completedChoice,
  );
  assert.equal(
    executeCommand(dilemmaScenario, queued, {
      type: "resolve-dilemma",
      dilemmaId: "assembly",
      choiceId: "decline",
    }).state.outcome,
    null,
  );
  const succession = dilemmaScenario.completion.prerequisiteGroups[0].allOf[0];
  assert.equal(prerequisiteMet(succession, accepted), true);
  assert.equal(
    prerequisiteMet(succession, {
      ...accepted,
      dilemmas: {
        ...accepted.dilemmas,
        assembly: {
          ...accepted.dilemmas.assembly,
          lastResolvedChoiceId: "decline",
        },
      },
    }),
    false,
    "Dilemma prerequisites use the latest structured choice",
  );
  assert.equal(
    projectPrerequisite(succession, dilemmaScenario, accepted).nodeId,
    undefined,
  );

  const anyChoice: ScenarioDefinition = {
    ...dilemmaScenario,
    completion: {
      ...dilemmaScenario.completion,
      prerequisiteGroups: [
        {
          id: "assembly",
          title: "Assembly",
          description: "Assembly resolved.",
          allOf: [{ kind: "dilemma-choice", dilemmaId: "assembly" }],
        },
      ],
    },
  };
  const declined = executeCommand(
    anyChoice,
    advanceTurn(anyChoice, initializeScenario(anyChoice)).state,
    { type: "resolve-dilemma", dilemmaId: "assembly", choiceId: "decline" },
  ).state;
  assert.equal(declined.outcome, null);
  assert.equal(advanceTurn(anyChoice, declined).state.outcome?.kind, "ending");
  const deferred = {
    ...dilemmaScenario,
    completion: { ...dilemmaScenario.completion, prerequisiteGroups: [date()] },
  };
  const deferredState = advanceTurn(
    deferred,
    initializeScenario(deferred),
  ).state;
  assert.equal(deferredState.outcome, null);
  assert.strictEqual(advanceTurn(deferred, deferredState).state, deferredState);
  const deferredChoice = executeCommand(deferred, deferredState, {
    type: "resolve-dilemma",
    dilemmaId: "assembly",
    choiceId: "accept",
  }).state;
  assert.equal(deferredChoice.outcome, null);
  assert.equal(
    advanceTurn(deferred, deferredChoice).state.outcome?.kind,
    "ending",
  );
  assert.equal(
    advanceTurn(
      dilemmaScenario,
      executeCommand(dilemmaScenario, queued, {
        type: "resolve-dilemma",
        dilemmaId: "assembly",
        choiceId: "decline",
      }).state,
    ).state.outcome,
    null,
    "A different choice remains unmatched on the next turn",
  );

  const resolution: ScenarioDefinition = {
    ...scenario,
    completion: {
      ...scenario.completion,
      prerequisiteGroups: [
        {
          id: "resolution",
          title: "Resolved",
          description: "Tensions subside.",
          allOf: [{ kind: "situation-resolved", nodeId: "crisis" }],
        },
      ],
    },
  };
  assert.equal(
    advanceTurn(resolution, initializeScenario(resolution)).state.outcome,
    null,
    "Initial inactivity is not resolution",
  );
  const activeResolution: ScenarioDefinition = {
    ...resolution,
    nodes: resolution.nodes.map((node) =>
      node.type === "situation" && node.id === "crisis"
        ? { ...node, initial: { ...node.initial, isActive: true } }
        : node,
    ),
  };
  assert.equal(
    advanceTurn(activeResolution, initializeScenario(activeResolution)).state
      .outcome?.kind,
    "ending",
  );

  const terminal: ScenarioDefinition = {
    ...eventScenario,
    completion: { ...scenario.completion, prerequisiteGroups: [date(2)] },
    gameOvers: [
      {
        id: "suppression",
        title: "Suppression",
        prerequisiteGroups: [group()],
        terminalAfterTurns: 2,
        stages: [
          {
            id: "warning",
            atTurn: 1,
            title: "Warning",
            description: "External pressure.",
          },
        ],
        report: { title: "Suppressed", narrative: "Leadership is removed." },
      },
    ],
  };
  const warning = advanceTurn(terminal, initializeScenario(terminal)).state;
  const gameOver = advanceTurn(terminal, warning).state;
  assert.equal(gameOver.outcome?.kind, "game-over");
  assert.equal(
    gameOver.history.filter(({ kind }) => kind === "ending").length,
    0,
  );
  assert.equal(evaluateEnding(terminal, gameOver), null);
  assert.equal(gameOver.events.council.triggerCount, 1);

  const report = projectEndingReport(multiple, multi)!;
  assert.equal(report.ending.title, "alpha");
  assert.equal(report.year, 1981);
  assert.equal(report.actors[0].id, "delegates");
  assert.deepEqual(
    report.readings.map(({ value }) => value),
    ["60%", "2.0"],
  );
  assert.equal(projectEndingReport(terminal, gameOver), undefined);
  const presentation = beginAutomaticEvents(["first", "second"], "ending")!;
  const next = closeEventPresentation(presentation);
  assert.equal(next.returnTo, undefined);
  assert.equal(closeEventPresentation(next.next!).returnTo, "ending");

  const sharedCrisis: ScenarioDefinition = {
    ...combined,
    completion: { ...combined.completion, prerequisiteGroups: [date(100)] },
    gameOvers: [{ ...terminal.gameOvers![0], prerequisiteGroups: [milestone] }],
  };
  const beforeCrisis = advanceTurn(
    sharedCrisis,
    initializeScenario(sharedCrisis),
  ).state;
  assert.equal(beforeCrisis.gameOverProgress.suppression.consecutiveTurns, 0);
  const sharedWarning = advanceTurn(sharedCrisis, beforeCrisis).state;
  const crisis = projectGameOverWarnings(sharedCrisis, sharedWarning)[0];
  assert.equal(crisis.consecutiveTurns, 1);
  assert.deepEqual(crisis.matchedPrerequisiteNodeIds, ["reserve"]);
  assert.ok(crisis.matchedGroups[0].prerequisites.every(({ met }) => met));
  assert.equal(
    advanceTurn(sharedCrisis, sharedWarning).state.outcome?.kind,
    "game-over",
  );

  for (const predicate of [
    { kind: "turn", atTurn: -1 },
    { kind: "turn", atTurn: 1.5 },
    { kind: "turn", atTurn: Number.POSITIVE_INFINITY },
    { kind: "event", eventId: "missing" },
    { kind: "event", eventId: "council", atTurn: 2 },
    { kind: "dilemma-choice", dilemmaId: "assembly", choiceId: "missing" },
    { kind: "dilemma-choice", dilemmaId: "missing" },
    { kind: "node-value", nodeId: "missing", comparison: "at-least", value: 0 },
    { kind: "node-value", nodeId: "health", comparison: "at-least", value: 2 },
    { kind: "situation-resolved", nodeId: "health" },
    { kind: "situation-resolved", nodeId: "missing" },
    { kind: "unknown" },
  ]) {
    const invalidGroup = { ...milestone, allOf: [predicate] };
    for (const candidate of [
      {
        ...dilemmaScenario,
        events: eventScenario.events,
        completion: {
          ...dilemmaScenario.completion,
          prerequisiteGroups: [invalidGroup],
        },
      },
      {
        ...dilemmaScenario,
        events: eventScenario.events,
        completion: {
          ...dilemmaScenario.completion,
          endings: [
            { ...ending("invalid", 1), prerequisiteGroups: [invalidGroup] },
          ],
        },
      },
      {
        ...dilemmaScenario,
        events: eventScenario.events,
        gameOvers: [
          { ...terminal.gameOvers![0], prerequisiteGroups: [invalidGroup] },
        ],
      },
    ])
      assert.ok(
        validateScenario(candidate).length,
        "All consumers share predicate validation",
      );
  }
  assert.ok(
    validateScenario({
      ...scenario,
      completion: {
        ...scenario.completion,
        prerequisiteGroups: [{ ...date(), description: undefined }],
      },
    }).length,
  );
  assert.ok(
    validateScenario({
      ...scenario,
      completion: {
        triggers: [{ ...date(), kind: "turn", atTurn: 1 }],
        endings: [],
        fallbackEnding: scenario.completion.fallbackEnding,
        reportNodeIds: [],
      },
    }).length,
    "The legacy completion trigger format is rejected",
  );

  const invalid: unknown[] = [
    { ...scenario, completion: undefined },
    { ...scenario, historicalActors: undefined },
    {
      ...scenario,
      historicalActors: [
        scenario.historicalActors[0],
        scenario.historicalActors[0],
      ],
    },
    ...[
      { ...scenario.completion, prerequisiteGroups: [] },
      { ...scenario.completion, prerequisiteGroups: [date(0)] },
      { ...scenario.completion, prerequisiteGroups: [date(), date()] },
      {
        ...scenario.completion,
        prerequisiteGroups: [{ ...objective, allOf: [] }],
      },
      {
        ...scenario.completion,
        fallbackEnding: {
          ...scenario.completion.fallbackEnding,
          id: "revival",
        },
      },
      { ...scenario.completion, endings: [ending("fraction", 0.5)] },
      { ...scenario.completion, reportNodeIds: ["missing"] },
      { ...scenario.completion, reportNodeIds: ["health", "health"] },
    ].map((completion) => ({ ...scenario, completion })),
  ];
  for (const content of invalid)
    assert.ok(
      validateScenario(content).length > 0,
      "Malformed completion content must be rejected",
    );

  assert.deepEqual(validateScenario(exampleScenario), []);
  assert.equal(
    exampleScenario.completion.prerequisiteGroups[0].allOf[0].kind === "turn" &&
      exampleScenario.completion.prerequisiteGroups[0].allOf[0].atTurn,
    20,
  );
  const bundledInitial = initializeScenario(exampleScenario);
  for (const { turn, values, expected } of [
    {
      turn: 1,
      values: {
        "mission-reach": 0.7,
        "financial-stability": 0.6,
        "congregational-cohesion": 0.65,
      },
      expected: "expansion",
    },
    { turn: 20, values: {}, expected: "preservation" },
    {
      turn: 20,
      values: { "worship-participation": 0.65, "member-retention": 0.65 },
      expected: "revival",
    },
    {
      turn: 20,
      values: { "financial-stability": 0.1 },
      expected: "unresolved-crisis",
    },
  ]) {
    const nodes = { ...bundledInitial.nodes };
    for (const [id, value] of Object.entries(values))
      nodes[id] = { ...nodes[id], value };
    assert.equal(
      evaluateEnding(exampleScenario, { ...bundledInitial, turn, nodes })
        ?.endingId,
      expected,
    );
  }
}

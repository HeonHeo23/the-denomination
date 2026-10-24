import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import {
  initializeScenario,
  executeCommand,
  type HistoryEntry,
  type ScenarioDefinition,
  type SimulationState,
} from "../../src/simulation";
import { projectChronicle } from "../../src/ui/game/projectChronicle";
import { getTurnEventIds, projectEvent } from "../../src/ui/game/projectEvent";
import { ongoingCompletion } from "../simulation/fixtures";

export function runChronicleProjectionTests() {
  const initial = initializeScenario(exampleScenario);
  const stance = exampleScenario.nodes.find((node) => node.type === "stance")!;
  const situation = exampleScenario.nodes.find(
    (node) => node.type === "situation",
  )!;
  const resource = exampleScenario.nodes.find(
    (node) => node.type === "resource",
  )!;
  const node = { ...stance, id: "stance:with:colons" };
  const consequence = {
    kind: "resource" as const,
    target: resource.id,
    amount: 7,
  };
  const dilemma = {
    ...exampleScenario.dilemmas[0],
    id: "dilemma:choice:complex",
    choices: exampleScenario.dilemmas[0].choices.map((choice) => ({
      ...choice,
      consequences: [consequence],
    })),
  };
  const event = {
    ...exampleScenario.events[0],
    id: "event:with:colons",
    consequences: [consequence],
  };
  const crisis = {
    ...exampleScenario.gameOvers[0],
    id: "crisis:with:colons",
    stages: [
      {
        id: "stage:with:colons",
        atTurn: 1,
        title: "Stage",
        description: "Stage description",
        consequences: [consequence],
      },
    ],
    recovery: {
      title: "Recovered",
      description: "Recovered description",
      consequences: [consequence],
    },
  };
  const scenario: ScenarioDefinition = {
    ...exampleScenario,
    start: { ...exampleScenario.start, turn: 4, year: 2000 },
    nodes: [...exampleScenario.nodes, node],
    dilemmas: [dilemma],
    events: [event],
    gameOvers: [crisis],
  };
  const saved = {
    turn: 5,
    title: "Recorded title, unrelated to content names",
    detail: "Saved detail",
  };
  const history: HistoryEntry[] = [
    {
      ...saved,
      id: "stance-record",
      turn: 4,
      kind: "stance",
      definitionId: node.id,
      action: "repeal",
    },
    {
      ...saved,
      id: "event-record",
      kind: "event",
      definitionId: event.id,
      triggerCount: 1,
    },
    {
      ...saved,
      id: "event-change",
      kind: "consequence",
      sourceHistoryId: "event-record",
      consequenceIndex: 0,
    },
    {
      ...saved,
      id: "dilemma-record",
      kind: "dilemma",
      definitionId: dilemma.id,
      choiceId: dilemma.choices[0].id,
    },
    {
      ...saved,
      id: "dilemma-change",
      kind: "consequence",
      sourceHistoryId: "dilemma-record",
      consequenceIndex: 0,
    },
    {
      ...saved,
      id: "situation-record",
      kind: "situation",
      definitionId: situation.id,
      transition: "stop",
    },
    {
      ...saved,
      id: "crisis-record",
      kind: "crisis",
      definitionId: crisis.id,
      transition: "stage",
      stageId: crisis.stages[0].id,
    },
    {
      ...saved,
      id: "crisis-change",
      kind: "consequence",
      sourceHistoryId: "crisis-record",
      consequenceIndex: 0,
    },
    {
      ...saved,
      id: "recovery-record",
      turn: 6,
      kind: "crisis",
      definitionId: crisis.id,
      transition: "recovery",
    },
    {
      ...saved,
      id: "recovery-change",
      turn: 6,
      kind: "consequence",
      sourceHistoryId: "recovery-record",
      consequenceIndex: 0,
    },
    {
      ...saved,
      id: "game-over-record",
      turn: 7,
      kind: "game-over",
      definitionId: crisis.id,
      episode: 2,
    },
    {
      ...saved,
      id: "ending-record",
      turn: 7,
      kind: "ending",
      definitionId: scenario.completion.fallbackEnding.id,
    },
    {
      ...saved,
      id: "orphan-change",
      turn: 7,
      kind: "consequence",
      sourceHistoryId: "missing",
      consequenceIndex: 0,
    },
  ];
  const state: SimulationState = {
    ...initial,
    turn: 7,
    year: 2003,
    nodes: {
      ...initial.nodes,
      [node.id]: { ...initial.nodes[stance.id], isActive: false },
    },
    history,
    gameOverProgress: {
      [crisis.id]: {
        episode: 2,
        consecutiveTurns: crisis.turnsToGameOver,
        matchedPrerequisiteGroupIds: [],
      },
    },
    outcome: {
      kind: "ending",
      turn: 7,
      endingId: scenario.completion.fallbackEnding.id,
      usedFallback: true,
      matchedTriggerIds: [],
      matchedPrerequisiteGroupIds: [],
    },
  };
  const eventView = projectEvent(scenario, state, "event-record");
  assert.equal(eventView?.definition.id, event.id);
  assert.equal(eventView?.triggerCount, 1);
  assert.equal(eventView?.changes[0].amount, consequence.amount);
  assert.deepEqual(getTurnEventIds(scenario, state, 5), ["event-record"]);
  const before = structuredClone(state);
  const groups = projectChronicle(scenario, state);
  assert.deepEqual(
    groups.map(({ dateLabel }) => dateLabel),
    ["Year 2003", "Year 2002", "Year 2001", "Year 2000"],
  );
  const peers = groups.flatMap(({ records }) => records);
  const records = peers.flatMap((record) => [record, ...record.changes]);
  assert.deepEqual(
    peers.map(({ entry }) => entry.id),
    [...history]
      .reverse()
      .filter((_, index) => ![2, 4, 7, 9].includes(history.length - 1 - index))
      .map(({ id }) => id),
  );
  assert.equal(
    new Set(records.map(({ entry }) => entry.id)).size,
    history.length,
  );
  const record = (id: string) => records.find(({ entry }) => entry.id === id)!;
  assert.deepEqual(
    [0, 1, 3, 6, 8, 11].map((index) => record(history[index].id).typeId),
    [
      "stance-repeal",
      "event",
      "dilemma",
      "crisis-stage",
      "crisis-recovery",
      "ending",
    ],
  );
  assert.deepEqual(record(history[0].id).target, { kind: "node", id: node.id });
  assert.deepEqual(record(history[1].id).target, {
    kind: "event",
    id: history[1].id,
  });
  assert.deepEqual(record(history[3].id).target, {
    kind: "dilemma",
    id: history[3].id,
  });
  assert.equal(
    record(history[3].id).decision?.choiceLabel,
    dilemma.choices[0].label,
  );
  assert.equal(
    record(history[3].id).decision?.choiceDescription,
    dilemma.choices[0].description,
  );
  assert.deepEqual(record(history[5].id).target, {
    kind: "node",
    id: situation.id,
  });
  for (const index of [6, 8])
    assert.deepEqual(record(history[index].id).target, {
      kind: "crisis",
      id: crisis.id,
    });
  for (const index of [2, 4, 7, 9])
    assert.deepEqual(record(history[index].id).target, {
      kind: "node",
      id: resource.id,
    });
  assert.equal(record(history[10].id).target, undefined);
  assert.deepEqual(record(history[11].id).target, { kind: "report" });
  assert.equal(record(history[12].id).target, undefined);
  assert.deepEqual(state, before);
  assert.deepEqual(
    projectChronicle(scenario, JSON.parse(JSON.stringify(state))),
    groups,
  );
  assert.deepEqual(projectChronicle(scenario, { ...state, history: [] }), []);
  assert.equal(
    projectChronicle({ ...scenario, start: { turn: 4 } }, state)[0].dateLabel,
    "Turn 7",
  );

  const terminal = projectChronicle(scenario, {
    ...state,
    outcome: {
      kind: "game-over",
      turn: 7,
      causes: [{ gameOverId: crisis.id, matchedPrerequisiteGroupIds: [] }],
    },
  }).flatMap(({ records }) => records);
  assert.deepEqual(
    terminal.find(({ entry }) => entry.kind === "game-over")?.target,
    { kind: "report" },
  );
  assert.equal(
    terminal.find(({ entry }) => entry.kind === "ending")?.target,
    undefined,
  );
  const missing = projectChronicle(
    { ...scenario, nodes: [], events: [], dilemmas: [], gameOvers: [] },
    { ...state, outcome: null },
  ).flatMap(({ records }) => records);
  assert(missing.every(({ target }) => target === undefined));
  const changed = projectChronicle(scenario, {
    ...state,
    history: history.map((entry) =>
      entry.kind === "dilemma"
        ? { ...entry, detail: "A historical response no longer in content" }
        : entry,
    ),
  }).flatMap(({ records }) => records);
  assert.equal(
    changed.find(({ entry }) => entry.kind === "dilemma")?.decision
      ?.choiceLabel,
    dilemma.choices[0].label,
  );
  assert.ok(
    changed
      .find(({ entry }) => entry.kind === "dilemma")
      ?.changes.some(({ entry }) => entry.id === history[4].id),
  );

  const eventChange = history[2];
  assert.ok(eventChange.kind === "consequence");
  const unresolved = {
    ...state,
    outcome: null,
    history: [
      history[1],
      history[0],
      { ...eventChange, id: "missing-parent", sourceHistoryId: "missing" },
      { ...eventChange, id: "wrong-turn", turn: 6 },
      { ...eventChange, id: "wrong-index", consequenceIndex: 99 },
      {
        ...eventChange,
        id: "wrong-parent-kind",
        sourceHistoryId: history[0].id,
      },
    ],
  };
  assert(
    projectChronicle(scenario, unresolved)
      .flatMap(({ records }) => records)
      .filter(({ entry }) => entry.kind === "consequence")
      .every(
        ({ target, applied, sourceHistoryId }) =>
          !target && !applied && !sourceHistoryId,
      ),
  );

  const ambiguousScenario = {
    ...scenario,
    gameOvers: [
      crisis,
      {
        ...crisis,
        id: `${crisis.id}:stage`,
        stages: [{ ...crisis.stages[0], id: "with:colons" }],
      },
    ],
  };
  const ambiguous = projectChronicle(ambiguousScenario, state).flatMap(
    ({ records }) => records,
  );
  assert.deepEqual(
    ambiguous.find(({ entry }) => entry.id === history[6].id)?.target,
    { kind: "crisis", id: crisis.id },
  );
  assert.equal(
    ambiguous.find(({ entry }) => entry.id === history[6].id)?.changes[0].entry
      .id,
    history[7].id,
  );

  // Actual engine commands must also link after a starting-turn save round trip.
  const playable = { ...exampleScenario, completion: ongoingCompletion };
  const start = initializeScenario(playable);
  const command = executeCommand(playable, start, {
    type: "set-stance",
    stanceId: stance.id,
    value: initial.nodes[stance.id].value === 0 ? 0.1 : 0,
  });
  assert.equal(command.isAccepted, true);
  const restored = JSON.parse(JSON.stringify(command.state)) as SimulationState;
  assert.deepEqual(projectChronicle(playable, restored)[0].records[0].target, {
    kind: "node",
    id: stance.id,
  });
}

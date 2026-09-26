import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  validateScenario,
  type DilemmaDefinition,
  type ScenarioDefinition,
} from "../../src/simulation";

const makeDilemma = (id: string, amount: number): DilemmaDefinition => ({
  kind: "dilemma",
  id,
  title: id,
  description: "A decision is required.",
  influences: [{ source: "centralization", coefficient: 1 }],
  threshold: 0.5,
  cooldownTurns: 2,
  requires: ["has-general-assembly"],
  choices: [
    {
      id: "accept",
      label: "Accept",
      description: "Accept the proposal.",
      consequences: [{ kind: "resource", target: "authority", amount }],
    },
    {
      id: "decline",
      label: "Decline",
      description: "Decline the proposal.",
      consequences: [],
    },
  ],
});

export function runDilemmaTests() {
  const raisedCentralization = executeCommand(
    exampleScenario,
    initializeScenario(exampleScenario),
    { type: "set-stance", stanceId: "centralization", value: 1 },
  );
  assert.equal(raisedCentralization.accepted, true);
  let exampleTurn = raisedCentralization.state;
  for (
    let index = 0;
    index < 5 && !exampleTurn.pendingDilemmaIds.length;
    index += 1
  )
    exampleTurn = advanceTurn(exampleScenario, exampleTurn).state;
  assert.ok(
    exampleTurn.pendingDilemmaIds.includes("assembly-governance-dispute"),
    "The bundled governance Dilemma must be reachable through play",
  );

  const scenario: ScenarioDefinition = {
    ...exampleScenario,
    gameOvers: [],
    dilemmas: [
      makeDilemma("first-decision", 2),
      makeDilemma("second-decision", 3),
    ],
  };
  assert.deepEqual(validateScenario(scenario), []);
  const initial = initializeScenario(scenario);
  const first = advanceTurn(scenario, initial, 0.2).state;
  assert.deepEqual(first.pendingDilemmaIds, [
    "first-decision",
    "second-decision",
  ]);
  assert.equal(first.dilemmas["first-decision"].triggerCount, 1);
  assert.strictEqual(
    advanceTurn(scenario, first).state,
    first,
    "Pending decisions block the next turn",
  );

  const rejected = executeCommand(scenario, first, {
    type: "resolve-dilemma",
    dilemmaId: "first-decision",
    choiceId: "missing",
  });
  assert.equal(rejected.accepted, false);
  assert.strictEqual(rejected.state, first);
  const secondResolved = executeCommand(scenario, first, {
    type: "resolve-dilemma",
    dilemmaId: "second-decision",
    choiceId: "accept",
  });
  assert.equal(secondResolved.accepted, true);
  assert.deepEqual(secondResolved.state.pendingDilemmaIds, ["first-decision"]);
  assert.equal(
    secondResolved.state.nodes.authority.value,
    first.nodes.authority.value + 3,
  );
  assert.equal(
    secondResolved.state.nodeValueHistory.at(-1)?.values.authority.value,
    secondResolved.state.nodes.authority.value,
  );
  const firstResolved = executeCommand(scenario, secondResolved.state, {
    type: "resolve-dilemma",
    dilemmaId: "first-decision",
    choiceId: "accept",
  });
  assert.equal(firstResolved.accepted, true);
  assert.deepEqual(firstResolved.state.pendingDilemmaIds, []);
  assert.equal(
    firstResolved.state.nodes.authority.value,
    first.nodes.authority.value + 5,
  );
  assert.equal(
    executeCommand(scenario, firstResolved.state, {
      type: "resolve-dilemma",
      dilemmaId: "first-decision",
      choiceId: "accept",
    }).accepted,
    false,
  );

  const frozenScenario: ScenarioDefinition = {
    ...scenario,
    dilemmas: [
      makeDilemma("first-decision", -100),
      {
        ...makeDilemma("second-decision", 1),
        influences: [{ source: "authority", coefficient: 1 }],
        threshold: 1,
      },
    ],
  };
  const frozenQueue = advanceTurn(
    frozenScenario,
    initializeScenario(frozenScenario),
  ).state;
  assert.equal(frozenQueue.pendingDilemmaIds.length, 2);
  const drainedAuthority = executeCommand(frozenScenario, frozenQueue, {
    type: "resolve-dilemma",
    dilemmaId: "first-decision",
    choiceId: "accept",
  }).state;
  assert.equal(drainedAuthority.nodes.authority.value, 0);
  assert.deepEqual(
    drainedAuthority.pendingDilemmaIds,
    ["second-decision"],
    "A choice cannot retract another Dilemma captured at year end",
  );

  const turnTwo = advanceTurn(scenario, firstResolved.state).state;
  const turnThree = advanceTurn(scenario, turnTwo).state;
  assert.deepEqual(turnTwo.pendingDilemmaIds, []);
  assert.deepEqual(turnThree.pendingDilemmaIds, []);
  const turnFour = advanceTurn(scenario, turnThree).state;
  assert.deepEqual(turnFour.pendingDilemmaIds, [
    "first-decision",
    "second-decision",
  ]);
  assert.equal(turnFour.dilemmas["first-decision"].triggerCount, 2);

  const missingTag = { ...scenario, conditions: [] };
  assert.deepEqual(
    advanceTurn(missingTag, initializeScenario(missingTag)).state
      .pendingDilemmaIds,
    [],
  );
  const lowScore = {
    ...scenario,
    dilemmas: [{ ...makeDilemma("low-score", 1), threshold: 0.9 }],
  };
  assert.deepEqual(
    advanceTurn(lowScore, initializeScenario(lowScore)).state.pendingDilemmaIds,
    [],
  );
  const randomScenario = {
    ...scenario,
    dilemmas: [
      {
        ...makeDilemma("random-decision", 1),
        influences: [{ source: "_random_" as const, coefficient: 1 }],
      },
    ],
  };
  assert.deepEqual(
    advanceTurn(randomScenario, initializeScenario(randomScenario), 0.2).state
      .pendingDilemmaIds,
    [],
  );
  assert.deepEqual(
    advanceTurn(randomScenario, initializeScenario(randomScenario), 0.8).state
      .pendingDilemmaIds,
    ["random-decision"],
  );
  assert.throws(
    () => advanceTurn(randomScenario, initializeScenario(randomScenario)),
    RangeError,
  );
  assert.throws(
    () => advanceTurn(randomScenario, initializeScenario(randomScenario), 1),
    RangeError,
  );

  const invalid = {
    ...scenario,
    dilemmas: [makeDilemma("duplicate", 1), makeDilemma("duplicate", 2)],
  };
  assert.ok(
    validateScenario(invalid).some((message) =>
      message.includes("duplicate Dilemma identifier"),
    ),
  );
  assert.ok(
    validateScenario({
      ...scenario,
      dilemmas: [{ ...makeDilemma("bad-choice", 1), choices: [] }],
    }).some((message) => message.includes("at least two choices")),
  );
  const terminalScenario: ScenarioDefinition = {
    ...scenario,
    gameOvers: [
      {
        id: "inevitable-loss",
        title: "Inevitable loss",
        prerequisiteGroups: [
          {
            id: "always",
            title: "Always",
            allOf: [
              {
                kind: "node-value",
                nodeId: "centralization",
                comparison: "at-least",
                value: 0,
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
            description: "Warning.",
          },
        ],
        report: { title: "Loss", narrative: "The game ended." },
      },
    ],
  };
  const warning = advanceTurn(
    terminalScenario,
    initializeScenario(terminalScenario),
  ).state;
  const cleared = warning.pendingDilemmaIds.reduce(
    (current, dilemmaId) =>
      executeCommand(terminalScenario, current, {
        type: "resolve-dilemma",
        dilemmaId,
        choiceId: "decline",
      }).state,
    warning,
  );
  const terminal = advanceTurn(terminalScenario, cleared).state;
  assert.equal(terminal.outcome?.kind, "game-over");
  assert.deepEqual(
    terminal.pendingDilemmaIds,
    [],
    "Terminal Game Over prevents Dilemmas from queueing",
  );
  assert.strictEqual(advanceTurn(terminalScenario, terminal).state, terminal);
}

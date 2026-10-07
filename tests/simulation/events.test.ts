import { ongoingCompletion } from "./fixtures";
import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  initializeScenario,
  validateScenario,
  type EventDefinition,
  type ScenarioDefinition,
} from "../../src/simulation";
import {
  projectTurnReport,
  serializeTurnReport,
  restoreTurnReport,
} from "../../src/ui/panels/projectReport";

const resourceEvent = (id: string, amount: number): EventDefinition => ({
  kind: "event",
  id,
  title: id,
  description: `${id} occurred.`,
  influences: [{ source: "centralization", coefficient: 1 }],
  threshold: 0,
  cooldownTurns: 2,
  consequences: [{ kind: "resource", target: "authority", amount }],
});

export function runEventTests() {
  const scenario: ScenarioDefinition = {
    ...exampleScenario,
    completion: ongoingCompletion,
    gameOvers: [],
    dilemmas: [],
    events: [resourceEvent("second", 3), resourceEvent("first", -2)],
  };
  assert.deepEqual(validateScenario(scenario), []);
  const initial = initializeScenario(scenario);
  const first = advanceTurn(scenario, initial, 0.2).state;
  assert.equal(first.events.first.triggerCount, 1);
  assert.equal(first.events.second.triggerCount, 1);
  assert.deepEqual(
    first.history
      .filter(({ kind }) => kind === "event")
      .map(({ title }) => title),
    ["first", "second"],
  );
  assert.equal(
    first.nodes.authority.value!,
    first.nodeValueHistory[first.turn].authority.value,
  );
  const report = projectTurnReport(scenario, initial, first);
  assert.deepEqual(
    report.events.map(({ id }) => id),
    ["first", "second"],
  );
  assert.deepEqual(
    restoreTurnReport(scenario, serializeTurnReport(report)).events.map(
      ({ id }) => id,
    ),
    ["first", "second"],
  );
  const second = advanceTurn(scenario, first, 0.2).state;
  const third = advanceTurn(scenario, second, 0.2).state;
  assert.equal(third.events.first.triggerCount, 1);
  assert.equal(
    advanceTurn(scenario, third, 0.2).state.events.first.triggerCount,
    2,
  );

  const reversed = { ...scenario, events: [...scenario.events!].reverse() };
  const reversedTurn = advanceTurn(
    reversed,
    initializeScenario(reversed),
    0.2,
  ).state;
  assert.deepEqual(reversedTurn.nodes, first.nodes);
  assert.deepEqual(reversedTurn.history, first.history);

  const random = {
    ...scenario,
    events: [
      {
        ...resourceEvent("chance", 4),
        influences: [{ source: "_random_" as const, coefficient: 1 }],
        threshold: 0.5,
      },
    ],
  };
  assert.equal(
    advanceTurn(random, initializeScenario(random), 0.2).state.events.chance
      .triggerCount,
    0,
  );
  assert.equal(
    advanceTurn(random, initializeScenario(random), 0.8).state.events.chance
      .triggerCount,
    1,
  );
  assert.throws(
    () => advanceTurn(random, initializeScenario(random)),
    RangeError,
  );
  const sharedRandom = {
    ...random,
    dilemmas: [
      {
        ...exampleScenario.dilemmas[0],
        influences: [{ source: "_random_" as const, coefficient: 1 }],
        threshold: 0.5,
      },
    ],
  };
  const sharedLow = advanceTurn(
    sharedRandom,
    initializeScenario(sharedRandom),
    0.2,
  ).state;
  const sharedHigh = advanceTurn(
    sharedRandom,
    initializeScenario(sharedRandom),
    0.8,
  ).state;
  assert.equal(sharedLow.events.chance.triggerCount, 0);
  assert.deepEqual(sharedLow.pendingDilemmaIds, []);
  assert.equal(sharedHigh.events.chance.triggerCount, 1);
  assert.equal(sharedHigh.pendingDilemmaIds.length, 1);

  const mixed = {
    ...scenario,
    dilemmas: [{ ...exampleScenario.dilemmas[0], threshold: -1 }],
  };
  const mixedTurn = advanceTurn(mixed, initializeScenario(mixed), 0.2).state;
  assert.equal(mixedTurn.pendingDilemmaIds.length, 1);
  assert.equal(mixedTurn.events.first.triggerCount, 1);
  const snapshotScenario = {
    ...scenario,
    events: [resourceEvent("drain-authority", -100)],
    dilemmas: [
      {
        ...exampleScenario.dilemmas[0],
        influences: [{ source: "authority", coefficient: 1 }],
        threshold: 1,
      },
    ],
  };
  const snapshotTurn = advanceTurn(
    snapshotScenario,
    initializeScenario(snapshotScenario),
    0.2,
  ).state;
  assert.ok(snapshotTurn.nodes.authority.value! < 0);
  assert.equal(snapshotTurn.pendingDilemmaIds.length, 1);

  assert.ok(
    validateScenario({
      ...scenario,
      events: [resourceEvent("same", 1), resourceEvent("same", 2)],
    }).some((error) => error.includes("duplicate Event")),
  );
  assert.ok(
    validateScenario({
      ...scenario,
      events: [{ ...resourceEvent("bad", 1), cooldownTurns: 0 }],
    }).some((error) => error.includes("cooldownTurns")),
  );
  assert.ok(
    validateScenario({
      ...scenario,
      events: [
        {
          ...resourceEvent("bad", 1),
          consequences: [
            { kind: "resource", target: "centralization", amount: 1 },
          ],
        },
      ],
    }).some((error) => error.includes("Resource")),
  );

  const terminalScenario: ScenarioDefinition = {
    ...exampleScenario,
    completion: ongoingCompletion,
    events: [resourceEvent("terminal-test", 2)],
    dilemmas: [],
  };
  const terminal = initializeScenario(terminalScenario);
  const alreadyTerminal = {
    ...terminal,
    outcome: {
      kind: "game-over" as const,
      turn: terminal.turn,
      causes: [
        {
          gameOverId: "loss-of-connectional-mandate",
          matchedPrerequisiteGroupIds: [],
        },
      ],
    },
  };
  assert.strictEqual(
    advanceTurn(terminalScenario, alreadyTerminal).state,
    alreadyTerminal,
  );
  const endingScenario: ScenarioDefinition = {
    ...scenario,
    events: [resourceEvent("ending-event", 1)],
    gameOvers: [
      {
        id: "inevitable",
        title: "Inevitable",
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
        report: { title: "End", narrative: "The game ended." },
      },
    ],
  };
  const warning = advanceTurn(
    endingScenario,
    initializeScenario(endingScenario),
    0.2,
  ).state;
  const readyToFire = {
    ...warning,
    events: { "ending-event": { lastTriggerTurn: null, triggerCount: 0 } },
  };
  const ending = advanceTurn(endingScenario, readyToFire, 0.2).state;
  assert.equal(ending.outcome?.kind, "game-over");
  assert.equal(ending.events["ending-event"].triggerCount, 0);
}

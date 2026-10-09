import assert from "node:assert/strict";
import { ongoingCompletion } from "../simulation/fixtures";
import { exampleScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type ConsequenceDefinition,
  type SimulationState,
} from "../../src/simulation";
import {
  projectDilemmaConsequences,
  projectDilemmaDecisions,
  projectPendingDilemmas,
} from "../../src/ui/game/projectDilemma";

export function runDilemmaConsequenceProjectionTests() {
  const group = exampleScenario.factionGroups[0];
  const [firstMetric, secondMetric] = exampleScenario.factionMetrics;
  const resource = exampleScenario.nodes.find(
    ({ type }) => type === "resource",
  )!;
  const situation = exampleScenario.nodes.find(
    ({ type }) => type === "situation",
  )!;
  const consequences: ConsequenceDefinition[] = [
    {
      kind: "grudge",
      target: group.metrics[secondMetric.id],
      magnitude: -0.1,
      decay: 0.8,
      label: "Opposition",
    },
    { kind: "resource", target: resource.id, amount: 2 },
    {
      kind: "grudge",
      target: group.metrics[firstMetric.id],
      magnitude: 0.2,
      decay: 0.8,
      label: "Support",
    },
    {
      kind: "grudge",
      target: group.metrics[firstMetric.id],
      magnitude: -0.05,
      decay: 0.9,
      label: "Concern",
    },
    { kind: "activation", target: situation.id, active: true },
    { kind: "activation", target: situation.id, active: false },
  ];
  const before = structuredClone(consequences);
  const rows = projectDilemmaConsequences(exampleScenario, consequences);
  assert.deepEqual(
    rows.map(({ metric }) => metric?.label),
    [
      firstMetric.label,
      undefined,
      firstMetric.label,
      secondMetric.label,
      undefined,
      undefined,
    ],
  );
  assert.deepEqual(
    rows.map(({ consequence }) => consequence),
    [
      consequences[2],
      consequences[1],
      consequences[3],
      consequences[0],
      consequences[4],
      consequences[5],
    ],
  );
  assert.equal(rows[0].consequence, consequences[2]);
  assert.equal(rows[1].domain, resource.domain);
  assert.equal(
    projectDilemmaConsequences(exampleScenario, [
      { kind: "resource", target: resource.id, amount: 0 },
    ])[0].valueLabel,
    "0.0",
  );
  assert.equal(rows[0].name, group.name);
  assert.equal(rows[0].metric?.id, firstMetric.id);
  assert.equal(rows[0].metric, firstMetric);
  assert.equal(rows[0].valueLabel, "+20.0%");
  assert.equal(rows[0].kindLabel, "Temporary pressure");
  assert.equal(rows[1].name, resource.name);
  assert.equal(rows[1].valueLabel, "+2.0");
  assert.equal(rows[1].kindLabel, "Resource change");
  assert.equal(rows[2].valueLabel, "-5.0%");
  assert.equal(rows[3].valueLabel, "-10.0%");
  assert.equal(rows[4].valueLabel, "Activated");
  assert.equal(rows[5].valueLabel, "Deactivated");
  assert.equal(rows[4].kindLabel, "Activation change");
  assert.ok(
    rows.every((row) => !("groupId" in row) && !("metricOrder" in row)),
  );
  assert.equal(
    projectDilemmaConsequences(exampleScenario, [
      { kind: "resource", target: resource.id, amount: -2 },
    ])[0].valueLabel,
    "-2.0",
  );
  assert.equal(rows.length, consequences.length);
  assert.deepEqual(consequences, before);
  assert.deepEqual(projectDilemmaConsequences(exampleScenario, []), []);
  const reversed = {
    ...exampleScenario,
    factionMetrics: [...exampleScenario.factionMetrics].reverse(),
  };
  assert.equal(
    projectDilemmaConsequences(reversed, consequences)[0].metric?.label,
    secondMetric.label,
  );
}

export function runDilemmaDecisionProjectionTests() {
  const definition = {
    ...exampleScenario.dilemmas[0],
    threshold: -1,
    cooldownTurns: 1,
  };
  const scenario = {
    ...exampleScenario,
    completion: ongoingCompletion,
    events: [],
    gameOvers: [],
    dilemmas: [definition],
  };
  const initial = initializeScenario(scenario);
  assert.deepEqual(projectDilemmaDecisions(scenario, initial), []);

  const firstTurn = advanceTurn(scenario, initial, 0).state;
  const firstChoice = definition.choices[0];
  const firstResolved = executeCommand(scenario, firstTurn, {
    type: "resolve-dilemma",
    dilemmaId: definition.id,
    choiceId: firstChoice.id,
  });
  assert.equal(firstResolved.accepted, true);
  const secondTurn = advanceTurn(scenario, firstResolved.state, 0).state;
  const thirdTurn = advanceTurn(scenario, secondTurn, 0).state;
  const secondChoice = definition.choices[1];
  const secondResolved = executeCommand(scenario, thirdTurn, {
    type: "resolve-dilemma",
    dilemmaId: definition.id,
    choiceId: secondChoice.id,
  });
  assert.equal(secondResolved.accepted, true);

  const restored = JSON.parse(
    JSON.stringify({
      ...secondResolved.state,
      history: [
        ...secondResolved.state.history,
        {
          id: "unrelated",
          turn: thirdTurn.turn,
          kind: "stance",
          title: "Unrelated action",
          detail: "Not a decision.",
        },
      ],
    }),
  ) as SimulationState;
  const decisions = projectDilemmaDecisions(scenario, restored);
  assert.equal(decisions.length, 2);
  assert.deepEqual(
    decisions.map(({ turn, year, choiceLabel, choiceDescription }) => ({
      turn,
      year,
      choiceLabel,
      choiceDescription,
    })),
    [
      {
        turn: 3,
        year: 1983,
        choiceLabel: secondChoice.label,
        choiceDescription: secondChoice.description,
      },
      {
        turn: 1,
        year: 1981,
        choiceLabel: firstChoice.label,
        choiceDescription: firstChoice.description,
      },
    ],
  );
  assert.equal(decisions[0].title, definition.title);
  assert.equal(
    projectDilemmaDecisions(
      { ...scenario, start: { turn: scenario.start.turn } },
      restored,
    )[0].year,
    undefined,
  );
}

export function runPendingDilemmaProjectionTests() {
  const [first, second] = exampleScenario.dilemmas;
  const state = { pendingDilemmaIds: [second.id, "unavailable", first.id] };
  const before = structuredClone(state);
  const pending = projectPendingDilemmas(exampleScenario, state);
  assert.deepEqual(
    pending.map(({ id }) => id),
    [second.id, first.id],
  );
  assert.equal(pending[0], second);
  assert.equal(pending[1], first);
  assert.deepEqual(state, before);
  assert.deepEqual(
    projectPendingDilemmas(exampleScenario, { pendingDilemmaIds: [] }),
    [],
  );
  assert.deepEqual(
    projectPendingDilemmas({ ...exampleScenario, dilemmas: undefined }, state),
    [],
  );
}

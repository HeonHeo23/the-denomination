import { ongoingCompletion } from "../simulation/fixtures";
import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type SimulationState,
} from "../../src/simulation";
import { projectDilemmaDecisions } from "../../src/ui/game/projectDilemmaDecisions";

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

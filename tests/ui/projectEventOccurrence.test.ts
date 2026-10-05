import { ongoingCompletion } from "../simulation/fixtures";
import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import { advanceTurn, initializeScenario } from "../../src/simulation";
import {
  eventOccurrenceIdsForTurn,
  projectEventOccurrence,
} from "../../src/ui/game/projectEventOccurrence";
import {
  beginAutomaticEvents,
  closeEventPresentation,
} from "../../src/ui/game/eventDialogFlow";

export function runEventDetailTests() {
  const scenario = {
    ...exampleScenario,
    completion: ongoingCompletion,
    dilemmas: [],
    gameOvers: [],
    events: [
      {
        ...exampleScenario.events[1],
        id: "z-large-gift",
        threshold: 0,
        consequences: [
          { kind: "resource" as const, target: "money", amount: 100 },
        ],
      },
      {
        ...exampleScenario.events[0],
        id: "a-petition",
      },
    ],
  };
  const initial = initializeScenario(scenario);
  const first = advanceTurn(scenario, initial, 0.8).state;
  const ids = eventOccurrenceIdsForTurn(scenario, first, first.turn);
  assert.deepEqual(ids, ["a-petition:event:1", "z-large-gift:event:1"]);

  const gift = projectEventOccurrence(scenario, first, ids[1]);
  assert.ok(gift);
  assert.equal(gift.definition.title, "An unexpected bequest arrives");
  assert.equal(gift.year, 1981);
  assert.equal(gift.consequences.length, 1);
  assert.equal(gift.consequences[0].target?.id, "money");
  assert.equal(gift.consequences[0].endOfTurnValue, first.nodes.money.value);
  assert.equal(gift.consequences[0].kind, "resource");
  const applied = first.history.find(
    (entry) => entry.id === `${ids[1]}:consequence:0`,
  );
  assert.equal(gift.consequences[0].detail, applied?.detail);
  assert.equal(gift.consequences[0].detail, "Resource balance changed by 100.");
  assert.equal(
    gift.consequences[0].appliedAmount,
    Number(applied?.detail.match(/changed by (-?\d+(?:\.\d+)?)/)?.[1]),
  );

  const petition = projectEventOccurrence(scenario, first, ids[0]);
  assert.equal(petition?.consequences[1].kind, "grudge");
  assert.equal(petition?.consequences[1].appliedAmount, -0.02);

  const second = advanceTurn(scenario, first, 0.2).state;
  const historical = projectEventOccurrence(scenario, second, ids[1]);
  assert.equal(
    historical?.consequences[0].endOfTurnValue,
    first.nodes.money.value,
  );
  assert.deepEqual(
    eventOccurrenceIdsForTurn(scenario, second, second.turn),
    [],
  );
  assert.equal(
    projectEventOccurrence(scenario, second, "missing:event:1"),
    undefined,
  );

  const firstPresentation = beginAutomaticEvents(ids);
  assert.ok(firstPresentation);
  const next = closeEventPresentation(firstPresentation);
  assert.deepEqual(next.next, { mode: "automatic", ids, index: 1 });
  assert.deepEqual(closeEventPresentation(next.next!), { returnTo: "report" });
  assert.equal(beginAutomaticEvents([]), undefined);
  assert.deepEqual(
    closeEventPresentation({
      mode: "manual",
      id: ids[0],
      returnTo: "chronicle",
    }),
    { returnTo: "chronicle" },
  );
}

import { ongoingCompletion } from "../simulation/fixtures";
import assert from "node:assert/strict";
import { exampleScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  initializeScenario,
  type ScenarioDefinition,
} from "../../src/simulation";
import { getTurnEventIds, projectEvent } from "../../src/ui/game/projectEvent";
import { projectChronicle } from "../../src/ui/game/projectChronicle";
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
  const ids = getTurnEventIds(scenario, first, first.turn);
  assert.deepEqual(ids, ["a-petition:event:1", "z-large-gift:event:1"]);

  const gift = projectEvent(scenario, first, ids[1]);
  assert.ok(gift);
  assert.equal(gift.definition.title, "An unexpected bequest arrives");
  assert.equal(gift.year, 1981);
  assert.equal(gift.changes.length, 1);
  assert.equal(gift.changes[0].nodeId, "money");
  assert.equal(gift.changes[0].name, "Money");
  assert.deepEqual(
    gift.changes[0].domain,
    scenario.nodes.find((n) => n.id === "money")!.domain,
  );
  assert.equal(gift.changes[0].category, "resource");
  const applied = first.history.find(
    (entry) => entry.id === `${ids[1]}:consequence:0`,
  );
  assert.equal(applied?.detail, "Resource balance changed by 100.");
  assert.equal(gift.changes[0].amount, 100);

  const petition = projectEvent(scenario, first, ids[0]);
  assert.ok(petition);
  assert.equal(petition.changes[1].nodeId, "leadership-trust");
  assert.equal(petition.changes[1].name, "Leadership Trust");
  assert.equal(petition?.changes[1].category, "grudge");
  assert.equal(petition?.changes[1].amount, -0.02);
  assert.equal(petition?.changes[1].isActive, undefined);

  const second = advanceTurn(scenario, first, 0.2).state;
  const historical = projectEvent(scenario, second, ids[1]);
  assert.equal(historical?.changes[0].amount, gift.changes[0].amount);
  assert.deepEqual(getTurnEventIds(scenario, second, second.turn), []);
  assert.equal(projectEvent(scenario, second, "missing:event:1"), undefined);

  const activationScenario: ScenarioDefinition = {
    ...scenario,
    nodes: scenario.nodes.map((node) =>
      node.id === "clergy-formation"
        ? { ...node, initial: { ...node.initial, isForced: false } }
        : node,
    ),
    events: [
      {
        ...exampleScenario.events[1],
        id: "activate-dialogue",
        threshold: 0.5,
        cooldownTurns: 1,
        consequences: [
          { kind: "activation", target: "ecumenical-dialogue", active: true },
        ],
      },
      {
        ...exampleScenario.events[1],
        id: "deactivate-dialogue",
        cooldownTurns: 1,
        influences: [{ source: "_random_", coefficient: -1, intercept: 1 }],
        threshold: 0.5,
        consequences: [
          { kind: "activation", target: "ecumenical-dialogue", active: false },
          { kind: "activation", target: "clergy-formation", active: false },
          { kind: "resource", target: "money", amount: 2 },
        ],
      },
    ],
  };
  const activationInitial = initializeScenario(activationScenario);
  // Force the node at runtime to exercise the guard on otherwise valid content.
  const forcedInitial = {
    ...activationInitial,
    nodes: {
      ...activationInitial.nodes,
      "clergy-formation": {
        ...activationInitial.nodes["clergy-formation"],
        isForced: true,
      },
    },
  };
  const activated = advanceTurn(activationScenario, forcedInitial, 0.8).state;
  const activation = projectEvent(
    activationScenario,
    activated,
    "activate-dialogue:event:1",
  );
  assert.equal(activated.nodes["ecumenical-dialogue"].isActive, true);
  assert.equal(activation?.changes[0].isActive, true);
  assert.equal(activation?.changes[0].amount, undefined);
  assert.equal(activation?.changes[0].category, "activation");
  assert.equal(activation?.changes[0].nodeId, "ecumenical-dialogue");

  // A matched consequence survives either missing definitions or runtime nodes.
  for (const [content, snapshot, eventId, changeIndex] of [
    [scenario, first, ids[1], 0],
    [scenario, first, ids[0], 1],
    [activationScenario, activated, "activate-dialogue:event:1", 0],
  ] as const) {
    const original = projectEvent(content, snapshot, eventId)!.changes[
      changeIndex
    ];
    const targetId = original.nodeId!;
    for (const [missingContent, missingState] of [
      [
        {
          ...content,
          nodes: content.nodes.filter(({ id }) => id !== targetId),
        },
        snapshot,
      ],
      [
        content,
        {
          ...snapshot,
          nodes: Object.fromEntries(
            Object.entries(snapshot.nodes).filter(([id]) => id !== targetId),
          ),
        },
      ],
    ] as const) {
      const projected = projectEvent(missingContent, missingState, eventId)!;
      assert.deepEqual(projected.changes[changeIndex], {
        ...original,
        nodeId: undefined,
        name: targetId,
        domain: undefined,
        metric: undefined,
      });
      const chronicle = projectChronicle(missingContent, missingState)
        .flatMap(({ records }) => records)
        .find(({ entry }) => entry.id === eventId)!;
      const recorded = chronicle.changes.find(
        ({ entry }) => entry.id === original.id,
      )!;
      assert.ok(recorded.applied);
      assert.equal(recorded.target, undefined);
      assert.equal(
        recorded.entry,
        snapshot.history.find(({ id }) => id === original.id),
      );
    }
  }

  const unmatched = {
    id: `${ids[1]}:consequence:99`,
    kind: "consequence" as const,
    sourceHistoryId: ids[1],
    consequenceIndex: 99,
    turn: first.turn,
    title: "An older consequence",
    detail: "Original detail retained only in Chronicle.",
  };
  const withUnmatched = { ...first, history: [...first.history, unmatched] };
  assert.deepEqual(
    projectEvent(scenario, withUnmatched, ids[1])?.changes,
    gift.changes,
  );
  const withoutAuthoredConsequences = {
    ...scenario,
    events: scenario.events.map((event) => ({ ...event, consequences: [] })),
  };
  assert.deepEqual(
    projectEvent(withoutAuthoredConsequences, withUnmatched, ids[1])?.changes,
    [],
  );
  for (const content of [scenario, withoutAuthoredConsequences]) {
    const records = projectChronicle(content, withUnmatched)
      .flatMap(({ records }) => records)
      .flatMap((record) => [record, ...record.changes]);
    assert.equal(
      records.find(({ entry }) => entry.id === unmatched.id)?.entry,
      unmatched,
    );
    assert.equal(
      records.find(({ entry }) => entry.id === applied?.id)?.entry,
      applied,
    );
    assert.equal(applied?.detail, "Resource balance changed by 100.");
  }

  const deactivated = advanceTurn(activationScenario, activated, 0.2).state;
  const deactivation = projectEvent(
    activationScenario,
    deactivated,
    "deactivate-dialogue:event:1",
  );
  assert.equal(deactivated.nodes["ecumenical-dialogue"].isActive, false);
  assert.equal(deactivation?.changes[0].isActive, false);
  // Forced-active nodes produce no applied deactivation record or badge row.
  assert.equal(deactivated.nodes["clergy-formation"].isActive, true);
  assert.equal(deactivation?.changes.length, 2);
  assert.equal(deactivation?.changes[1].amount, 2);
  assert.deepEqual(
    deactivated.history
      .filter((entry) => entry.kind === "consequence")
      .filter(
        (entry) => entry.sourceHistoryId === "deactivate-dialogue:event:1",
      )
      .map(({ consequenceIndex }) => consequenceIndex),
    [0, 2],
  );
  assert.equal(
    projectEvent(activationScenario, deactivated, "activate-dialogue:event:1")
      ?.changes[0].isActive,
    true,
  );
  const reactivated = advanceTurn(activationScenario, deactivated, 0.8).state;
  assert.equal(reactivated.nodes["ecumenical-dialogue"].isActive, true);
  assert.equal(
    projectEvent(activationScenario, reactivated, "deactivate-dialogue:event:1")
      ?.changes[0].isActive,
    false,
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

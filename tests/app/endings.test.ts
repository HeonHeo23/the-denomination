import assert from "node:assert/strict";
import {
  createGameSession,
  reduceGameSession,
} from "../../src/app/gameSession";
import { loadScenarioCatalog } from "../../src/app/scenarioCatalog";
import { validateSavedGame, type SavedGame } from "../../src/app/persistence";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type ScenarioDefinition,
} from "../../src/simulation";
import { assemblyScenario, endingScenario } from "../simulation/endings.test";
import { resolveEnding } from "../../src/simulation/engine/resolveEnding";
import { projectEndingReport } from "../../src/ui/panels/projectReport";
import { projectGameOverReport } from "../../src/ui/game/projectGameOvers";
import { moveDossierNavigation } from "../../src/ui/game/useDossierNavigation";

export function runEndingPersistenceTests() {
  const scenario = endingScenario();
  const catalog = loadScenarioCatalog([
    { contentVersion: 4, content: scenario },
  ]).entries;
  const state = advanceTurn(scenario, initializeScenario(scenario)).state;
  const save: SavedGame = {
    version: 4,
    scenarioId: scenario.id,
    scenarioContentVersion: 4,
    playerName: "Avery",
    denominationName: "The Fellowship",
    state,
  };
  const restore = (snapshot: unknown, entries = catalog) =>
    validateSavedGame(
      JSON.parse(JSON.stringify({ ...save, state: snapshot })),
      entries,
    );
  assert.ok(restore(state));
  assert.deepEqual(
    projectEndingReport(scenario, restore(state)!.state)?.changes,
    projectEndingReport(scenario, state)?.changes,
  );
  const restored = createGameSession(scenario, save.state);
  assert.ok(restored.ok);
  assert.equal(
    projectEndingReport(restored.scenario, restored.state)?.ending.id,
    "revival",
  );
  assert.deepEqual(
    projectGameOverReport(restored.scenario, restored.state),
    [],
  );
  const rejected = reduceGameSession(restored, {
    type: "advance",
    randomValue: 0,
  });
  assert.ok(rejected.ok);
  assert.strictEqual(rejected.state, restored.state);
  const reset = reduceGameSession(restored, { type: "reset" });
  assert.ok(reset.ok);
  assert.equal(reset.state.turn, 0);
  assert.equal(reset.state.outcome, null);
  const navigation = moveDossierNavigation(
    { reportOpen: true },
    { type: "open-node", nodeId: "health" },
  );
  assert.equal(navigation.reportOpen, true);
  assert.equal(
    moveDossierNavigation(navigation, { type: "close-node" }).reportOpen,
    true,
  );
  assert.equal(
    moveDossierNavigation(navigation, { type: "review-final-state" })
      .reportOpen,
    false,
  );

  for (const patch of [
    { endingId: "missing" },
    { usedFallback: true },
    { turn: 0 },
    { matchedTriggerIds: [] },
    { matchedTriggerIds: ["review", "review"] },
    { matchedTriggerIds: ["missing"] },
    { matchedPrerequisiteGroupIds: [] },
    { matchedPrerequisiteGroupIds: ["missing"] },
    { matchedPrerequisiteGroupIds: ["healthy", "healthy"] },
    { matchedTriggerIds: [42] },
    { matchedTriggerIds: null },
    { matchedPrerequisiteGroupIds: "healthy" },
    { usedFallback: "yes" },
    { extra: true },
  ]) {
    assert.equal(
      restore({ ...state, outcome: { ...state.outcome, ...patch } }),
      undefined,
    );
  }
  assert.equal(restore({ ...state, history: [] }), undefined);
  assert.equal(
    restore({
      ...state,
      history: [
        ...state.history,
        { ...state.history[0], id: "duplicate-ending" },
      ],
    }),
    undefined,
  );
  assert.equal(restore({ ...state, outcome: null }), undefined);
  const archivedState = {
    ...state,
    history: state.history.map((entry) =>
      entry.kind === "ending"
        ? {
            ...entry,
            title: "Archived institutional report",
            detail: "Narrative retained from the saved session.",
          }
        : entry,
    ),
  };
  const archived = restore(archivedState);
  assert.ok(archived, "Chronicle prose need not match authored text");
  assert.deepEqual(archived.state.history, archivedState.history);
  const fallbackScenario = {
    ...scenario,
    completion: { ...scenario.completion, endings: [] },
  };
  const fallbackCatalog = loadScenarioCatalog([
    { contentVersion: 4, content: fallbackScenario },
  ]).entries;
  const fallback = advanceTurn(
    fallbackScenario,
    initializeScenario(fallbackScenario),
  ).state;
  assert.ok(restore(fallback, fallbackCatalog));

  const combinedScenario: ScenarioDefinition = {
    ...scenario,
    completion: {
      ...scenario.completion,
      prerequisiteGroups: [
        {
          id: "council-review",
          title: "Council review",
          description: "Complete the second-turn council review.",
          allOf: [
            { kind: "turn", atTurn: 2 },
            { kind: "event", eventId: "council" },
            {
              kind: "node-value",
              nodeId: "health",
              comparison: "at-least",
              value: 0.6,
            },
          ],
        },
      ],
    },
    events: [
      {
        kind: "event",
        id: "council",
        title: "Council",
        description: "Council held.",
        influences: [],
        threshold: 0,
        cooldownTurns: 1,
        consequences: [],
      },
    ],
  };
  const combinedCatalog = loadScenarioCatalog([
    { contentVersion: 4, content: combinedScenario },
  ]).entries;
  const interim = advanceTurn(
    combinedScenario,
    initializeScenario(combinedScenario),
  ).state;
  assert.equal(interim.outcome, null);
  const restoredInterim = restore(interim, combinedCatalog);
  assert.ok(restoredInterim);
  const completed = advanceTurn(combinedScenario, restoredInterim.state).state;
  const restoredCompletion = restore(completed, combinedCatalog);
  assert.ok(restoredCompletion);
  assert.equal(
    projectEndingReport(combinedScenario, restoredCompletion.state)?.triggers[0]
      .description,
    "Complete the second-turn council review.",
  );
  assert.ok(
    restore(
      {
        ...completed,
        events: {
          council: {
            ...completed.events.council,
            triggerCount: 0,
            lastTriggerTurn: null,
          },
        },
      },
      combinedCatalog,
    ),
    "Recorded endings are validated without reevaluating selection",
  );

  const dilemmaScenario = assemblyScenario();
  const dilemmaCatalog = loadScenarioCatalog([
    { contentVersion: 4, content: dilemmaScenario },
  ]).entries;
  const queued = advanceTurn(
    dilemmaScenario,
    initializeScenario(dilemmaScenario),
  ).state;
  assert.ok(restore(queued, dilemmaCatalog));
  const session = createGameSession(dilemmaScenario, queued);
  const chosen = reduceGameSession(session, {
    type: "resolve-dilemma",
    dilemmaId: "assembly",
    choiceId: "accept",
  });
  assert.ok(chosen.ok);
  assert.equal(chosen.state.outcome, null);
  assert.equal(
    chosen.state.turn,
    queued.turn,
    "Choices remain within the current turn without completing it",
  );
  const forgedState = resolveEnding(dilemmaScenario, chosen.state);
  assert.equal(
    restore(forgedState, dilemmaCatalog),
    undefined,
    "Same-turn choice endings violate turn-only evaluation",
  );
  const restoredChoice = restore(chosen.state, dilemmaCatalog);
  assert.ok(restoredChoice);
  const completedAfterChoice = reduceGameSession(
    createGameSession(dilemmaScenario, restoredChoice.state),
    { type: "advance", randomValue: 0 },
  );
  assert.ok(completedAfterChoice.ok);
  assert.equal(completedAfterChoice.state.outcome?.kind, "ending");
  assert.equal(completedAfterChoice.state.turn, queued.turn + 1);
  assert.ok(restore(completedAfterChoice.state, dilemmaCatalog));
  assert.equal(
    projectEndingReport(dilemmaScenario, completedAfterChoice.state)?.turn,
    2,
  );
  for (const patch of [
    { lastResolvedChoiceId: "missing" },
    { lastResolvedTurn: undefined },
    { lastResolvedChoiceId: undefined },
    { lastResolvedTurn: 2 },
    { lastResolvedTurn: null },
    { lastTriggerTurn: null },
    { lastResolvedChoiceId: null },
  ]) {
    assert.equal(
      restore(
        {
          ...chosen.state,
          dilemmas: {
            assembly: { ...chosen.state.dilemmas.assembly, ...patch },
          },
        },
        dilemmaCatalog,
      ),
      undefined,
    );
  }
  assert.strictEqual(
    executeCommand(dilemmaScenario, chosen.state, {
      type: "resolve-dilemma",
      dilemmaId: "assembly",
      choiceId: "decline",
    }).state,
    chosen.state,
  );
}

import { ongoingCompletion } from "../simulation/fixtures";
import { runEndingPersistenceTests } from "./endings.test";
import assert from "node:assert/strict";
import {
  clearSavedGame,
  loadSavedGame,
  SAVE_STORAGE_KEY,
  storeSavedGame,
  validateSavedGame,
  type SavedGame,
  type SaveStorage,
} from "../../src/app/persistence";
import {
  createGameSession,
  reduceGameSession,
} from "../../src/app/gameSession";
import { loadScenarioCatalog } from "../../src/app/scenarioCatalog";
import { exampleScenario as bundledScenario } from "../../src/scenarios/example";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
} from "../../src/simulation";
import {
  projectTurnReport,
  restoreTurnReport,
  serializeTurnReport,
} from "../../src/ui/panels/projectTurnReport";

const exampleScenario = { ...bundledScenario, completion: ongoingCompletion };

class MemoryStorage implements SaveStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const catalogResult = loadScenarioCatalog([
  { contentVersion: 4, content: exampleScenario },
]);
assert.deepEqual(catalogResult.diagnostics, []);
const catalog = catalogResult.entries;
assert.match(
  loadScenarioCatalog([{ contentVersion: 0, content: exampleScenario }])
    .diagnostics[0],
  /contentVersion/,
);
assert.match(
  loadScenarioCatalog([
    { contentVersion: 1, content: exampleScenario },
    { contentVersion: 4, content: exampleScenario },
  ]).diagnostics[0],
  /duplicate Scenario id/,
);
const initialState = initializeScenario(catalog[0].scenario);
const firstTurn = advanceTurn(catalog[0].scenario, initialState, 0).state;
const state = firstTurn.pendingDilemmaIds.length
  ? executeCommand(catalog[0].scenario, firstTurn, {
      type: "resolve-dilemma",
      dilemmaId: firstTurn.pendingDilemmaIds[0],
      choiceId: catalog[0].scenario.dilemmas!.find(
        ({ id }) => id === firstTurn.pendingDilemmaIds[0],
      )!.choices[0].id,
    }).state
  : firstTurn;
const turnReport = projectTurnReport(catalog[0].scenario, initialState, state);
const savedTurnReport = serializeTurnReport(turnReport);
const save: SavedGame = {
  version: 4,
  scenarioId: exampleScenario.id,
  scenarioContentVersion: 4,
  playerName: "Avery Morgan",
  denominationName: "The Common Fellowship",
  state,
};

assert.ok(validateSavedGame(save, catalog), "A valid save should be accepted");
const exampleDilemma = exampleScenario.dilemmas[0];
const queuedContent = {
  ...exampleScenario,
  gameOvers: [],
  dilemmas: [
    { ...exampleDilemma, threshold: -1 },
    { ...exampleDilemma, id: "second-assembly-dispute", threshold: -1 },
  ],
};
const queuedCatalog = loadScenarioCatalog([
  { contentVersion: 6, content: queuedContent },
]).entries;
assert.equal(queuedCatalog.length, 1);
const queuedScenario = queuedCatalog[0].scenario;
const queued = advanceTurn(
  queuedScenario,
  initializeScenario(queuedScenario),
  0,
).state;
assert.equal(queued.pendingDilemmaIds.length, 1);
const partiallyResolved = queued;
const pendingSave: SavedGame = {
  ...save,
  scenarioContentVersion: 6,
  state: partiallyResolved,
};
assert.ok(
  validateSavedGame(pendingSave, queuedCatalog),
  "A pending Dilemma can be saved",
);
const adjustedWhilePending = executeCommand(queuedScenario, partiallyResolved, {
  type: "set-stance",
  stanceId: "centralization",
  value: 0.6,
});
assert.equal(adjustedWhilePending.accepted, true);
assert.ok(
  validateSavedGame(
    { ...pendingSave, state: adjustedWhilePending.state },
    queuedCatalog,
  ),
  "A Stance adjustment during a pending Dilemma can be saved",
);
const pendingStorage = new MemoryStorage();
assert.equal(storeSavedGame(pendingStorage, pendingSave), undefined);
const pendingLoaded = loadSavedGame(pendingStorage, queuedCatalog);
assert.equal(pendingLoaded.status, "ready");
if (pendingLoaded.status === "ready")
  assert.deepEqual(
    pendingLoaded.save.state.pendingDilemmaIds,
    queued.pendingDilemmaIds,
  );
assert.equal(
  validateSavedGame(
    {
      ...pendingSave,
      state: {
        ...partiallyResolved,
        pendingDilemmaIds: [exampleDilemma.id, exampleDilemma.id],
      },
    },
    queuedCatalog,
  ),
  undefined,
);
assert.equal(
  validateSavedGame(
    { ...pendingSave, state: { ...partiallyResolved, dilemmas: {} } },
    queuedCatalog,
  ),
  undefined,
);
assert.equal(
  validateSavedGame(
    {
      ...pendingSave,
      state: {
        ...partiallyResolved,
        dilemmas: {
          ...partiallyResolved.dilemmas,
          [exampleDilemma.id]: { lastTriggerTurn: null, triggerCount: 1 },
        },
      },
    },
    queuedCatalog,
  ),
  undefined,
);
const reportSave: SavedGame = { ...save, turnReport: savedTurnReport };
const previousContentState = {
  ...initialState,
  dilemmas: { [exampleDilemma.id]: initialState.dilemmas[exampleDilemma.id] },
};
const previousContentStorage = new MemoryStorage();
previousContentStorage.setItem(
  SAVE_STORAGE_KEY,
  JSON.stringify({
    ...save,
    scenarioContentVersion: 4,
    state: previousContentState,
  }),
);
const oldContentSave = loadSavedGame(previousContentStorage, catalog);
assert.equal(oldContentSave.status, "unavailable");
const oldPendingScenario = {
  ...exampleScenario,
  dilemmas: [{ ...exampleDilemma, threshold: -1 }],
};
const oldPending = advanceTurn(
  oldPendingScenario,
  initializeScenario(oldPendingScenario),
  0,
).state;
const oldPendingStorage = new MemoryStorage();
oldPendingStorage.setItem(
  SAVE_STORAGE_KEY,
  JSON.stringify({
    ...save,
    scenarioContentVersion: 4,
    state: oldPending,
  }),
);
const oldPendingSave = loadSavedGame(oldPendingStorage, catalog);
assert.equal(oldPendingSave.status, "unavailable");
assert.ok(
  validateSavedGame(reportSave, catalog),
  "A save with a turn report should be accepted",
);
const effectId = exampleScenario.effects[0].id;
assert.equal(
  validateSavedGame(
    {
      ...reportSave,
      turnReport: {
        ...savedTurnReport,
        changedEffectIds: [effectId, effectId],
      },
    },
    catalog,
  ),
  undefined,
  "Duplicate Effect references in turn reports must be rejected",
);
assert.deepEqual(
  restoreTurnReport(catalog[0].scenario, savedTurnReport),
  turnReport,
  "A saved turn report should restore its scenario references",
);

const terminalDefinition = catalog[0].scenario.gameOvers![0];
const terminalSave: SavedGame = {
  ...save,
  state: {
    ...save.state,
    gameOverProgress: {
      ...save.state.gameOverProgress,
      [terminalDefinition.id]: {
        episode: 1,
        consecutiveTurns: terminalDefinition.terminalAfterTurns,
        matchedPrerequisiteGroupIds: [
          terminalDefinition.prerequisiteGroups[0].id,
        ],
      },
    },
    outcome: {
      kind: "game-over",
      turn: save.state.turn,
      causes: [
        {
          gameOverId: terminalDefinition.id,
          matchedPrerequisiteGroupIds: [
            terminalDefinition.prerequisiteGroups[0].id,
          ],
        },
      ],
    },
  },
};
assert.ok(
  validateSavedGame(terminalSave, catalog),
  "A terminal Game Over save should be restorable",
);
const storage = new MemoryStorage();
assert.equal(storeSavedGame(storage, save), undefined);
const loaded = loadSavedGame(storage, catalog);
assert.equal(loaded.status, "ready");
if (loaded.status === "ready") {
  assert.deepEqual(loaded.save, save, "A save must round-trip without loss");
  const session = createGameSession(exampleScenario, loaded.save.state);
  assert.ok(session.ok);
  assert.equal(session.state.turn, state.turn);
  assert.match(session.message, /restored/);
  const advancedSession = reduceGameSession(session, {
    type: "advance",
    randomValue: 0,
  });
  assert.ok(advancedSession.ok);
  const report = projectTurnReport(
    advancedSession.scenario,
    session.state,
    advancedSession.state,
  );
  assert.equal(
    report.turn,
    advancedSession.state.turn,
    "A session advance should provide compatible snapshots for a turn report",
  );
  const reset = reduceGameSession(session, { type: "reset" });
  assert.ok(reset.ok);
  assert.equal(reset.state.turn, exampleScenario.start.turn);
}

assert.equal(storeSavedGame(storage, reportSave), undefined);
const loadedReport = loadSavedGame(storage, catalog);
assert.equal(loadedReport.status, "ready");
if (loadedReport.status === "ready") {
  assert.deepEqual(
    loadedReport.save.turnReport,
    savedTurnReport,
    "A saved turn report must round-trip without loss",
  );
}

assert.equal(
  validateSavedGame({ ...save, version: 1 }, catalog),
  undefined,
  "Unknown save versions must be rejected",
);
assert.equal(
  validateSavedGame(
    {
      ...save,
      state: {
        ...save.state,
        nodes: {
          ...save.state.nodes,
          money: { ...save.state.nodes.money, stockValue: 999 },
        },
      },
    },
    catalog,
  ),
  undefined,
  "A saved Resource must not contain the removed stock field",
);
assert.equal(
  validateSavedGame(
    { ...save, state: { ...save.state, nodeValueHistory: {} } },
    catalog,
  ),
  undefined,
  "Missing turn readings must be rejected",
);
assert.equal(
  validateSavedGame(
    {
      ...save,
      state: {
        ...save.state,
        nodeValueHistory: {
          ...save.state.nodeValueHistory,
          [save.state.turn]: {
            ...save.state.nodeValueHistory[save.state.turn],
            money: { value: Number.NaN, isActive: true },
          },
        },
      },
    },
    catalog,
  ),
  undefined,
  "Non-finite historical readings must be rejected",
);
assert.equal(
  validateSavedGame({ ...save, scenarioId: "another-scenario" }, catalog),
  undefined,
  "Scenario mismatches must be rejected",
);
assert.equal(
  validateSavedGame({ ...save, scenarioContentVersion: 6 }, catalog),
  undefined,
  "Content-version mismatches must be rejected",
);
assert.equal(
  validateSavedGame({ ...save, playerName: "  " }, catalog),
  undefined,
  "Blank identity fields must be rejected",
);
assert.equal(
  validateSavedGame(
    {
      ...save,
      state: {
        ...save.state,
        nodes: { ...save.state.nodes, unexpected: save.state.nodes.authority },
      },
    },
    catalog,
  ),
  undefined,
  "Extra runtime nodes must be rejected",
);
const { authority: _authority, ...missingNode } = save.state.nodes;
assert.equal(
  validateSavedGame(
    { ...save, state: { ...save.state, nodes: missingNode } },
    catalog,
  ),
  undefined,
  "Missing runtime nodes must be rejected",
);
assert.equal(
  validateSavedGame(
    {
      ...save,
      state: {
        ...save.state,
        nodes: {
          ...save.state.nodes,
          authority: { ...save.state.nodes.authority, value: Number.NaN },
        },
      },
    },
    catalog,
  ),
  undefined,
  "Non-finite runtime values must be rejected",
);
const firstEffect = exampleScenario.effects[0].id;
assert.equal(
  validateSavedGame(
    {
      ...save,
      state: {
        ...save.state,
        effects: {
          ...save.state.effects,
          [firstEffect]: {
            ...save.state.effects[firstEffect],
            sourceHistory: [],
          },
        },
      },
    },
    catalog,
  ),
  undefined,
  "Invalid inertia history lengths must be rejected",
);
assert.equal(
  validateSavedGame(
    {
      ...save,
      state: {
        ...save.state,
        gameOverProgress: {
          ...save.state.gameOverProgress,
          [terminalDefinition.id]: {
            episode: 1,
            consecutiveTurns: 1,
            matchedPrerequisiteGroupIds: ["missing-group"],
          },
        },
      },
    },
    catalog,
  ),
  undefined,
  "Unknown prerequisite groups in crisis progress must be rejected",
);

storage.setItem(SAVE_STORAGE_KEY, "not json");
const malformed = loadSavedGame(storage, catalog);
assert.equal(malformed.status, "unavailable");
if (malformed.status === "unavailable")
  assert.equal(malformed.discardInvalid, true);
assert.equal(clearSavedGame(storage), undefined);
assert.equal(
  storage.getItem(SAVE_STORAGE_KEY),
  null,
  "An invalid save should be cleared",
);

const failingStorage: SaveStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("full");
  },
  removeItem() {
    throw new Error("blocked");
  },
};
assert.equal(loadSavedGame(failingStorage, catalog).status, "unavailable");
assert.match(storeSavedGame(failingStorage, save) ?? "", /could not be saved/);
assert.match(clearSavedGame(failingStorage) ?? "", /could not be removed/);

assert.equal(clearSavedGame(storage), undefined);
assert.equal(storage.getItem(SAVE_STORAGE_KEY), null);

const touchedKeys: string[] = [];
const currentSlotStorage: SaveStorage = {
  getItem(key) {
    touchedKeys.push(key);
    return storage.getItem(key);
  },
  setItem(key, value) {
    touchedKeys.push(key);
    storage.setItem(key, value);
  },
  removeItem(key) {
    touchedKeys.push(key);
    storage.removeItem(key);
  },
};
storage.setItem("unrelated-setting", "preserved");
assert.deepEqual(loadSavedGame(currentSlotStorage, catalog), {
  status: "empty",
});
assert.equal(storeSavedGame(currentSlotStorage, save), undefined);
assert.equal(clearSavedGame(currentSlotStorage), undefined);
assert.deepEqual(
  touchedKeys,
  [SAVE_STORAGE_KEY, SAVE_STORAGE_KEY, SAVE_STORAGE_KEY],
  "Persistence touches only its current save slot",
);
assert.equal(storage.getItem("unrelated-setting"), "preserved");

console.log("Application persistence checks passed.");

runEndingPersistenceTests();

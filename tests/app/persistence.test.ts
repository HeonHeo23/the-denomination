import { mock } from "node:test";
import { randomUUID } from "node:crypto";
import {
  deleteSavedGameEntry,
  loadSavedGames,
  loadSavedGameEntry,
  getContinueGame,
  rememberLoadedGame,
  storeSavedGameEntry,
} from "../../src/app/savedGames";
import { runEndingChangesTests } from "./endingChanges.test";
import { runStartingTurnPersistenceTests } from "./startingTurnPersistence.test";
import { ongoingCompletion } from "../simulation/fixtures";
import { runEndingPersistenceTests } from "./endings.test";
import assert from "node:assert/strict";
import {
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
} from "../../src/ui/panels/projectReport";

const exampleScenario = { ...bundledScenario, completion: ongoingCompletion };

class MemoryStorage implements SaveStorage {
  readonly values = new Map<string, string>();
  writes = 0;

  get latestValue(): string {
    return [...this.values.values()].at(-1)!;
  }

  set latestValue(value: string) {
    this.values.set([...this.values.keys()].at(-1)!, value);
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.writes += 1;
    this.values.set(key, value);
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
assert.equal(
  storeSavedGameEntry(pendingStorage, queuedCatalog, {
    id: "pending",
    save: pendingSave,
  }),
  undefined,
);
const pendingLoaded = loadSavedGameEntry(
  pendingStorage,
  queuedCatalog,
  "pending",
).game;
assert.ok(pendingLoaded);
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
assert.equal(
  validateSavedGame(
    { ...save, scenarioContentVersion: 4, state: previousContentState },
    catalog,
  ),
  undefined,
);
const oldPendingScenario = {
  ...exampleScenario,
  dilemmas: [{ ...exampleDilemma, threshold: -1 }],
};
const oldPending = advanceTurn(
  oldPendingScenario,
  initializeScenario(oldPendingScenario),
  0,
).state;
assert.equal(
  validateSavedGame(
    { ...save, scenarioContentVersion: 4, state: oldPending },
    catalog,
  ),
  undefined,
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
assert.equal(
  storeSavedGameEntry(storage, catalog, { id: "round-trip", save }),
  undefined,
);
const loaded = loadSavedGameEntry(storage, catalog, "round-trip").game;
assert.ok(loaded);
{
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

assert.equal(
  storeSavedGameEntry(storage, catalog, { id: "report", save: reportSave }),
  undefined,
);
const loadedReport = loadSavedGameEntry(storage, catalog, "report").game;
assert.ok(loadedReport);
assert.deepEqual(
  loadedReport.save.turnReport,
  savedTurnReport,
  "A saved turn report must round-trip without loss",
);

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

const failingStorage: SaveStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("full");
  },
};
console.log("Application persistence checks passed.");

runEndingPersistenceTests();
runEndingChangesTests();
runStartingTurnPersistenceTests();

// Listing reads metadata; restoration validates only the selected snapshot.
mock.timers.enable({
  apis: ["Date"],
  now: Date.parse("2026-10-07T12:00:00.000Z"),
});
const collectionStorage = new MemoryStorage();
assert.deepEqual(loadSavedGames(collectionStorage), { games: [] });
const firstEntry = { id: "first", savedAt: new Date().toISOString(), save };
assert.equal(
  storeSavedGameEntry(collectionStorage, catalog, firstEntry),
  undefined,
);
assert.deepEqual(
  loadSavedGameEntry(collectionStorage, catalog, "first").game,
  firstEntry,
);
assert.equal(
  collectionStorage.writes,
  1,
  "Saving and selecting Continue share one write",
);
assert.equal(loadSavedGames(collectionStorage).lastLoadedGameId, "first");
mock.timers.tick(1000);
const secondSave = { ...save, denominationName: "Second institution" };
const secondEntry = {
  id: "second",
  savedAt: new Date().toISOString(),
  save: secondSave,
};
assert.equal(
  storeSavedGameEntry(collectionStorage, catalog, secondEntry),
  undefined,
);
assert.deepEqual(
  loadSavedGames(collectionStorage).games.map(({ id }) => id),
  ["second", "first"],
);
assert.equal(
  getContinueGame(
    loadSavedGames(collectionStorage).games,
    loadSavedGames(collectionStorage).lastLoadedGameId,
  )?.id,
  "second",
);
const beforeLoad = collectionStorage.latestValue;
assert.deepEqual(
  loadSavedGameEntry(collectionStorage, catalog, "first").game,
  firstEntry,
);
assert.equal(
  collectionStorage.latestValue,
  beforeLoad,
  "Loading preserves stored data and timestamps",
);
assert.equal(rememberLoadedGame(collectionStorage, "first"), undefined);
let listed = loadSavedGames(collectionStorage);
assert.equal(
  getContinueGame(listed.games, listed.lastLoadedGameId)?.id,
  "first",
);
assert.deepEqual(JSON.parse(collectionStorage.latestValue).games, [
  secondEntry,
  firstEntry,
]);
mock.timers.tick(1000);
const beforeDuplicate = collectionStorage.latestValue;
const writesBeforeDuplicate = collectionStorage.writes;
assert.match(
  storeSavedGameEntry(collectionStorage, catalog, {
    id: "first",
    save: { ...save, playerName: "Updated leader" },
  }) ?? "",
  /slot already exists/,
);
assert.equal(collectionStorage.latestValue, beforeDuplicate);
assert.equal(collectionStorage.writes, writesBeforeDuplicate);
assert.equal(loadSavedGames(collectionStorage).lastLoadedGameId, "first");
for (const invalidSave of [
  { ...save, scenarioContentVersion: 999 },
  { ...save, state: { ...save.state, turn: -1 } },
]) {
  assert.match(
    storeSavedGameEntry(collectionStorage, catalog, {
      id: randomUUID(),
      save: invalidSave,
    }) ?? "",
    /snapshot is invalid/,
  );
  assert.equal(collectionStorage.latestValue, beforeDuplicate);
  assert.equal(collectionStorage.writes, writesBeforeDuplicate);
}
const olderCheckpoint = loadSavedGameEntry(
  collectionStorage,
  catalog,
  "first",
).game!;
const updatedEntry = {
  id: randomUUID(),
  savedAt: new Date().toISOString(),
  save: olderCheckpoint.save,
};
assert.equal(
  storeSavedGameEntry(collectionStorage, catalog, updatedEntry),
  undefined,
);
assert.deepEqual(JSON.parse(collectionStorage.latestValue).games, [
  updatedEntry,
  secondEntry,
  firstEntry,
]);
assert.equal(
  loadSavedGames(collectionStorage).lastLoadedGameId,
  updatedEntry.id,
);
assert.deepEqual(
  loadSavedGameEntry(collectionStorage, catalog, "first").game,
  firstEntry,
);
const sameTurnEntry = { ...updatedEntry, id: randomUUID() };
assert.equal(
  storeSavedGameEntry(collectionStorage, catalog, sameTurnEntry),
  undefined,
);
assert.deepEqual(JSON.parse(collectionStorage.latestValue).games, [
  sameTurnEntry,
  updatedEntry,
  secondEntry,
  firstEntry,
]);
const reopenedStorage = new MemoryStorage();
for (const [key, value] of collectionStorage.values)
  reopenedStorage.values.set(key, value);
assert.deepEqual(
  loadSavedGames(reopenedStorage),
  loadSavedGames(collectionStorage),
);
assert.deepEqual(
  loadSavedGameEntry(reopenedStorage, catalog, "first").game,
  firstEntry,
);
const reopenedGames = loadSavedGames(reopenedStorage);
assert.equal(
  getContinueGame(reopenedGames.games, reopenedGames.lastLoadedGameId)?.id,
  sameTurnEntry.id,
);
assert.equal(rememberLoadedGame(reopenedStorage, "first"), undefined);
assert.equal(
  getContinueGame(
    loadSavedGames(reopenedStorage).games,
    loadSavedGames(reopenedStorage).lastLoadedGameId,
  )?.id,
  "first",
);
assert.match(
  loadSavedGameEntry(collectionStorage, catalog, "missing").message ?? "",
  /no longer available/,
);
assert.ok(rememberLoadedGame(collectionStorage, "missing"));
assert.equal(getContinueGame([]), undefined);
assert.equal(getContinueGame(listed.games, "missing")?.id, "second");

const invalidEntries = [
  { id: "missing-time", save },
  { id: "bad-time", savedAt: "not a date", save },
  { id: "empty-time", savedAt: "", save },
  { id: "numeric-time", savedAt: 123, save },
  { id: "null-time", savedAt: null, save },
  {
    id: "incompatible",
    savedAt: firstEntry.savedAt,
    save: { ...save, scenarioContentVersion: 999 },
  },
  { id: "broken", savedAt: firstEntry.savedAt, save: null },
  { id: "missing-save", savedAt: firstEntry.savedAt },
];
collectionStorage.latestValue = JSON.stringify({
  version: 1,
  lastLoadedGameId: "missing-time",
  games: [...invalidEntries, firstEntry],
});
listed = loadSavedGames(collectionStorage);
assert.deepEqual(
  listed.games.map(({ id }) => id),
  [...invalidEntries.map(({ id }) => id), "first"],
  "All entries are listed in collection order before validation",
);
assert.equal(listed.message, undefined);
assert.equal(listed.games[0].denominationName, save.denominationName);
assert.equal(listed.games[6].denominationName, undefined);
assert.equal(
  getContinueGame(listed.games, listed.lastLoadedGameId)?.id,
  "missing-time",
  "Continue does not filter compatibility before selection",
);
for (const entry of invalidEntries) {
  const before = collectionStorage.latestValue;
  const result = loadSavedGameEntry(collectionStorage, catalog, entry.id);
  assert.equal(result.game, undefined);
  assert.ok(result.message, entry.id);
  assert.equal(
    collectionStorage.latestValue,
    before,
    "Failed restoration preserves data",
  );
}
assert.deepEqual(
  loadSavedGameEntry(collectionStorage, catalog, "first").game,
  firstEntry,
  "Valid saves load alongside invalid entries",
);
assert.equal(
  storeSavedGameEntry(collectionStorage, catalog, secondEntry),
  undefined,
);
assert.deepEqual(
  JSON.parse(collectionStorage.latestValue).games.slice(1, -1),
  invalidEntries,
);
const futureCatalog = catalog.map((entry) => ({
  ...entry,
  contentVersion: 999,
}));
assert.equal(
  loadSavedGameEntry(collectionStorage, futureCatalog, "incompatible").game
    ?.save.scenarioContentVersion,
  999,
);
assert.equal(rememberLoadedGame(collectionStorage, "first"), undefined);
assert.equal(
  deleteSavedGameEntry(collectionStorage, "missing-time"),
  undefined,
);
assert.equal(
  loadSavedGames(collectionStorage).games.some(
    ({ id }) => id === "missing-time",
  ),
  false,
);
assert.equal(loadSavedGames(collectionStorage).lastLoadedGameId, "first");
assert.equal(deleteSavedGameEntry(collectionStorage, "first"), undefined);
assert.equal(loadSavedGames(collectionStorage).lastLoadedGameId, undefined);
assert.deepEqual(
  loadSavedGameEntry(collectionStorage, catalog, "second").game,
  { ...secondEntry, savedAt: updatedEntry.savedAt },
);
const quotaStorage: SaveStorage = {
  getItem: (key) => reopenedStorage.getItem(key),
  setItem() {
    throw new Error("quota exceeded");
  },
};
const beforeFailure = reopenedStorage.latestValue;
let attemptedWrites = 0;
const failingWriteStorage: SaveStorage = {
  getItem: (key) => reopenedStorage.getItem(key),
  setItem() {
    attemptedWrites += 1;
    throw new Error("quota exceeded");
  },
};
assert.match(
  storeSavedGameEntry(failingWriteStorage, catalog, {
    id: randomUUID(),
    save,
  }) ?? "",
  /continue in memory/,
);
assert.equal(attemptedWrites, 1);
assert.match(
  rememberLoadedGame(quotaStorage, "first") ?? "",
  /could not be remembered/,
);
assert.ok(deleteSavedGameEntry(quotaStorage, "first"));
assert.equal(reopenedStorage.latestValue, beforeFailure);
assert.ok(loadSavedGameEntry(failingStorage, catalog, "first").message);
assert.ok(loadSavedGames(failingStorage).message);
assert.ok(storeSavedGameEntry(failingStorage, catalog, firstEntry));
assert.ok(deleteSavedGameEntry(failingStorage, "first"));
for (const serialized of [
  "not json",
  JSON.stringify({ version: 2, games: [] }),
  JSON.stringify({ version: 1, games: [firstEntry, firstEntry] }),
]) {
  collectionStorage.latestValue = serialized;
  assert.deepEqual(loadSavedGames(collectionStorage).games, []);
  assert.ok(loadSavedGameEntry(collectionStorage, catalog, "first").message);
  assert.ok(storeSavedGameEntry(collectionStorage, catalog, firstEntry));
  assert.ok(deleteSavedGameEntry(collectionStorage, "first"));
  assert.equal(
    collectionStorage.latestValue,
    serialized,
    "Unreadable collections are not overwritten",
  );
}
mock.timers.reset();
console.log(
  "Save metadata listing, selected-entry validation, timestamps, and deletion checks passed.",
);

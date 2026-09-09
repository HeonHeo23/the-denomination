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
import { exampleScenario } from "../../src/scenarios/example";
import { advanceTurn, initializeScenario } from "../../src/simulation";

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
  { contentVersion: 3, content: exampleScenario },
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
    { contentVersion: 2, content: exampleScenario },
  ]).diagnostics[0],
  /duplicate Scenario id/,
);
const state = advanceTurn(
  catalog[0].scenario,
  initializeScenario(catalog[0].scenario),
).state;
const save: SavedGame = {
  version: 1,
  scenarioId: exampleScenario.id,
  scenarioContentVersion: 3,
  playerName: "Avery Morgan",
  denominationName: "The Common Fellowship",
  state,
};

assert.ok(validateSavedGame(save, catalog), "A valid save should be accepted");

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
  const reset = reduceGameSession(session, { type: "reset" });
  assert.ok(reset.ok);
  assert.equal(reset.state.turn, exampleScenario.start.turn);
}

assert.equal(
  validateSavedGame({ ...save, version: 2 }, catalog),
  undefined,
  "Unknown save versions must be rejected",
);
assert.equal(
  validateSavedGame({ ...save, scenarioId: "another-scenario" }, catalog),
  undefined,
  "Scenario mismatches must be rejected",
);
assert.equal(
  validateSavedGame({ ...save, scenarioContentVersion: 4 }, catalog),
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

console.log("Application persistence checks passed.");

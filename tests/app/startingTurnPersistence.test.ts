import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  validateSavedGame,
  type SavedGame,
  type SaveStorage,
} from "../../src/app/persistence";
import { loadScenarioCatalog } from "../../src/app/scenarioCatalog";
import {
  loadSavedGameEntry,
  storeSavedGameEntry,
} from "../../src/app/savedGames";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  type SimulationCommand,
  type SimulationState,
  type ScenarioDefinition,
} from "../../src/simulation";
import {
  projectTurnReport,
  serializeTurnReport,
} from "../../src/ui/panels/projectReport";
import { ongoingCompletion } from "../simulation/fixtures";

const startingTurnScenario: ScenarioDefinition = {
  schemaVersion: 3,
  id: "starting-turn-save-test",
  title: "Starting turn save test",
  description: "Stance changes and Game Over checkpoints.",
  start: { turn: 0, year: 2000 },
  completion: ongoingCompletion,
  historicalActors: [],
  nodes: [
    ...["common-investment", "game-over-test"].map((id) => ({
      id,
      type: "stance" as const,
      name: id,
      description: "A directly controlled test Stance.",
      domain: { min: 0, max: 1, clamp: true },
      initial: {
        value: id === "common-investment" ? 0.5 : 0,
        isActive: true,
        isForced: true,
      },
      control: { kind: "continuous" as const },
    })),
    {
      id: "funds",
      type: "resource",
      name: "Funds",
      description: "Test action costs.",
      domain: { min: 0, max: 100, clamp: true },
      initial: { value: 50, isActive: true, isForced: true },
    },
  ],
  effects: [],
  gameOvers: [
    {
      id: "test-failure",
      title: "Test crisis",
      terminalAfterTurns: 3,
      prerequisiteGroups: [
        {
          id: "test-enabled",
          title: "Test enabled",
          allOf: [
            {
              kind: "node-value",
              nodeId: "game-over-test",
              comparison: "at-least",
              value: 1,
            },
          ],
        },
      ],
      stages: [1, 2].map((atTurn) => ({
        id: `warning-${atTurn}`,
        atTurn,
        title: "Test warning",
        description: "Failure is approaching.",
        consequences: [
          { kind: "resource" as const, target: "funds", amount: -1 },
        ],
      })),
      report: {
        title: "Test failure",
        narrative: "The test Stance remained enabled.",
      },
    },
  ],
};

export function runStartingTurnPersistenceTests() {
  const catalog = loadScenarioCatalog([
    { contentVersion: 1, content: startingTurnScenario },
  ]).entries;
  assert.equal(catalog.length, 1);
  const scenario = catalog[0].scenario;
  const values = new Map<string, string>();
  const storage: SaveStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  const makeSave = (state: SimulationState): SavedGame => ({
    version: 4,
    scenarioId: scenario.id,
    scenarioContentVersion: 1,
    playerName: "Test leader",
    denominationName: "Test fellowship",
    state,
  });
  const roundTrip = (save: SavedGame, prefix: string) => {
    const id = `${prefix}-${randomUUID()}`;
    assert.equal(
      storeSavedGameEntry(storage, catalog, { id, save }),
      undefined,
    );
    const loaded = loadSavedGameEntry(storage, catalog, id).game;
    assert.ok(loaded);
    assert.deepEqual(loaded.save, save);
    return loaded.save.state;
  };
  // Enable before or after the opening advancement, then save through failure.
  for (const enabledTurn of [0, 1]) {
    let state = initializeScenario(scenario);
    roundTrip(makeSave(state), "crisis");
    if (enabledTurn === 1)
      state = roundTrip(makeSave(advanceTurn(scenario, state).state), "crisis");
    const changed = executeCommand(scenario, state, {
      type: "set-stance",
      stanceId: "game-over-test",
      value: 1,
    });
    assert.ok(changed.accepted, changed.message);
    assert.equal(
      changed.state.nodeValueHistory[enabledTurn]["game-over-test"].value,
      1,
    );
    state = roundTrip(makeSave(changed.state), "crisis");
    for (let qualifyingTurn = 1; qualifyingTurn <= 3; qualifyingTurn += 1) {
      const previous = state;
      state = advanceTurn(scenario, previous).state;
      assert.equal(
        state.gameOverProgress["test-failure"].consecutiveTurns,
        qualifyingTurn,
      );
      state = roundTrip(
        {
          ...makeSave(state),
          turnReport: serializeTurnReport(
            projectTurnReport(scenario, previous, state),
          ),
        },
        "crisis",
      );
    }
    assert.equal(state.outcome?.kind, "game-over");
    assert.equal(state.turn, enabledTurn + 3);
  }

  // Starting-turn enactment, adjustment, and repeal also update Resource history.
  const transitionsCatalog = loadScenarioCatalog([
    {
      contentVersion: 1,
      content: {
        ...startingTurnScenario,
        start: { turn: 7, year: 2000 },
        completion: ongoingCompletion,
        nodes: startingTurnScenario.nodes.map((node) =>
          node.id === "common-investment"
            ? {
                ...node,
                initial: { value: 0.5, isActive: false, isForced: false },
                enactmentCost: { resourceId: "funds", amount: 3 },
                cost: { resourceId: "funds", base: 1, perPoint: 2 },
                repealCost: { resourceId: "funds", amount: 2 },
              }
            : node,
        ),
      },
    },
  ]).entries;
  assert.equal(transitionsCatalog.length, 1);
  const transitions = transitionsCatalog[0].scenario;
  let state = initializeScenario(transitions);
  const initialFunds = state.nodes.funds.value;
  const commands: SimulationCommand[] = [
    { type: "enact-stance", stanceId: "common-investment", value: 0.5 },
    { type: "set-stance", stanceId: "common-investment", value: 1 },
    { type: "repeal-stance", stanceId: "common-investment" },
  ];
  for (const command of commands) {
    const checkpointId = randomUUID();
    const result = executeCommand(transitions, state, command);
    assert.ok(result.accepted, result.message);
    state = result.state;
    const save = makeSave(state);
    assert.equal(
      storeSavedGameEntry(storage, transitionsCatalog, {
        id: checkpointId,
        save,
      }),
      undefined,
    );
    const loaded = loadSavedGameEntry(
      storage,
      transitionsCatalog,
      checkpointId,
    ).game;
    assert.ok(loaded);
    assert.deepEqual(loaded.save, save);
    state = loaded.save.state;
  }
  assert.equal(state.nodes.funds.value, initialFunds - 7);
  assert.equal(state.nodeValueHistory[7].funds.value, initialFunds - 7);
  assert.equal(state.nodeValueHistory[7]["common-investment"].isActive, false);

  // Accepting changed starting readings must retain domain and latest-row checks.
  for (const value of [2, 0.5]) {
    const invalid = {
      ...makeSave(state),
      state: {
        ...state,
        nodeValueHistory: {
          ...state.nodeValueHistory,
          7: {
            ...state.nodeValueHistory[7],
            "common-investment": { value, isActive: false },
          },
        },
      },
    };
    assert.equal(validateSavedGame(invalid, transitionsCatalog), undefined);
  }
}

import type { ScenarioDefinition, SimulationState } from "../simulation";
import type { LoadedScenarioCatalogEntry } from "./scenarioCatalog";

export const SAVE_STORAGE_KEY = "the-denomination.save.v2";
export const LEGACY_SAVE_STORAGE_KEY = "the-denomination.save.v1";

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedGame {
  readonly version: 2;
  readonly scenarioId: string;
  readonly scenarioContentVersion: number;
  readonly playerName: string;
  readonly denominationName: string;
  readonly state: SimulationState;
}

export type SavedGameLoadResult =
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly save: SavedGame }
  | {
      readonly status: "unavailable";
      readonly message: string;
      readonly discardInvalid: boolean;
    };

type ObjectValue = Record<string, unknown>;

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function validNodeState(
  value: unknown,
  definition: ScenarioDefinition["nodes"][number],
): boolean {
  if (
    !exactObject(value, ["value", "baseValue", "isActive", "isForced"]) ||
    !finite(value.value) ||
    !finite(value.baseValue) ||
    typeof value.isActive !== "boolean" ||
    typeof value.isForced !== "boolean" ||
    value.isForced !== definition.initial.isForced ||
    (value.isForced && !value.isActive)
  )
    return false;
  if (!definition.domain.clamp) return true;
  return [value.value, value.baseValue].every(
    (number) =>
      number >= definition.domain.min && number <= definition.domain.max,
  );
}

function validEffectState(
  value: unknown,
  expectedHistoryLength: number,
): boolean {
  return (
    exactObject(value, ["sourceHistory", "lastContribution"]) &&
    Array.isArray(value.sourceHistory) &&
    value.sourceHistory.length === expectedHistoryLength &&
    value.sourceHistory.every(finite) &&
    finite(value.lastContribution)
  );
}

function validRuntimeState(
  value: unknown,
  scenario: ScenarioDefinition,
): value is SimulationState {
  if (
    !exactObject(
      value,
      [
        "scenarioId",
        "turn",
        "nodes",
        "effects",
        "grudges",
        "history",
        "gameOverProgress",
        "outcome",
      ],
      ["year"],
    ) ||
    value.scenarioId !== scenario.id ||
    !finite(value.turn) ||
    !Number.isInteger(value.turn) ||
    value.turn < scenario.start.turn ||
    !exactObject(
      value.nodes,
      scenario.nodes.map(({ id }) => id),
    ) ||
    !exactObject(
      value.effects,
      scenario.effects.map(({ id }) => id),
    ) ||
    !Array.isArray(value.grudges) ||
    !Array.isArray(value.history) ||
    !exactObject(
      value.gameOverProgress,
      (scenario.gameOvers ?? []).map(({ id }) => id),
    )
  )
    return false;

  const expectedYear =
    scenario.start.year === undefined
      ? undefined
      : scenario.start.year + (value.turn - scenario.start.turn);
  if (value.year !== expectedYear) return false;

  const nodes = value.nodes as ObjectValue;
  const effects = value.effects as ObjectValue;
  const gameOverProgress = value.gameOverProgress as ObjectValue;

  if (
    !scenario.nodes.every((node) => validNodeState(nodes[node.id], node)) ||
    !scenario.effects.every((effect) =>
      validEffectState(effects[effect.id], effect.inertiaTurns ?? 1),
    )
  )
    return false;

  const gameOvers = new Map(
    (scenario.gameOvers ?? []).map((definition) => [definition.id, definition]),
  );
  for (const definition of gameOvers.values()) {
    const progress = gameOverProgress[definition.id];
    if (
      !exactObject(progress, [
        "episode",
        "consecutiveTurns",
        "matchedPrerequisiteGroupIds",
      ]) ||
      !finite(progress.episode) ||
      !Number.isInteger(progress.episode) ||
      progress.episode < 0 ||
      !finite(progress.consecutiveTurns) ||
      !Number.isInteger(progress.consecutiveTurns) ||
      progress.consecutiveTurns < 0 ||
      progress.consecutiveTurns > definition.terminalAfterTurns ||
      !Array.isArray(progress.matchedPrerequisiteGroupIds)
    )
      return false;
    const groupIds = new Set(definition.prerequisiteGroups.map(({ id }) => id));
    if (
      progress.matchedPrerequisiteGroupIds.some(
        (id) => typeof id !== "string" || !groupIds.has(id),
      ) ||
      new Set(progress.matchedPrerequisiteGroupIds).size !==
        progress.matchedPrerequisiteGroupIds.length ||
      (progress.consecutiveTurns === 0) !==
        (progress.matchedPrerequisiteGroupIds.length === 0) ||
      (progress.consecutiveTurns > 0 && progress.episode === 0)
    )
      return false;
  }

  if (value.outcome !== null) {
    if (
      !exactObject(value.outcome, ["kind", "turn", "causes"]) ||
      value.outcome.kind !== "game-over" ||
      value.outcome.turn !== value.turn ||
      !Array.isArray(value.outcome.causes) ||
      value.outcome.causes.length === 0
    )
      return false;
    const causeIds = new Set<string>();
    for (const cause of value.outcome.causes) {
      if (
        !exactObject(cause, ["gameOverId", "matchedPrerequisiteGroupIds"]) ||
        typeof cause.gameOverId !== "string" ||
        causeIds.has(cause.gameOverId) ||
        !Array.isArray(cause.matchedPrerequisiteGroupIds)
      )
        return false;
      const definition = gameOvers.get(cause.gameOverId);
      const progress = gameOverProgress[cause.gameOverId] as
        ObjectValue | undefined;
      const groupIds = new Set(
        definition?.prerequisiteGroups.map(({ id }) => id) ?? [],
      );
      if (
        !definition ||
        progress?.consecutiveTurns !== definition.terminalAfterTurns ||
        cause.matchedPrerequisiteGroupIds.length === 0 ||
        new Set(cause.matchedPrerequisiteGroupIds).size !==
          cause.matchedPrerequisiteGroupIds.length ||
        cause.matchedPrerequisiteGroupIds.some(
          (id) => typeof id !== "string" || !groupIds.has(id),
        ) ||
        cause.matchedPrerequisiteGroupIds.join("\u0000") !==
          (progress.matchedPrerequisiteGroupIds as unknown[]).join("\u0000")
      )
        return false;
      causeIds.add(cause.gameOverId);
    }
    if (
      [...gameOvers.values()].some(
        (definition) =>
          (gameOverProgress[definition.id] as ObjectValue).consecutiveTurns ===
            definition.terminalAfterTurns && !causeIds.has(definition.id),
      )
    )
      return false;
  } else if (
    [...gameOvers.values()].some(
      (definition) =>
        (gameOverProgress[definition.id] as ObjectValue).consecutiveTurns ===
        definition.terminalAfterTurns,
    )
  ) {
    return false;
  }

  const nodeIds = new Set(scenario.nodes.map(({ id }) => id));
  const grudgeIds = new Set<string>();
  for (const grudge of value.grudges) {
    if (
      !exactObject(grudge, [
        "id",
        "label",
        "target",
        "magnitude",
        "decay",
        "createdTurn",
      ]) ||
      !nonempty(grudge.id) ||
      grudgeIds.has(grudge.id) ||
      !nonempty(grudge.label) ||
      typeof grudge.target !== "string" ||
      !nodeIds.has(grudge.target) ||
      !finite(grudge.magnitude) ||
      !finite(grudge.decay) ||
      grudge.decay <= 0 ||
      grudge.decay > 1 ||
      !finite(grudge.createdTurn) ||
      !Number.isInteger(grudge.createdTurn) ||
      grudge.createdTurn < scenario.start.turn ||
      grudge.createdTurn > value.turn
    )
      return false;
    grudgeIds.add(grudge.id);
  }

  const historyIds = new Set<string>();
  for (const entry of value.history) {
    if (
      !exactObject(entry, ["id", "turn", "kind", "title", "detail"]) ||
      !nonempty(entry.id) ||
      historyIds.has(entry.id) ||
      !finite(entry.turn) ||
      !Number.isInteger(entry.turn) ||
      entry.turn < scenario.start.turn ||
      entry.turn > value.turn ||
      !["stance", "situation", "crisis", "game-over"].includes(
        String(entry.kind),
      ) ||
      !nonempty(entry.title) ||
      typeof entry.detail !== "string"
    )
      return false;
    historyIds.add(entry.id);
  }
  return true;
}

export function validateSavedGame(
  value: unknown,
  catalog: readonly LoadedScenarioCatalogEntry[],
): SavedGame | undefined {
  if (
    !exactObject(value, [
      "version",
      "scenarioId",
      "scenarioContentVersion",
      "playerName",
      "denominationName",
      "state",
    ]) ||
    value.version !== 2 ||
    typeof value.scenarioId !== "string" ||
    !finite(value.scenarioContentVersion) ||
    !Number.isInteger(value.scenarioContentVersion) ||
    !nonempty(value.playerName) ||
    value.playerName !== value.playerName.trim() ||
    value.playerName.length > 40 ||
    !nonempty(value.denominationName) ||
    value.denominationName !== value.denominationName.trim() ||
    value.denominationName.length > 60
  )
    return undefined;

  const entry = catalog.find(
    ({ scenario, contentVersion }) =>
      scenario.id === value.scenarioId &&
      contentVersion === value.scenarioContentVersion,
  );
  if (!entry || !validRuntimeState(value.state, entry.scenario))
    return undefined;
  return value as unknown as SavedGame;
}

export function loadSavedGame(
  storage: SaveStorage,
  catalog: readonly LoadedScenarioCatalogEntry[],
): SavedGameLoadResult {
  let serialized: string | null;
  try {
    serialized = storage.getItem(SAVE_STORAGE_KEY);
  } catch {
    return {
      status: "unavailable",
      message:
        "Saved progress is unavailable because browser storage could not be read.",
      discardInvalid: false,
    };
  }
  if (serialized === null) {
    try {
      if (storage.getItem(LEGACY_SAVE_STORAGE_KEY) !== null)
        return {
          status: "unavailable",
          message:
            "The previous saved game uses an older format and cannot be restored after the Game Over update.",
          discardInvalid: true,
        };
    } catch {
      return {
        status: "unavailable",
        message:
          "Saved progress is unavailable because browser storage could not be read.",
        discardInvalid: false,
      };
    }
    return { status: "empty" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    parsed = undefined;
  }
  const save = validateSavedGame(parsed, catalog);
  if (save) return { status: "ready", save };

  return {
    status: "unavailable",
    message:
      "The previous saved game was invalid or incompatible and could not be restored.",
    discardInvalid: true,
  };
}

export function storeSavedGame(
  storage: SaveStorage,
  save: SavedGame,
): string | undefined {
  try {
    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
    return undefined;
  } catch {
    return "Progress could not be saved. This game will continue in memory.";
  }
}

export function clearSavedGame(storage: SaveStorage): string | undefined {
  try {
    storage.removeItem(SAVE_STORAGE_KEY);
    storage.removeItem(LEGACY_SAVE_STORAGE_KEY);
    return undefined;
  } catch {
    return "Saved progress could not be removed from browser storage.";
  }
}

import {
  SAVE_STORAGE_KEY,
  validateSavedGame,
  type SavedGame,
  type SaveStorage,
} from "./persistence";
import type { LoadedScenarioCatalogEntry } from "./scenarioCatalog";

export const SAVED_GAMES_STORAGE_KEY = "the-denomination.saves.v1";
const LEGACY_SAVE_ID = "previous-save";

export interface SavedGameEntry {
  readonly id: string;
  readonly savedAt: string;
  readonly save: SavedGame;
}

export interface SavedGameSummary {
  readonly id: string;
  readonly denominationName?: string;
  readonly playerName?: string;
  readonly scenarioId?: string;
  readonly savedAt?: string;
  readonly turn?: number;
  readonly year?: number;
}

interface StoredEntry {
  readonly id: string;
  readonly savedAt?: unknown;
  readonly save: unknown;
}

interface StoredCollection {
  readonly version: 1;
  readonly games: readonly StoredEntry[];
  readonly lastLoadedGameId?: string;
}

function readCollection(storage: SaveStorage): StoredCollection | undefined {
  const serialized = storage.getItem(SAVED_GAMES_STORAGE_KEY);
  if (serialized === null) return undefined;
  const value: unknown = JSON.parse(serialized);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("games" in value) ||
    !Array.isArray(value.games) ||
    ("lastLoadedGameId" in value &&
      (typeof value.lastLoadedGameId !== "string" ||
        !value.lastLoadedGameId.trim()))
  )
    throw new Error("Invalid save collection");
  const ids = new Set<string>();
  for (const entry of value.games) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.id !== "string" ||
      !entry.id.trim() ||
      ids.has(entry.id)
    ) {
      throw new Error("Invalid save entry");
    }
    ids.add(entry.id);
  }
  return value as StoredCollection;
}

/** Read display metadata without validating or exposing runtime snapshots. */
export function loadSavedGames(storage: SaveStorage): {
  readonly games: readonly SavedGameSummary[];
  readonly lastLoadedGameId?: string;
  readonly message?: string;
} {
  try {
    const collection = readCollection(storage) ?? initialCollection(storage);
    const games = collection.games.map((entry) => {
      const metadata =
        entry.save && typeof entry.save === "object"
          ? (entry.save as Record<string, unknown>)
          : {};
      const state =
        metadata.state && typeof metadata.state === "object"
          ? (metadata.state as Record<string, unknown>)
          : {};
      return {
        id: entry.id,
        denominationName:
          typeof metadata.denominationName === "string"
            ? metadata.denominationName
            : undefined,
        playerName:
          typeof metadata.playerName === "string"
            ? metadata.playerName
            : undefined,
        scenarioId:
          typeof metadata.scenarioId === "string"
            ? metadata.scenarioId
            : undefined,
        savedAt:
          typeof entry.savedAt === "string" &&
          Number.isFinite(Date.parse(entry.savedAt))
            ? entry.savedAt
            : undefined,
        turn:
          typeof state.turn === "number" && Number.isFinite(state.turn)
            ? state.turn
            : undefined,
        year:
          typeof state.year === "number" && Number.isFinite(state.year)
            ? state.year
            : undefined,
      };
    });
    return {
      games,
      ...(collection.lastLoadedGameId
        ? { lastLoadedGameId: collection.lastLoadedGameId }
        : {}),
    };
  } catch {
    return {
      games: [],
      message: "Saved games could not be read from browser storage.",
    };
  }
}

/** Validate only the selected entry before it can enter the session. */
export function loadSavedGameEntry(
  storage: SaveStorage,
  catalog: readonly LoadedScenarioCatalogEntry[],
  id: string,
): { readonly game?: SavedGameEntry; readonly message?: string } {
  try {
    const collection = readCollection(storage) ?? initialCollection(storage);
    const entry = collection.games.find((game) => game.id === id);
    if (!entry)
      return { message: "The selected saved game is no longer available." };
    if (
      typeof entry.savedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.savedAt))
    ) {
      return { message: "The save timestamp is missing or invalid." };
    }
    const save = validateSavedGame(entry.save, catalog);
    if (!save)
      return {
        message:
          "The saved game is invalid or incompatible with the current Scenario catalog.",
      };
    return { game: { id, savedAt: entry.savedAt, save } };
  } catch {
    return {
      message: "The saved game could not be read from browser storage.",
    };
  }
}

/** Insert a checkpoint and select it for Continue without replacing earlier saves. */
export function storeSavedGameEntry(
  storage: SaveStorage,
  catalog: readonly LoadedScenarioCatalogEntry[],
  entry: Pick<SavedGameEntry, "id" | "save">,
): string | undefined {
  try {
    if (!entry.id.trim() || !validateSavedGame(entry.save, catalog)) {
      return "Progress could not be saved because the game snapshot is invalid.";
    }
    const collection = readCollection(storage) ?? initialCollection(storage);
    if (collection.games.some(({ id }) => id === entry.id)) {
      return "Progress could not be saved because the save slot already exists.";
    }
    storage.setItem(
      SAVED_GAMES_STORAGE_KEY,
      JSON.stringify({
        ...collection,
        lastLoadedGameId: entry.id,
        games: [
          { ...entry, savedAt: new Date().toISOString() },
          ...collection.games,
        ],
      }),
    );
    return undefined;
  } catch {
    return "Progress could not be saved. This game will continue in memory.";
  }
}

/** Carry the prior slot forward even when its content is currently incompatible. */
function initialCollection(storage: SaveStorage): StoredCollection {
  const serialized = storage.getItem(SAVE_STORAGE_KEY);
  if (serialized === null) return { version: 1, games: [] };
  let save: unknown;
  try {
    save = JSON.parse(serialized);
  } catch {
    save = serialized;
  }
  return { version: 1, games: [{ id: LEGACY_SAVE_ID, save }] };
}

export function getContinueGame(
  games: readonly SavedGameSummary[],
  lastLoadedGameId?: string,
): SavedGameSummary | undefined {
  return games.find(({ id }) => id === lastLoadedGameId) ?? games[0];
}

/** Remember a game after the caller successfully restored a validated entry. */
export function rememberLoadedGame(
  storage: SaveStorage,
  id: string,
): string | undefined {
  try {
    const collection = readCollection(storage) ?? initialCollection(storage);
    const entry = collection.games.find((game) => game.id === id);
    if (!entry) return "The selected saved game is no longer available.";
    storage.setItem(
      SAVED_GAMES_STORAGE_KEY,
      JSON.stringify({ ...collection, lastLoadedGameId: id }),
    );
    return undefined;
  } catch {
    return "The most recently loaded game could not be remembered in browser storage.";
  }
}

export function deleteSavedGameEntry(
  storage: SaveStorage,
  id: string,
): string | undefined {
  try {
    const collection = readCollection(storage) ?? initialCollection(storage);
    const { lastLoadedGameId, ...rest } = collection;
    storage.setItem(
      SAVED_GAMES_STORAGE_KEY,
      JSON.stringify({
        ...rest,
        ...(lastLoadedGameId && lastLoadedGameId !== id
          ? { lastLoadedGameId }
          : {}),
        games: collection.games.filter((game) => game.id !== id),
      }),
    );
    return undefined;
  } catch {
    return "The saved game could not be deleted from browser storage.";
  }
}

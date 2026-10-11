import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  type SavedGame,
  type SavedTurnReport,
  type SaveStorage,
} from "@/app/persistence";
import {
  deleteSavedGameEntry,
  getContinueGame,
  loadSavedGames,
  loadSavedGameEntry,
  rememberLoadedGame,
  storeSavedGameEntry,
} from "@/app/savedGames";
import {
  loadScenarioCatalog,
  type LoadedScenarioCatalogEntry,
  type ScenarioCatalogEntry,
} from "@/app/scenarioCatalog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";
import type { SimulationState } from "@/simulation";
import { SavedGameLoadDialog } from "@/ui/SavedGameLoadDialog";
import { ConfirmationDialog } from "@/ui/ConfirmationDialog";
import { GameView } from "@/ui/game/GameView";
import { LandingPage, type LandingErrors } from "@/ui/landing/LandingPage";
import { InterfaceSoundProvider } from "@/ui/sound/InterfaceSoundProvider";

interface ActiveGame {
  readonly key: number;
  readonly entry: LoadedScenarioCatalogEntry;
  readonly playerName: string;
  readonly denominationName: string;
  readonly restoredState?: SimulationState;
  readonly restoredTurnReport?: SavedTurnReport;
}

interface LaunchRequest {
  readonly loadedSaveId?: string;
  readonly entry: LoadedScenarioCatalogEntry;
  readonly playerName: string;
  readonly denominationName: string;
  readonly restoredState?: SimulationState;
  readonly restoredTurnReport?: SavedTurnReport;
}

interface PendingExit {
  readonly state: SimulationState;
  readonly turnReport?: SavedTurnReport;
}

function browserStorage(): SaveStorage {
  const fail = () => {
    throw new Error("Browser storage is unavailable");
  };
  try {
    return window.localStorage;
  } catch {
    return { getItem: fail, setItem: fail };
  }
}

function Application({
  entries,
  catalogNotice,
}: {
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly catalogNotice?: string;
}) {
  const storage = useMemo(() => browserStorage(), []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicMuted, setMusicMuted] = useState(() => {
    try {
      return window.localStorage.getItem("denomination.music-muted") === "true";
    } catch {
      return false;
    }
  });
  const toggleMusic = useCallback(() => {
    setMusicMuted((muted) => {
      const next = !muted;
      try {
        window.localStorage.setItem("denomination.music-muted", String(next));
      } catch {
        /* Storage can be unavailable. */
      }
      const audio = audioRef.current;
      if (next) {
        audio?.pause();
      } else {
        if (audio) audio.currentTime = 0;
        void audio?.play().catch((error: unknown) => {
          console.warn("Background music could not start.", error);
        });
      }
      return next;
    });
  }, []);
  const startMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicMuted) {
      void audio.play().catch((error: unknown) => {
        console.warn("Background music could not start.", error);
      });
    }
  }, [musicMuted]);

  useEffect(() => {
    if (musicMuted) return;
    const startFromGesture = () => {
      startMusic();
      window.removeEventListener("pointerdown", startFromGesture, true);
      window.removeEventListener("keydown", startFromGesture, true);
    };
    window.addEventListener("pointerdown", startFromGesture, {
      capture: true,
    });
    window.addEventListener("keydown", startFromGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", startFromGesture, true);
      window.removeEventListener("keydown", startFromGesture, true);
    };
  }, [musicMuted, startMusic]);
  const initialSave = useMemo(() => loadSavedGames(storage), [storage]);
  const savedAtLoad = getContinueGame(
    initialSave.games,
    initialSave.lastLoadedGameId,
  );
  const initialEntry =
    entries.find(({ scenario }) => scenario.id === savedAtLoad?.scenarioId) ??
    entries[0];
  const [savedGames, setSavedGames] = useState(initialSave.games);
  const [lastLoadedGameId, setLastLoadedGameId] = useState(
    initialSave.lastLoadedGameId,
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    initialEntry.scenario.id,
  );
  const [playerName, setPlayerName] = useState(savedAtLoad?.playerName ?? "");
  const [denominationName, setDenominationName] = useState(
    savedAtLoad?.denominationName ?? "",
  );
  const [notice, setNotice] = useState(initialSave.message ?? catalogNotice);
  const [errors, setErrors] = useState<LandingErrors>({});
  const [activeGame, setActiveGame] = useState<ActiveGame>();
  const [pendingExit, setPendingExit] = useState<PendingExit>();
  const runKey = useRef(0);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const loadTriggerRef = useRef<HTMLElement | null>(null);

  const launch = useCallback(
    (request: LaunchRequest) => {
      const { loadedSaveId, ...game } = request;
      startMusic();
      if (loadedSaveId && request.restoredState) {
        const warning = rememberLoadedGame(storage, loadedSaveId);
        if (!warning) setLastLoadedGameId(loadedSaveId);
        setNotice(warning ?? "Saved game loaded.");
      }
      setPlayerName(request.playerName);
      setDenominationName(request.denominationName);
      setSelectedScenarioId(request.entry.scenario.id);
      runKey.current += 1;
      setActiveGame({
        ...game,
        key: runKey.current,
      });
    },
    [startMusic, storage],
  );

  const buildLaunchRequest = (): LaunchRequest | undefined => {
    const entry = entries.find(
      ({ scenario }) => scenario.id === selectedScenarioId,
    );
    const cleanPlayerName = playerName.trim();
    const cleanDenominationName = denominationName.trim();
    const nextErrors: LandingErrors = {
      scenario: entry ? undefined : "Choose a valid scenario.",
      playerName: cleanPlayerName ? undefined : "Enter your name.",
      denominationName: cleanDenominationName
        ? undefined
        : "Enter a denomination name.",
    };
    setErrors(nextErrors);
    if (!entry || !cleanPlayerName || !cleanDenominationName) return undefined;
    return {
      entry,
      playerName: cleanPlayerName,
      denominationName: cleanDenominationName,
    };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = buildLaunchRequest();
    if (!request) return;
    launch(request);
  };

  const handleContinue = (id: string) => {
    const result = loadSavedGameEntry(storage, entries, id);
    const savedGame = result.game?.save;
    if (!savedGame) {
      const message =
        result.message ?? "This saved game is no longer available to load.";
      setNotice(message);
      return message;
    }
    const entry = entries.find(
      ({ scenario, contentVersion }) =>
        scenario.id === savedGame.scenarioId &&
        contentVersion === savedGame.scenarioContentVersion,
    );
    if (!entry) return;
    setLoadDialogOpen(false);
    launch({
      loadedSaveId: id,
      entry,
      playerName: savedGame.playerName,
      denominationName: savedGame.denominationName,
      restoredState: savedGame.state,
      restoredTurnReport: savedGame.turnReport,
    });
  };

  const saveActiveState = useCallback(
    (state: SimulationState, turnReport?: SavedTurnReport): boolean => {
      if (!activeGame) return false;
      const save: SavedGame = {
        version: 4,
        scenarioId: activeGame.entry.scenario.id,
        scenarioContentVersion: activeGame.entry.contentVersion,
        playerName: activeGame.playerName,
        denominationName: activeGame.denominationName,
        state,
        ...(turnReport ? { turnReport } : {}),
      };
      const warning = storeSavedGameEntry(storage, entries, {
        id: crypto.randomUUID(),
        save,
      });
      if (warning) {
        setNotice(warning);
        return false;
      }
      const result = loadSavedGames(storage);
      setSavedGames(result.games);
      setLastLoadedGameId(result.lastLoadedGameId);
      setNotice("Progress saved.");
      return true;
    },
    [activeGame, entries, storage],
  );

  const openLoadDialog = () => {
    loadTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const result = loadSavedGames(storage);
    setSavedGames(result.games);
    setLastLoadedGameId(result.lastLoadedGameId);
    if (result.message) setNotice(result.message);
    setLoadDialogOpen(true);
  };

  const handleDeleteSave = (id: string): boolean => {
    const warning = deleteSavedGameEntry(storage, id);
    if (warning) {
      setNotice(warning);
      return false;
    }
    const result = loadSavedGames(storage);
    setSavedGames(result.games);
    setLastLoadedGameId(result.lastLoadedGameId);
    setNotice("Saved game deleted.");
    return true;
  };

  const confirmAction = () => {
    if (!pendingExit) return;
    setPendingExit(undefined);
    setActiveGame(undefined);
  };

  const saveAndReturnToMainMenu = () => {
    if (!activeGame || !pendingExit) return;
    if (!saveActiveState(pendingExit.state, pendingExit.turnReport)) return;
    setPendingExit(undefined);
    setActiveGame(undefined);
  };

  const requestMainMenu = (
    state: SimulationState,
    turnReport?: SavedTurnReport,
  ) => {
    setPendingExit({ state, turnReport });
  };

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <Toaster position="bottom-right" />
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/denomination-theme.mp3`}
        loop
        preload="auto"
        aria-hidden="true"
      />
      {activeGame ? (
        <GameView
          key={activeGame.key}
          entry={activeGame.entry}
          playerName={activeGame.playerName}
          denominationName={activeGame.denominationName}
          restoredState={activeGame.restoredState}
          restoredTurnReport={activeGame.restoredTurnReport}
          notice={notice}
          canLoad={savedGames.length > 0}
          onSave={saveActiveState}
          onLoad={openLoadDialog}
          onMainMenu={requestMainMenu}
          musicMuted={musicMuted}
          onToggleMusic={toggleMusic}
        />
      ) : (
        <LandingPage
          entries={entries}
          savedGames={savedGames}
          onOpenLoad={openLoadDialog}
          lastLoadedGameId={lastLoadedGameId}
          selectedScenarioId={selectedScenarioId}
          playerName={playerName}
          denominationName={denominationName}
          notice={notice}
          errors={errors}
          onScenarioChange={(id) => {
            setSelectedScenarioId(id);
            setErrors((current) => ({ ...current, scenario: undefined }));
          }}
          onPlayerNameChange={(name) => {
            setPlayerName(name);
            setErrors((current) => ({ ...current, playerName: undefined }));
          }}
          onDenominationNameChange={(name) => {
            setDenominationName(name);
            setErrors((current) => ({
              ...current,
              denominationName: undefined,
            }));
          }}
          onSubmit={handleSubmit}
          onLoad={handleContinue}
          musicMuted={musicMuted}
          onToggleMusic={toggleMusic}
        />
      )}

      {loadDialogOpen && (
        <SavedGameLoadDialog
          open={loadDialogOpen}
          onOpenChange={setLoadDialogOpen}
          games={savedGames}
          entries={entries}
          lastLoadedGameId={lastLoadedGameId}
          onLoad={handleContinue}
          onDelete={handleDeleteSave}
          onReturnFocus={() => loadTriggerRef.current?.focus()}
        />
      )}

      <ConfirmationDialog
        open={Boolean(pendingExit)}
        onConfirm={confirmAction}
        onSaveAndExit={saveAndReturnToMainMenu}
        onCancel={() => setPendingExit(undefined)}
      />
    </div>
  );
}

function App({
  catalog,
}: {
  readonly catalog: readonly ScenarioCatalogEntry[];
}) {
  const loaded = useMemo(() => loadScenarioCatalog(catalog), [catalog]);
  if (loaded.entries.length === 0) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <Alert className="max-w-xl" variant="destructive">
          <AlertTitle>Unable to load Scenario catalog</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5">
              {loaded.diagnostics.map((diagnostic, index) => (
                <li key={index}>{diagnostic}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </main>
    );
  }
  return (
    <InterfaceSoundProvider>
      <Application
        entries={loaded.entries}
        catalogNotice={
          loaded.diagnostics.length
            ? "Some Scenario catalog entries could not be loaded."
            : undefined
        }
      />
    </InterfaceSoundProvider>
  );
}

export default App;

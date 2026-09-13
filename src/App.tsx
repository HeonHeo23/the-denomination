import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  clearSavedGame,
  loadSavedGame,
  storeSavedGame,
  type SavedGame,
  type SaveStorage,
} from "@/app/persistence";
import {
  loadScenarioCatalog,
  type LoadedScenarioCatalogEntry,
  type ScenarioCatalogEntry,
} from "@/app/scenarioCatalog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";
import type { SimulationState } from "@/simulation";
import { ConfirmationDialog } from "@/ui/ConfirmationDialog";
import { GameView } from "@/ui/game/GameView";
import { LandingPage, type LandingErrors } from "@/ui/landing/LandingPage";

interface ActiveGame {
  readonly key: number;
  readonly entry: LoadedScenarioCatalogEntry;
  readonly playerName: string;
  readonly denominationName: string;
  readonly restoredState?: SimulationState;
}

interface LaunchRequest {
  readonly entry: LoadedScenarioCatalogEntry;
  readonly playerName: string;
  readonly denominationName: string;
  readonly restoredState?: SimulationState;
}

type ConfirmationRequest =
  | { readonly kind: "new-game"; readonly launch: LaunchRequest }
  | { readonly kind: "main-menu" };

function unavailableStorage(): SaveStorage {
  const fail = () => {
    throw new Error("Browser storage is unavailable");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

function browserStorage(): SaveStorage {
  try {
    return window.localStorage;
  } catch {
    return unavailableStorage();
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
  const initialSave = useMemo(
    () => loadSavedGame(storage, entries),
    [entries, storage],
  );
  const savedAtLoad =
    initialSave.status === "ready" ? initialSave.save : undefined;
  const initialEntry =
    entries.find(({ scenario }) => scenario.id === savedAtLoad?.scenarioId) ??
    entries[0];
  const [savedGame, setSavedGame] = useState(savedAtLoad);
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    initialEntry.scenario.id,
  );
  const [playerName, setPlayerName] = useState(savedAtLoad?.playerName ?? "");
  const [denominationName, setDenominationName] = useState(
    savedAtLoad?.denominationName ?? "",
  );
  const [notice, setNotice] = useState(
    initialSave.status === "unavailable" ? initialSave.message : catalogNotice,
  );
  const [errors, setErrors] = useState<LandingErrors>({});
  const [activeGame, setActiveGame] = useState<ActiveGame>();
  const [confirmation, setConfirmation] = useState<ConfirmationRequest>();
  const [pendingExitState, setPendingExitState] = useState<SimulationState>();
  const runKey = useRef(0);

  useEffect(() => {
    if (initialSave.status === "unavailable" && initialSave.discardInvalid) {
      clearSavedGame(storage);
    }
  }, [initialSave, storage]);

  const launch = useCallback(
    (request: LaunchRequest) => {
      startMusic();
      setPlayerName(request.playerName);
      setDenominationName(request.denominationName);
      setSelectedScenarioId(request.entry.scenario.id);
      runKey.current += 1;
      setActiveGame({ ...request, key: runKey.current });
    },
    [startMusic],
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
    if (savedGame) setConfirmation({ kind: "new-game", launch: request });
    else launch(request);
  };

  const handleContinue = () => {
    if (!savedGame) return;
    startMusic();
    const entry = entries.find(
      ({ scenario, contentVersion }) =>
        scenario.id === savedGame.scenarioId &&
        contentVersion === savedGame.scenarioContentVersion,
    );
    if (!entry) return;
    launch({
      entry,
      playerName: savedGame.playerName,
      denominationName: savedGame.denominationName,
      restoredState: savedGame.state,
    });
  };

  const saveActiveState = useCallback(
    (state: SimulationState) => {
      if (!activeGame) return;
      const save: SavedGame = {
        version: 1,
        scenarioId: activeGame.entry.scenario.id,
        scenarioContentVersion: activeGame.entry.contentVersion,
        playerName: activeGame.playerName,
        denominationName: activeGame.denominationName,
        state,
      };
      const warning = storeSavedGame(storage, save);
      if (warning) {
        setNotice(warning);
        return;
      }
      setSavedGame(save);
      setNotice("Progress saved.");
    },
    [activeGame, storage],
  );

  const loadActiveGame = useCallback(() => {
    const result = loadSavedGame(storage, entries);
    if (result.status !== "ready") {
      setNotice(
        result.status === "unavailable"
          ? result.message
          : "No saved game is available to load.",
      );
      return;
    }
    const entry = entries.find(
      ({ scenario, contentVersion }) =>
        scenario.id === result.save.scenarioId &&
        contentVersion === result.save.scenarioContentVersion,
    );
    if (!entry) {
      setNotice(
        "The saved game is no longer compatible with this Scenario catalog.",
      );
      return;
    }
    setSavedGame(result.save);
    setPlayerName(result.save.playerName);
    setDenominationName(result.save.denominationName);
    setSelectedScenarioId(result.save.scenarioId);
    runKey.current += 1;
    setActiveGame({
      key: runKey.current,
      entry,
      playerName: result.save.playerName,
      denominationName: result.save.denominationName,
      restoredState: result.save.state,
    });
    setNotice("Saved game loaded.");
  }, [entries, storage]);

  const confirmAction = () => {
    if (!confirmation) return;
    setConfirmation(undefined);
    if (confirmation.kind === "new-game") {
      const warning = clearSavedGame(storage);
      setSavedGame(undefined);
      setNotice(warning);
      launch(confirmation.launch);
      return;
    }
    setPendingExitState(undefined);
    setActiveGame(undefined);
  };

  const saveAndReturnToMainMenu = () => {
    if (!activeGame || !pendingExitState) return;
    saveActiveState(pendingExitState);
    setPendingExitState(undefined);
    setConfirmation(undefined);
    setActiveGame(undefined);
  };

  const requestMainMenu = (state: SimulationState) => {
    setPendingExitState(state);
    setConfirmation({ kind: "main-menu" });
  };

  return (
    <div
      className="h-dvh overflow-hidden bg-background"
      onPointerDownCapture={startMusic}
      onKeyDownCapture={startMusic}
    >
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
          notice={notice}
          savedGame={savedGame}
          onSave={saveActiveState}
          onLoad={loadActiveGame}
          onMainMenu={requestMainMenu}
          musicMuted={musicMuted}
          onToggleMusic={toggleMusic}
        />
      ) : (
        <LandingPage
          entries={entries}
          savedGame={savedGame}
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

      <ConfirmationDialog
        kind={confirmation?.kind}
        onConfirm={confirmAction}
        onSaveAndExit={saveAndReturnToMainMenu}
        onCancel={() => setConfirmation(undefined)}
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
    <Application
      entries={loaded.entries}
      catalogNotice={
        loaded.diagnostics.length
          ? "Some Scenario catalog entries could not be loaded."
          : undefined
      }
    />
  );
}

export default App;

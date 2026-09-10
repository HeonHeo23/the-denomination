import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useGameSession } from "./app/useGameSession";
import {
  clearSavedGame,
  loadSavedGame,
  storeSavedGame,
  type SavedGame,
  type SaveStorage,
} from "./app/persistence";
import {
  loadScenarioCatalog,
  type LoadedScenarioCatalogEntry,
  type ScenarioCatalogEntry,
} from "./app/scenarioCatalog";
import type { SimulationState } from "./simulation";
import { formatValue } from "./ui/formatValue";
import { SimulationGraph } from "./ui/graph/SimulationGraph";
import { NodeDetailsModal } from "./ui/panels/NodeDetailsModal";
import { TurnReportModal } from "./ui/panels/TurnReportModal";
import {
  projectTurnReport,
  type TurnReport,
} from "./ui/panels/projectTurnReport";
import "./App.css";

type ViewPhase = "landing" | "entering" | "game";

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
  | { readonly kind: "change-setup" };

interface FlightBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface BrandFlight {
  readonly text: string;
  readonly from: FlightBox;
  readonly to: FlightBox;
  readonly style: CSSProperties;
}

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

function box(element: HTMLElement): FlightBox {
  const bounds = element.getBoundingClientRect();
  return {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  };
}

function LandingPage({
  entries,
  savedGame,
  selectedScenarioId,
  playerName,
  denominationName,
  notice,
  errors,
  isExiting,
  brandRef,
  onScenarioChange,
  onPlayerNameChange,
  onDenominationNameChange,
  onSubmit,
  onLoad,
}: {
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly savedGame?: SavedGame;
  readonly selectedScenarioId: string;
  readonly playerName: string;
  readonly denominationName: string;
  readonly notice?: string;
  readonly errors: {
    readonly scenario?: string;
    readonly playerName?: string;
    readonly denominationName?: string;
  };
  readonly isExiting: boolean;
  readonly brandRef: RefObject<HTMLHeadingElement | null>;
  readonly onScenarioChange: (id: string) => void;
  readonly onPlayerNameChange: (name: string) => void;
  readonly onDenominationNameChange: (name: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onLoad: () => void;
}) {
  const selected = entries.find(
    ({ scenario }) => scenario.id === selectedScenarioId,
  );
  const savedEntry = savedGame
    ? entries.find(({ scenario }) => scenario.id === savedGame.scenarioId)
    : undefined;

  return (
    <main
      className={`landing-page${isExiting ? " landing-page--exiting" : ""}`}
      aria-hidden={isExiting}
      inert={isExiting ? true : undefined}
    >
      <div className="landing-atmosphere" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <section className="landing-intro" aria-labelledby="landing-title">
        <div className="landing-product-mark">The Denomination</div>
        <p className="landing-eyebrow">
          A causal simulation of faith and institution
        </p>
        <h1
          id="landing-title"
          className="landing-brand-anchor"
          ref={brandRef}
          title={denominationName.trim() || undefined}
        >
          {denominationName.trim() || "Name your denomination"}
        </h1>
      </section>

      <section className="landing-actions" aria-label="Begin a game">
        {notice && (
          <div className="landing-notice" role="status">
            {notice}
          </div>
        )}

        {savedGame && savedEntry && (
          <article className="saved-game-card">
            <div>
              <span>Saved game</span>
              <h2>{savedGame.denominationName}</h2>
              <p>
                {savedEntry.scenario.title} · Led by {savedGame.playerName}
              </p>
            </div>
            <div className="saved-game-card__progress">
              <span>
                {savedGame.state.year === undefined ? "Turn" : "Year"}
              </span>
              <strong>{savedGame.state.year ?? savedGame.state.turn}</strong>
              {savedGame.state.year !== undefined && (
                <small>Turn {savedGame.state.turn}</small>
              )}
            </div>
            <button type="button" onClick={onLoad} disabled={isExiting}>
              Load saved game <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        <form className="setup-card" onSubmit={onSubmit} noValidate>
          <div className="setup-card__heading">
            <span>
              {savedGame ? "Start another history" : "Found an institution"}
            </span>
            <h2>Prepare your scenario</h2>
          </div>

          <label className="setup-field">
            <span>Scenario</span>
            <select
              value={selectedScenarioId}
              onChange={(event) => onScenarioChange(event.target.value)}
              aria-invalid={Boolean(errors.scenario)}
              aria-describedby={errors.scenario ? "scenario-error" : undefined}
              required
            >
              {entries.map(({ scenario }) => (
                <option value={scenario.id} key={scenario.id}>
                  {scenario.title}
                </option>
              ))}
            </select>
            {errors.scenario && (
              <small className="setup-field__error" id="scenario-error">
                {errors.scenario}
              </small>
            )}
          </label>

          {selected && (
            <div className="scenario-preview">
              <span>
                Begins ·{" "}
                {selected.scenario.start.year ??
                  `Turn ${selected.scenario.start.turn}`}
              </span>
              <p>{selected.scenario.description}</p>
            </div>
          )}

          <div className="setup-fields-row">
            <label className="setup-field">
              <span>Your name</span>
              <input
                type="text"
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                placeholder="e.g. Avery Morgan"
                maxLength={40}
                autoComplete="name"
                aria-invalid={Boolean(errors.playerName)}
                aria-describedby={
                  errors.playerName ? "player-name-error" : undefined
                }
                required
              />
              {errors.playerName && (
                <small className="setup-field__error" id="player-name-error">
                  {errors.playerName}
                </small>
              )}
            </label>
            <label className="setup-field">
              <span>Denomination name</span>
              <input
                type="text"
                value={denominationName}
                onChange={(event) =>
                  onDenominationNameChange(event.target.value)
                }
                placeholder="e.g. The Common Fellowship"
                maxLength={60}
                aria-invalid={Boolean(errors.denominationName)}
                aria-describedby={
                  errors.denominationName
                    ? "denomination-name-error"
                    : undefined
                }
                required
              />
              {errors.denominationName && (
                <small
                  className="setup-field__error"
                  id="denomination-name-error"
                >
                  {errors.denominationName}
                </small>
              )}
            </label>
          </div>

          <button className="start-button" type="submit" disabled={isExiting}>
            Start the simulation <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}

function ConfirmationDialog({
  request,
  onConfirm,
  onCancel,
}: {
  readonly request?: ConfirmationRequest;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const isReplacement = request?.kind === "new-game";
  return (
    <dialog
      className="confirmation-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={onCancel}
    >
      <form method="dialog">
        <span>{isReplacement ? "Replace saved game" : "Change setup"}</span>
        <h2>
          {isReplacement ? "Begin a new history?" : "Discard this history?"}
        </h2>
        <p>
          {isReplacement
            ? "Starting a new game will permanently replace the progress currently saved in this browser."
            : "Returning to setup will permanently discard this game’s simulation progress."}
        </p>
        <div className="confirmation-dialog__actions">
          <button type="submit">Keep current game</button>
          <button className="is-destructive" type="submit" onClick={onConfirm}>
            {isReplacement ? "Start new game" : "Discard and return"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DashboardDrawer({
  title,
  subtitle,
  open,
  onClose,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="dashboard-drawer"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dashboard-drawer__surface">
        <header className="dashboard-drawer__heading">
          <div>
            <span>{subtitle}</span>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

function GameView({
  game,
  phase,
  notice,
  headerBrandRef,
  savedGame,
  onSave,
  onLoad,
  onChangeSetup,
}: {
  readonly game: ActiveGame;
  readonly phase: ViewPhase;
  readonly notice?: string;
  readonly headerBrandRef: RefObject<HTMLElement | null>;
  readonly savedGame?: SavedGame;
  readonly onSave: (state: SimulationState) => void;
  readonly onLoad: () => void;
  readonly onChangeSetup: () => void;
}) {
  const session = useGameSession(game.entry.scenario, game.restoredState);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [turnReport, setTurnReport] = useState<TurnReport>();
  const previousState = useRef<SimulationState | undefined>(undefined);
  const [activeDrawer, setActiveDrawer] = useState<
    "situations" | "chronicle"
  >();

  useEffect(() => {
    if (!session.ok) {
      previousState.current = undefined;
      return;
    }
    const before = previousState.current;
    if (before && session.state.turn > before.turn)
      setTurnReport(projectTurnReport(session.scenario, before, session.state));
    else if (before && session.state.turn !== before.turn)
      setTurnReport(undefined);
    previousState.current = session.state;
  }, [session]);

  if (!session.ok)
    return (
      <main className="load-error">
        <h1>Unable to load Scenario</h1>
        <ul>
          {session.diagnostics.map((diagnostic, index) => (
            <li key={index}>{diagnostic}</li>
          ))}
        </ul>
      </main>
    );
  const scenario = session.scenario;
  const resources = scenario.nodes.filter((node) => node.type === "resource");
  const situations = scenario.nodes.filter((node) => node.type === "situation");
  const selectedDefinition = scenario.nodes.find(
    ({ id }) => id === selectedNodeId,
  );
  const selectedRuntime = selectedDefinition
    ? session.state.nodes[selectedDefinition.id]
    : undefined;

  return (
    <div
      className={`app-shell${phase === "entering" ? " app-shell--entering" : ""}`}
      aria-hidden={phase === "entering"}
    >
      <header className="topbar">
        <div className="wordmark">
          <div className="wordmark__identity">
            <span>Current denomination</span>
            <strong ref={headerBrandRef} title={game.denominationName}>
              {game.denominationName}
            </strong>
            <small title={game.playerName}>Led by {game.playerName}</small>
          </div>
          <button
            className="change-setup-button"
            type="button"
            onClick={onChangeSetup}
          >
            Change setup
          </button>
        </div>
        <div className="scenario-header">
          <span>Active scenario</span>
          <strong>{scenario.title}</strong>
          <p>{scenario.description}</p>
        </div>
        <div className="turn-display">
          <span>{session.state.year === undefined ? "Turn" : "Year"}</span>
          <strong>{session.state.year ?? session.state.turn}</strong>
          <small>Turn {session.state.turn}</small>
        </div>
        {resources.map((resource) => (
          <div className="resource-display" key={resource.id}>
            <span>{resource.name}</span>
            <strong>{session.state.nodes[resource.id].value.toFixed(1)}</strong>
          </div>
        ))}
        <button
          className="advance-button"
          type="button"
          onClick={session.nextTurn}
        >
          Advance turn <span aria-hidden="true">→</span>
        </button>
      </header>

      <main>
        <section className="simulation-workspace">
          <div className="graph-toolbar">
            <p className="graph-instruction">
              Click a node for details. Hover to trace its Effects.
            </p>
            <div className="graph-toolbar__actions">
              <div className="legend" aria-label="Graph legend">
                <span>
                  <i className="positive" /> Positive
                </span>
                <span>
                  <i className="negative" /> Negative
                </span>
                <span>
                  <i className="inactive" /> Inactive
                </span>
              </div>
              <div className="workspace-drawer-actions">
                <button
                  type="button"
                  aria-expanded={activeDrawer === "situations"}
                  aria-controls="situations-drawer"
                  onClick={() => setActiveDrawer("situations")}
                >
                  Situations
                </button>
                <button
                  type="button"
                  aria-expanded={activeDrawer === "chronicle"}
                  aria-controls="chronicle-drawer"
                  onClick={() => setActiveDrawer("chronicle")}
                >
                  Chronicle
                </button>
              </div>
            </div>
          </div>
          <div className="graph-frame">
            <SimulationGraph
              scenario={scenario}
              state={session.state}
              onNodeSelect={setSelectedNodeId}
            />
          </div>
          <footer className="statusbar">
            <p aria-live="polite">{notice ?? session.message}</p>
            <div className="statusbar-actions" aria-label="Game actions">
              <button
                className="persistence-button"
                type="button"
                onClick={() => onSave(session.state)}
              >
                Save game
              </button>
              <button
                className="persistence-button"
                type="button"
                onClick={onLoad}
                disabled={!savedGame}
              >
                Load game
              </button>
              <button type="button" onClick={session.reset}>
                Reset scenario
              </button>
            </div>
          </footer>
        </section>

        <DashboardDrawer
          title="Situations"
          subtitle="Threshold driven"
          open={activeDrawer === "situations"}
          onClose={() => setActiveDrawer(undefined)}
        >
          <div className="situation-list" id="situations-drawer">
            {situations.map((situation) => {
              const runtime = session.state.nodes[situation.id];
              return (
                <div
                  key={situation.id}
                  className={runtime.isActive ? "is-active" : ""}
                >
                  <span>{situation.name}</span>
                  <strong>
                    {formatValue(runtime.value, situation.domain)}
                  </strong>
                  <small>{runtime.isActive ? "Active" : "Inactive"}</small>
                </div>
              );
            })}
          </div>
        </DashboardDrawer>

        <DashboardDrawer
          title="Chronicle"
          subtitle={`${session.state.grudges.length} active effects`}
          open={activeDrawer === "chronicle"}
          onClose={() => setActiveDrawer(undefined)}
        >
          <div id="chronicle-drawer">
            {session.state.history.length === 0 ? (
              <div className="empty-chronicle">
                <span>Turn {scenario.start.turn}</span>
                <p>No recorded changes yet.</p>
              </div>
            ) : (
              <ol className="chronicle-list">
                {[...session.state.history]
                  .reverse()
                  .slice(0, 8)
                  .map((entry) => (
                    <li key={entry.id}>
                      <span>Turn {entry.turn}</span>
                      <strong>{entry.title}</strong>
                      <p>{entry.detail}</p>
                    </li>
                  ))}
              </ol>
            )}
            {session.state.grudges.length > 0 && (
              <div className="active-grudges">
                <h3>Temporary effects</h3>
                {session.state.grudges.map((grudge) => (
                  <div key={grudge.id}>
                    <span>{grudge.label}</span>
                    <strong>
                      {grudge.magnitude > 0 ? "+" : ""}
                      {grudge.magnitude.toFixed(3)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardDrawer>
      </main>

      {selectedDefinition && selectedRuntime && (
        <NodeDetailsModal
          key={selectedDefinition.id}
          definition={selectedDefinition}
          runtime={selectedRuntime}
          scenario={scenario}
          state={session.state}
          message={session.message}
          onApply={session.setStance}
          onClose={() => setSelectedNodeId(undefined)}
        />
      )}
      {turnReport && (
        <TurnReportModal
          report={turnReport}
          onClose={() => setTurnReport(undefined)}
        />
      )}
    </div>
  );
}

function Application({
  entries,
  catalogNotice,
}: {
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly catalogNotice?: string;
}) {
  const storage = useMemo(() => browserStorage(), []);
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
  const [errors, setErrors] = useState<{
    scenario?: string;
    playerName?: string;
    denominationName?: string;
  }>({});
  const [activeGame, setActiveGame] = useState<ActiveGame>();
  const [phase, setPhase] = useState<ViewPhase>("landing");
  const [confirmation, setConfirmation] = useState<ConfirmationRequest>();
  const [flight, setFlight] = useState<BrandFlight>();
  const runKey = useRef(0);
  const landingBrandRef = useRef<HTMLHeadingElement>(null);
  const headerBrandRef = useRef<HTMLElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSave.status === "unavailable" && initialSave.discardInvalid)
      clearSavedGame(storage);
  }, [initialSave, storage]);

  const launch = useCallback((request: LaunchRequest) => {
    setPlayerName(request.playerName);
    setDenominationName(request.denominationName);
    setSelectedScenarioId(request.entry.scenario.id);
    runKey.current += 1;
    setActiveGame({ ...request, key: runKey.current });
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setPhase(reduceMotion ? "game" : "entering");
  }, []);

  useLayoutEffect(() => {
    if (phase !== "entering") return;
    const source = landingBrandRef.current;
    const target = headerBrandRef.current;
    if (!source || !target) {
      setPhase("game");
      return;
    }
    const sourceStyle = getComputedStyle(source);
    setFlight({
      text: activeGame?.denominationName ?? "",
      from: box(source),
      to: box(target),
      style: {
        color: sourceStyle.color,
        fontFamily: sourceStyle.fontFamily,
        fontSize: sourceStyle.fontSize,
        fontWeight: sourceStyle.fontWeight,
        letterSpacing: sourceStyle.letterSpacing,
        lineHeight: sourceStyle.lineHeight,
      },
    });
  }, [activeGame?.denominationName, phase]);

  useEffect(() => {
    const element = flightRef.current;
    if (!flight || !element) return;
    const scale = flight.to.height / Math.max(flight.from.height, 1);
    const animation = element.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        {
          opacity: 1,
          transform: `translate3d(${flight.to.left - flight.from.left}px, ${flight.to.top - flight.from.top}px, 0) scale(${scale})`,
        },
      ],
      {
        duration: 620,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
    animation.finished
      .then(() => {
        setFlight(undefined);
        setPhase("game");
      })
      .catch(() => undefined);
    return () => animation.cancel();
  }, [flight]);

  const buildLaunchRequest = (): LaunchRequest | undefined => {
    const entry = entries.find(
      ({ scenario }) => scenario.id === selectedScenarioId,
    );
    const cleanPlayerName = playerName.trim();
    const cleanDenominationName = denominationName.trim();
    const nextErrors = {
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
    if (phase !== "landing") return;
    const request = buildLaunchRequest();
    if (!request) return;
    if (savedGame) setConfirmation({ kind: "new-game", launch: request });
    else launch(request);
  };

  const handleContinue = () => {
    if (!savedGame || phase !== "landing") return;
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
    setPhase("game");
  }, [entries, storage]);

  const confirmAction = () => {
    if (!confirmation) return;
    const warning = clearSavedGame(storage);
    setSavedGame(undefined);
    setConfirmation(undefined);
    setNotice(warning);
    if (confirmation.kind === "new-game") launch(confirmation.launch);
    else {
      setActiveGame(undefined);
      setFlight(undefined);
      setPhase("landing");
    }
  };

  return (
    <div className={`application-root application-root--${phase}`}>
      {phase !== "game" && (
        <LandingPage
          entries={entries}
          savedGame={savedGame}
          selectedScenarioId={selectedScenarioId}
          playerName={playerName}
          denominationName={denominationName}
          notice={notice}
          errors={errors}
          isExiting={phase === "entering"}
          brandRef={landingBrandRef}
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
        />
      )}

      {activeGame && (
        <div className={`game-layer game-layer--${phase}`}>
          <GameView
            key={activeGame.key}
            game={activeGame}
            phase={phase}
            notice={notice}
            headerBrandRef={headerBrandRef}
            savedGame={savedGame}
            onSave={saveActiveState}
            onLoad={loadActiveGame}
            onChangeSetup={() => setConfirmation({ kind: "change-setup" })}
          />
        </div>
      )}

      {flight && (
        <div
          className="shared-brand-flight"
          ref={flightRef}
          aria-hidden="true"
          style={{
            ...flight.style,
            left: flight.from.left,
            top: flight.from.top,
            width: flight.from.width,
          }}
        >
          {flight.text}
        </div>
      )}

      <ConfirmationDialog
        request={confirmation}
        onConfirm={confirmAction}
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
  if (loaded.entries.length === 0)
    return (
      <main className="load-error">
        <h1>Unable to load Scenario catalog</h1>
        <ul>
          {loaded.diagnostics.map((diagnostic, index) => (
            <li key={index}>{diagnostic}</li>
          ))}
        </ul>
      </main>
    );
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

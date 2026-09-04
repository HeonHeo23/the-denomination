import { useMemo } from "react";
import { useGameSession } from "./app/useGameSession";
import { exampleScenario } from "./scenarios/example";
import { SimulationGraph } from "./ui/graph/SimulationGraph";
import { DilemmaPanel } from "./ui/panels/DilemmaPanel";
import { StanceControls } from "./ui/panels/StanceControls";
import "./App.css";

function App() {
  const session = useGameSession(exampleScenario);
  const resource = exampleScenario.nodes.find(
    (node) => node.type === "resource",
  );
  const pendingDilemma = useMemo(
    () =>
      session.state.pendingDilemma
        ? exampleScenario.dilemmas.find(
            ({ id }) => id === session.state.pendingDilemma?.dilemmaId,
          )
        : undefined,
    [session.state.pendingDilemma],
  );
  const situations = exampleScenario.nodes.filter(
    (node) => node.type === "situation",
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">
          <span>The</span>
          <strong>Denomination</strong>
        </div>
        <div className="turn-display">
          <span>Year</span>
          <strong>{session.state.year}</strong>
          <small>Turn {session.state.turn}</small>
        </div>
        {resource && (
          <div className="resource-display">
            <span>{resource.name}</span>
            <strong>{session.state.nodes[resource.id].value.toFixed(1)}</strong>
          </div>
        )}
        <button
          className="advance-button"
          type="button"
          onClick={session.nextTurn}
        >
          Advance year <span aria-hidden="true">→</span>
        </button>
      </header>

      <main>
        <aside className="control-panel">
          <div className="scenario-intro">
            <span>Scenario · 1980</span>
            <h1>{exampleScenario.title}</h1>
            <p>{exampleScenario.description}</p>
          </div>
          <section>
            <div className="section-heading">
              <h2>Stances</h2>
              <span>Direct control</span>
            </div>
            <StanceControls
              scenario={exampleScenario}
              state={session.state}
              onApply={session.setStance}
            />
          </section>
          <section>
            <div className="section-heading">
              <h2>Situations</h2>
              <span>Threshold driven</span>
            </div>
            <div className="situation-list">
              {situations.map((situation) => {
                const runtime = session.state.nodes[situation.id];
                return (
                  <div
                    key={situation.id}
                    className={runtime.isActive ? "is-active" : ""}
                  >
                    <span>{situation.name}</span>
                    <strong>{Math.round(runtime.value * 100)}%</strong>
                    <small>{runtime.isActive}</small>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="simulation-workspace">
          <div className="workspace-heading">
            <div>
              <span>Live causal model</span>
              <h2>Institutional landscape</h2>
            </div>
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
          </div>
          <div className="graph-frame">
            <SimulationGraph scenario={exampleScenario} state={session.state} />
          </div>
          <footer className="statusbar">
            <p aria-live="polite">{session.message}</p>
            <button type="button" onClick={session.reset}>
              Reset scenario
            </button>
          </footer>
        </section>

        <aside className="chronicle-panel">
          <div className="section-heading">
            <h2>Chronicle</h2>
            <span>{session.state.grudges.length} active effects</span>
          </div>
          {session.state.history.length === 0 ? (
            <div className="empty-chronicle">
              <span>1980</span>
              <p>No incidents have altered the Fellowship yet.</p>
            </div>
          ) : (
            <ol className="chronicle-list">
              {[...session.state.history]
                .reverse()
                .slice(0, 8)
                .map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.turn === 0 ? 1980 : 1980 + entry.turn}</span>
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
        </aside>
      </main>

      {pendingDilemma && (
        <DilemmaPanel
          dilemma={pendingDilemma}
          onChoose={(choiceId) =>
            session.resolveDilemma(pendingDilemma.id, choiceId)
          }
        />
      )}
    </div>
  );
}

export default App;

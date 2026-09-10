import { useEffect, useRef } from "react";
import type { TurnReport, TurnReportChange } from "./projectTurnReport";
import { nodeTypeLabel } from "./projectTurnReport";
import { formatValue } from "../formatValue";

interface TurnReportModalProps {
  readonly report: TurnReport;
  readonly onClose: () => void;
}

function signedValue(value: number, digits = 3): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function statusChange(change: TurnReportChange): string | undefined {
  if (change.previousActive === change.isActive) return undefined;
  return change.isActive ? "Became active" : "Became inactive";
}

function ChangeRow({ change }: { readonly change: TurnReportChange }) {
  const status = statusChange(change);
  return (
    <li className="turn-report__change">
      <div>
        <strong>{change.node.name}</strong>
        <span>{nodeTypeLabel(change.node.type)}</span>
        {status && <small>{status}</small>}
      </div>
      <output>
        {formatValue(change.previousValue, change.node.domain)} →{" "}
        {formatValue(change.value, change.node.domain)}
        {Math.abs(change.delta) > 1e-9 && (
          <small className={change.delta > 0 ? "is-positive" : "is-negative"}>
            {signedValue(change.delta)}
          </small>
        )}
      </output>
    </li>
  );
}

/** A transient, accessible summary of the most recently completed turn. */
export function TurnReportModal({ report, onClose }: TurnReportModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      if (dialog?.open) dialog.close();
      previouslyFocused.current?.focus();
    };
  }, []);

  const heading =
    report.year === undefined ? `Turn ${report.turn}` : `Year ${report.year}`;
  const hasOutcomes =
    report.changes.length > 0 ||
    report.situationTransitions.length > 0 ||
    report.grudges.length > 0;

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-middle turn-report-modal"
      aria-labelledby="turn-report-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="modal-box turn-report-modal__surface">
        <header className="turn-report-modal__header">
          <div>
            <span>Turn report</span>
            <h2 id="turn-report-title">{heading}</h2>
            {report.year !== undefined && <p>Turn {report.turn}</p>}
          </div>
          <button
            className="btn turn-report-modal__close"
            type="button"
            aria-label="Close turn report"
            autoFocus
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {!hasOutcomes ? (
          <p className="turn-report__empty">No persistent changes this turn.</p>
        ) : (
          <>
            {report.highlights.length > 0 && (
              <section
                className="turn-report__section"
                aria-labelledby="turn-highlights-title"
              >
                <h3 id="turn-highlights-title">Largest changes</h3>
                <ol className="turn-report__changes">
                  {report.highlights.map((change) => (
                    <ChangeRow change={change} key={change.node.id} />
                  ))}
                </ol>
              </section>
            )}

            {report.situationTransitions.length > 0 && (
              <section
                className="turn-report__section"
                aria-labelledby="turn-situations-title"
              >
                <h3 id="turn-situations-title">Situation changes</h3>
                <ul className="turn-report__transitions">
                  {report.situationTransitions.map((transition) => (
                    <li key={transition.node.id}>
                      <strong>{transition.node.name}</strong>
                      <span>
                        {transition.kind === "began" ? "Began" : "Ended"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {report.grudges.length > 0 && (
              <section
                className="turn-report__section"
                aria-labelledby="turn-effects-title"
              >
                <h3 id="turn-effects-title">Temporary effects</h3>
                <ul className="turn-report__grudges">
                  {report.grudges.map((grudge) => (
                    <li key={grudge.id}>
                      <div>
                        <strong>{grudge.label}</strong>
                        <span>Affecting {grudge.targetName}</span>
                      </div>
                      <output
                        className={
                          grudge.magnitude > 0 ? "is-positive" : "is-negative"
                        }
                      >
                        {signedValue(grudge.magnitude)}
                      </output>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {report.changes.length > report.highlights.length && (
              <details className="collapse collapse-arrow turn-report__all-changes">
                <summary className="collapse-title">
                  Review all changes ({report.changes.length})
                </summary>
                <div className="collapse-content">
                  <ol className="turn-report__changes">
                    {report.changes.map((change) => (
                      <ChangeRow change={change} key={change.node.id} />
                    ))}
                  </ol>
                </div>
              </details>
            )}
          </>
        )}
        <footer className="modal-action turn-report-modal__actions">
          <button
            className="btn turn-report-modal__continue"
            type="button"
            onClick={onClose}
          >
            Continue
          </button>
        </footer>
      </article>
    </dialog>
  );
}

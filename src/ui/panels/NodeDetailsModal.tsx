import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type {
  NodeDefinition,
  NodeRuntimeState,
  ScenarioDefinition,
  StanceDefinition,
} from "../../simulation";

interface NodeDetailsModalProps {
  readonly definition: NodeDefinition;
  readonly runtime: NodeRuntimeState;
  readonly scenario: ScenarioDefinition;
  readonly message: string;
  readonly onApply: (stanceId: string, value: number) => void;
  readonly onClose: () => void;
}

function formatValue(value: number, definition: NodeDefinition): string {
  const isProportion = definition.domain.min >= 0 && definition.domain.max <= 1;
  return isProportion ? `${Math.round(value * 100)}%` : value.toFixed(1);
}

interface StanceEditorProps {
  readonly definition: StanceDefinition;
  readonly value: number;
  readonly scenario: ScenarioDefinition;
  readonly message: string;
  readonly onApply: (value: number) => void;
}

function StanceEditor({
  definition,
  value,
  scenario,
  message,
  onApply,
}: StanceEditorProps) {
  const [draft, setDraft] = useState(value);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const amountChanged = Math.abs(draft - value);
  const resource = definition.cost
    ? scenario.nodes.find(({ id }) => id === definition.cost?.resourceId)
    : undefined;
  const cost =
    definition.cost && amountChanged > 0
      ? definition.cost.base + definition.cost.perPoint * amountChanged
      : 0;

  const apply = () => {
    onApply(draft);
    setHasSubmitted(true);
  };

  return (
    <section className="stance-editor" aria-labelledby="stance-editor-title">
      <div className="stance-editor__heading">
        <div>
          <span>Player control</span>
          <h3 id="stance-editor-title">Adjust Stance</h3>
        </div>
        <output>{formatValue(draft, definition)}</output>
      </div>

      {definition.control.kind === "continuous" ? (
        <input
          aria-label={`Set ${definition.name}`}
          type="range"
          min={definition.domain.min}
          max={definition.domain.max}
          step={definition.control.step ?? 0.01}
          value={draft}
          onChange={(event) => {
            setDraft(Number(event.target.value));
            setHasSubmitted(false);
          }}
        />
      ) : (
        <select
          aria-label={`Set ${definition.name}`}
          value={draft}
          onChange={(event) => {
            setDraft(Number(event.target.value));
            setHasSubmitted(false);
          }}
        >
          {definition.control.states.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      )}

      <div className="stance-editor__footer">
        <div>
          <span>
            {definition.cost
              ? `Change cost: ${cost.toFixed(1)} ${resource?.name ?? "Resource"}`
              : "No Resource cost"}
          </span>
          {definition.cost?.maxChange !== undefined && (
            <small>
              Maximum per action:{" "}
              {formatValue(definition.cost.maxChange, definition)}
            </small>
          )}
        </div>
        <button type="button" disabled={draft === value} onClick={apply}>
          Apply
        </button>
      </div>

      {hasSubmitted && (
        <p className="stance-editor__feedback" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}

function activationLabel(runtime: NodeRuntimeState): string {
  if (runtime.isForced) return "Forced active";
  return runtime.isActive ? "Active" : "Inactive";
}

export function NodeDetailsModal({
  definition,
  runtime,
  scenario,
  message,
  onApply,
  onClose,
}: NodeDetailsModalProps) {
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

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="node-modal"
      aria-labelledby="node-modal-title"
      aria-describedby="node-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <article className="node-modal__surface">
        <header className="node-modal__header">
          <div>
            <span>{definition.category ?? "Uncategorized"}</span>
            <h2 id="node-modal-title">{definition.name}</h2>
          </div>
          <button
            className="node-modal__close"
            type="button"
            aria-label={`Close ${definition.name} details`}
            autoFocus
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <p id="node-modal-description" className="node-modal__description">
          {definition.description}
        </p>

        <dl className="node-modal__details">
          <div>
            <dt>Type</dt>
            <dd>{definition.type}</dd>
          </div>
          <div>
            <dt>Current value</dt>
            <dd>{formatValue(runtime.value, definition)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{activationLabel(runtime)}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>
              {formatValue(definition.domain.min, definition)}–
              {formatValue(definition.domain.max, definition)}
            </dd>
          </div>
          {definition.baselineValue !== undefined && (
            <div>
              <dt>Baseline</dt>
              <dd>{formatValue(definition.baselineValue, definition)}</dd>
            </div>
          )}
          {definition.type === "faction" && (
            <div>
              <dt>Value meaning</dt>
              <dd>{definition.valueMeaning}</dd>
            </div>
          )}
          {definition.type === "situation" && (
            <>
              <div>
                <dt>Starts at</dt>
                <dd>{formatValue(definition.startThreshold, definition)}</dd>
              </div>
              <div>
                <dt>Stops at</dt>
                <dd>{formatValue(definition.stopThreshold, definition)}</dd>
              </div>
            </>
          )}
        </dl>

        {definition.type === "stance" && (
          <StanceEditor
            definition={definition}
            value={runtime.value}
            scenario={scenario}
            message={message}
            onApply={(value) => onApply(definition.id, value)}
          />
        )}
      </article>
    </dialog>
  );
}

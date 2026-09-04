import { useState } from "react";
import type {
  ScenarioDefinition,
  SimulationState,
  StanceDefinition,
} from "../../simulation";

interface StanceControlProps {
  readonly definition: StanceDefinition;
  readonly value: number;
  readonly onApply: (value: number) => void;
}

function StanceControl({ definition, value, onApply }: StanceControlProps) {
  const [draft, setDraft] = useState(value);
  const step =
    definition.control.kind === "continuous"
      ? definition.control.step
      : undefined;

  return (
    <article className="stance-control">
      <div className="stance-control__heading">
        <div>
          <span>{definition.category}</span>
          <h3>{definition.name}</h3>
        </div>
        <output>{Math.round(draft * 100)}%</output>
      </div>
      <p>{definition.description}</p>
      {definition.control.kind === "continuous" ? (
        <input
          aria-label={definition.name}
          type="range"
          min={definition.domain.min}
          max={definition.domain.max}
          step={step ?? 0.01}
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
        />
      ) : (
        <select
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
        >
          {definition.control.states.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      )}
      <div className="stance-control__footer">
        <small>
          {definition.cost
            ? `Current change: ${(definition.cost.base + definition.cost.perPoint * Math.abs(draft - value)).toFixed(1)} Authority`
            : "No Resource cost"}
        </small>
        <button
          type="button"
          disabled={draft === value}
          onClick={() => onApply(draft)}
        >
          Apply
        </button>
      </div>
    </article>
  );
}

interface StanceControlsProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onApply: (stanceId: string, value: number) => void;
}

export function StanceControls({
  scenario,
  state,
  onApply,
}: StanceControlsProps) {
  const stances = scenario.nodes.filter(
    (node): node is StanceDefinition => node.type === "stance",
  );
  return (
    <div className="stance-list">
      {stances.map((stance) => (
        <StanceControl
          key={`${stance.id}:${state.nodes[stance.id].value}`}
          definition={stance}
          value={state.nodes[stance.id].value}
          onApply={(value) => onApply(stance.id, value)}
        />
      ))}
    </div>
  );
}

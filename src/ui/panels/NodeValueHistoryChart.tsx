import {
  useId,
  useState,
  type CSSProperties,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import type {
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { formatValue } from "@/ui/formatValue";
import {
  historyYearMarkLabels,
  nearestHistoryPointIndex,
  nextHistoryPointIndex,
  projectNodeValueHistory,
} from "./projectNodeValueHistory";

interface NodeValueHistoryChartProps {
  readonly definition: NodeDefinition;
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
}

interface ChartSelection {
  readonly index: number;
  readonly source: "pointer" | "touch" | "keyboard";
}

const CHART_WIDTH = 600;

export function NodeValueHistoryChart({
  definition,
  scenario,
  state,
}: NodeValueHistoryChartProps) {
  const lineClipId = useId();
  const chart = projectNodeValueHistory(scenario, definition, state);
  const first = chart.points[0];
  const latestIndex = chart.points.length - 1;
  const latest = chart.points[latestIndex];
  const [selection, setSelection] = useState<ChartSelection>();
  if (!first || !latest) return null;

  const selectedIndex = selection?.index;
  const selected =
    selectedIndex === undefined ? undefined : chart.points[selectedIndex];
  const yearMarkLabels = historyYearMarkLabels(chart.points.length);
  const selectAtPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const viewBoxX =
      ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH;
    const index = nearestHistoryPointIndex(chart.points, viewBoxX);
    if (index < 0) return;
    const source = event.pointerType === "touch" ? "touch" : "pointer";
    setSelection((previous) =>
      previous?.index === index && previous.source === source
        ? previous
        : { index, source },
    );
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = selectedIndex ?? latestIndex;
    const index = nextHistoryPointIndex(
      current,
      event.key,
      chart.points.length,
    );
    if (index !== undefined) {
      event.preventDefault();
      setSelection((previous) =>
        previous?.index === index && previous.source === "keyboard"
          ? previous
          : { index, source: "keyboard" },
      );
    }
  };
  return (
    <div className="node-value-history">
      <div className="node-value-history__plot">
        <div className="node-value-history__scale" aria-hidden="true">
          <span>{formatValue(chart.maximum, definition.domain)}</span>
          <span>{formatValue(chart.minimum, definition.domain)}</span>
        </div>
        <div
          className="node-value-history__canvas"
          role="group"
          tabIndex={0}
          aria-label={`${definition.name} value history. Use left and right arrow keys to inspect turns; Home and End jump to the first and latest turn.`}
          aria-describedby="node-value-history-instructions node-value-history-references"
          onPointerMove={selectAtPointer}
          onPointerDown={selectAtPointer}
          onPointerLeave={() => {
            if (selection?.source === "pointer") setSelection(undefined);
          }}
          onFocus={() => {
            if (!selection)
              setSelection({ index: latestIndex, source: "keyboard" });
          }}
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(
                event.relatedTarget as Node | null,
              ) &&
              selection?.source === "keyboard"
            )
              setSelection(undefined);
          }}
          onKeyDown={handleKeyDown}
        >
          <svg
            viewBox="0 0 600 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {chart.points.length > 1 && (
              <defs>
                <clipPath id={lineClipId} clipPathUnits="userSpaceOnUse">
                  <rect
                    x={first.x - 4}
                    y="-4"
                    width={latest.x - first.x + 8}
                    height="108"
                    className="node-value-history__line-clip"
                  />
                </clipPath>
              </defs>
            )}
            {chart.guides.map((guide) => (
              <line
                key={guide.kind}
                x1="16"
                y1={guide.y}
                x2="584"
                y2={guide.y}
                className="node-value-history__guide"
                data-guide-kind={guide.kind}
              />
            ))}
            {chart.points.length > 1 && (
              <polyline
                points={chart.points.map(({ x, y }) => `${x},${y}`).join(" ")}
                className="node-value-history__line"
                clipPath={`url(#${lineClipId})`}
              />
            )}
            {selected && (
              <line
                x1={selected.x}
                y1="0"
                x2={selected.x}
                y2="100"
                className="node-value-history__crosshair"
              />
            )}
          </svg>
          {chart.points.map((point, index) => (
            <span
              key={point.turn}
              className="node-value-history__point"
              style={{
                left: `${(point.x / CHART_WIDTH) * 100}%`,
                top: `${point.y}%`,
              }}
              data-active={point.isActive}
              data-selected={selectedIndex === index}
              aria-hidden="true"
            />
          ))}
          {chart.guides.map((guide) => (
            <span
              key={guide.kind}
              className="node-value-history__guide-label"
              data-guide-kind={guide.kind}
              data-guide-side={guide.side}
              style={{ top: `${guide.y}%` }}
              aria-hidden="true"
            >
              {guide.label} {guide.formattedValue}
            </span>
          ))}
          {selected && (
            <div
              className="node-value-history__tooltip"
              style={
                {
                  "--tooltip-x": `${(selected.x / CHART_WIDTH) * 100}%`,
                  top: `${Math.min(80, Math.max(25, selected.y))}%`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <span>{selected.period}</span>
              <strong>{selected.label}</strong>
              <span>{selected.isActive ? "Active" : "Inactive"}</span>
            </div>
          )}
        </div>
      </div>
      <output
        id="node-value-history-selection"
        className="sr-only"
        role="status"
        aria-live={
          selection?.source === "keyboard" || selection?.source === "touch"
            ? "polite"
            : "off"
        }
        aria-atomic="true"
      >
        {selected
          ? `${selected.period}, ${selected.label}, ${selected.isActive ? "Active" : "Inactive"}`
          : null}
      </output>
      <div className="node-value-history__timeline" aria-hidden="true">
        {chart.points.map((point, index) => {
          const labelPosition = yearMarkLabels.get(index);
          return (
            <span
              key={point.turn}
              className="node-value-history__year-mark"
              data-label-position={labelPosition}
              style={{ left: `${(point.x / CHART_WIDTH) * 100}%` }}
            >
              {labelPosition && <span>{point.period}</span>}
            </span>
          );
        })}
      </div>
      <span id="node-value-history-instructions" className="sr-only">
        Move the pointer or tap the chart to inspect a turn. With the chart
        focused, use left and right arrow keys to browse, or Home and End to
        jump to the first and latest turn.
      </span>
      <span id="node-value-history-references" className="sr-only">
        Reference guides:{" "}
        {chart.guides
          .map((guide) => `${guide.label} ${guide.formattedValue}`)
          .join("; ")}
      </span>
    </div>
  );
}

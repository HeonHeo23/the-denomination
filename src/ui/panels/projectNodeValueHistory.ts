import type {
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatValue } from "../formatValue";
import {
  projectNodeReferenceMarkers,
  type NodeReferenceMarkerKind,
} from "../referenceMarkers";

export const VALUE_HISTORY_WINDOW = 12;
const PLOT_LEFT = 16;
const PLOT_RIGHT = 584;
const POINT_SPACING = (PLOT_RIGHT - PLOT_LEFT) / (VALUE_HISTORY_WINDOW - 1);

export function historyYearMarkLabels(
  pointCount: number,
): ReadonlyMap<number, "first" | "middle" | "last"> {
  const labels = new Map<number, "first" | "middle" | "last">();
  if (pointCount === 0) return labels;
  const latestIndex = pointCount - 1;
  labels.set(latestIndex, "last");
  if (pointCount >= 7) labels.set(0, "first");
  if (pointCount >= 11) labels.set(Math.floor(latestIndex / 2), "middle");
  return labels;
}

export interface NodeValueChartPoint {
  readonly turn: number;
  readonly period: string;
  readonly value: number;
  readonly label: string;
  readonly isActive: boolean;
  readonly x: number;
  readonly y: number;
}

export interface NodeValueChart {
  readonly points: readonly NodeValueChartPoint[];
  readonly minimum: number;
  readonly maximum: number;
  readonly guides: readonly {
    readonly kind: NodeReferenceMarkerKind;
    readonly label: string;
    readonly value: number;
    readonly formattedValue: string;
    readonly y: number;
    readonly side: "left" | "right";
  }[];
}

export function nearestHistoryPointIndex(
  points: readonly NodeValueChartPoint[],
  x: number,
): number {
  if (points.length === 0) return -1;
  return points.reduce(
    (closest, point, index) =>
      Math.abs(point.x - x) < Math.abs(points[closest].x - x) ? index : closest,
    0,
  );
}

export function nextHistoryPointIndex(
  currentIndex: number,
  key: string,
  pointCount: number,
): number | undefined {
  if (pointCount <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return pointCount - 1;
  if (key === "ArrowLeft") return Math.max(0, currentIndex - 1);
  if (key === "ArrowRight") return Math.min(pointCount - 1, currentIndex + 1);
  return undefined;
}

/** Turns canonical readings into disposable coordinates for a dossier chart. */
export function projectNodeValueHistory(
  scenario: ScenarioDefinition,
  definition: NodeDefinition,
  state: SimulationState,
): NodeValueChart {
  if (definition.type === "stance")
    return {
      points: [],
      minimum: definition.domain.min,
      maximum: definition.domain.max,
      guides: [],
    };

  const readings = state.nodeValueHistory
    .slice(-VALUE_HISTORY_WINDOW)
    .map((point) => ({
      turn: point.turn,
      value: point.values[definition.id].value,
      isActive: point.values[definition.id].isActive,
    }));
  const minimum = definition.domain.clamp
    ? definition.domain.min
    : Math.min(definition.domain.min, ...readings.map(({ value }) => value));
  const maximum = definition.domain.clamp
    ? definition.domain.max
    : Math.max(definition.domain.max, ...readings.map(({ value }) => value));
  const span = maximum - minimum || 1;
  const yForValue = (value: number) => 100 - ((value - minimum) / span) * 100;
  return {
    minimum,
    maximum,
    guides: projectNodeReferenceMarkers(definition).map((marker) => ({
      kind: marker.kind,
      label: marker.kind === "stop-threshold" ? "Ends at" : marker.label,
      value: marker.value,
      formattedValue: formatValue(marker.value, definition.domain),
      y: yForValue(marker.value),
      side: marker.kind === "stop-threshold" ? "right" : "left",
    })),
    points: readings.map((reading, index) => ({
      ...reading,
      period:
        scenario.start.year === undefined
          ? `Turn ${reading.turn}`
          : `Year ${scenario.start.year + reading.turn - scenario.start.turn}`,
      label: formatValue(reading.value, definition.domain),
      x: PLOT_RIGHT - (readings.length - 1 - index) * POINT_SPACING,
      y: yForValue(reading.value),
    })),
  };
}

import type { FactionMetricDefinition } from "@/simulation";
import { CircleGauge, Heart, UsersRound } from "lucide-react";

/** Metric identity is available to screen readers without adding a tab stop. */
export function FactionMetricIcon({
  metric,
  context,
}: {
  readonly metric: FactionMetricDefinition;
  readonly context?: string;
}) {
  const label = metric.label.charAt(0).toUpperCase() + metric.label.slice(1);
  const description = context ? `${context}: ${label}` : label;
  const Icon =
    metric.id.toLowerCase() === "satisfaction"
      ? Heart
      : metric.id.toLowerCase() === "membership"
        ? UsersRound
        : CircleGauge;
  const icon = (
    <span
      className="inline-flex shrink-0 items-center"
      data-faction-metric={metric.label}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{description}</span>
    </span>
  );
  return icon;
}

export function FactionMetricName({
  name,
  metric,
  context,
}: {
  readonly name: string;
  readonly metric?: FactionMetricDefinition;
  readonly context?: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {metric && <FactionMetricIcon metric={metric} context={context} />}
      <span className="truncate" title={name}>
        {name}
      </span>
    </span>
  );
}

export function FactionMetricReadings({
  readings,
}: {
  readonly readings: readonly {
    readonly metric: FactionMetricDefinition;
    readonly value: string;
  }[];
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2">
      {readings.map(({ metric, value }) => (
        <span
          key={metric.id}
          className="inline-flex items-center gap-1.5 font-mono text-xs"
        >
          <FactionMetricIcon metric={metric} />
          <span>{value}</span>
        </span>
      ))}
    </span>
  );
}

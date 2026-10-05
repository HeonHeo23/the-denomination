import { CircleGauge, Heart, UsersRound } from "lucide-react";
import type { FactionMetric } from "@/simulation";

/** Metric identity is available to screen readers without adding a tab stop. */
export function FactionMetricIcon({
  metric,
  metricId,
  context,
}: {
  readonly metric: FactionMetric;
  readonly metricId?: string;
  readonly context?: string;
}) {
  const label = metric.charAt(0).toUpperCase() + metric.slice(1);
  const description = context ? `${context}: ${label}` : label;
  const Icon =
    (metricId ?? metric).toLowerCase() === "satisfaction"
      ? Heart
      : (metricId ?? metric).toLowerCase() === "membership"
        ? UsersRound
        : CircleGauge;
  const icon = (
    <span
      className="inline-flex shrink-0 items-center"
      data-faction-metric={metric}
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
  metricId,
  context,
}: {
  readonly name: string;
  readonly metric?: FactionMetric;
  readonly metricId?: string;
  readonly context?: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {metric && (
        <FactionMetricIcon
          metric={metric}
          metricId={metricId}
          context={context}
        />
      )}
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
    readonly metric: FactionMetric;
    readonly metricId?: string;
    readonly value: string;
  }[];
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2">
      {readings.map(({ metric, metricId, value }) => (
        <span
          key={metric}
          className="inline-flex items-center gap-1.5 font-mono text-xs"
        >
          <FactionMetricIcon metric={metric} metricId={metricId} />
          <span>{value}</span>
        </span>
      ))}
    </span>
  );
}

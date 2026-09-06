import type { NumericDomain } from "../simulation";

export function formatValue(value: number, domain: NumericDomain): string {
  return domain.min >= 0 && domain.max <= 1
    ? `${Math.round(value * 100)}%`
    : value.toFixed(1);
}

export function meterPercent(value: number, domain: NumericDomain): number {
  return Math.min(
    100,
    Math.max(0, ((value - domain.min) / (domain.max - domain.min)) * 100),
  );
}

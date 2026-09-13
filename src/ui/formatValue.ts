import type { NumericDomain } from "../simulation";

export function toPercent(value: number): number {
  return value * 100;
}

function isPercentDomain(domain: NumericDomain): boolean {
  return domain.min >= 0 && domain.max <= 1;
}

export function formatValue(value: number, domain: NumericDomain): string {
  return isPercentDomain(domain)
    ? `${Math.round(toPercent(value))}%`
    : value.toFixed(1);
}

export function formatSignedValue(
  value: number,
  domain?: NumericDomain,
): string {
  const isPercentage = domain !== undefined && isPercentDomain(domain);
  const displayValue = isPercentage ? toPercent(value) : value;
  const sign = displayValue > 0 ? "+" : "";

  return `${sign}${displayValue.toFixed(1)}${isPercentage ? "%" : ""}`;
}

export function formatContributionPercent(value: number): string {
  const percent = toPercent(Math.abs(value)).toFixed(1);
  if (value > 0) return `+${percent}%`;
  if (value < 0) return `−${percent}%`;
  return `${percent}%`;
}

export function meterPercent(value: number, domain: NumericDomain): number {
  return Math.min(
    100,
    Math.max(0, toPercent((value - domain.min) / (domain.max - domain.min))),
  );
}

/**
 * Projects the recorded Effects and Grudges that contributed to affected nodes.
 * Shared by crisis details and terminal reports.
 */
import { getNodeDisplayInfo } from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatSignedValue } from "../formatValue";

export interface Contribution {
  readonly id: string;
  readonly kind: "effect" | "grudge";
  readonly amount: number;
  readonly sourceId?: string;
  readonly sourceTitle: string;
  readonly sourceMetric?: FactionMetricDefinition;
  readonly label: string;
  readonly value: string;
  readonly targetId: string;
  readonly targetMetric?: FactionMetricDefinition;
  readonly targetTitle: string;
}

export interface ContributionGroup {
  readonly targetId: string;
  readonly targetMetric?: FactionMetricDefinition;
  readonly targetTitle: string;
  readonly contributions: readonly Contribution[];
}

export function groupContributions(
  contributions: readonly Contribution[],
): readonly ContributionGroup[] {
  const groups = new Map<string, Contribution[]>();
  for (const contribution of contributions) {
    const key = `${contribution.targetId}:${contribution.targetMetric?.id ?? "value"}`;
    const group = groups.get(key) ?? [];
    group.push(contribution);
    groups.set(key, group);
  }
  return [...groups.values()].map((entries) => ({
    targetId: entries[0].targetId,
    targetMetric: entries[0].targetMetric,
    targetTitle: entries[0].targetTitle,
    contributions: entries,
  }));
}

export function getBiggestContribution(
  contributions: readonly Contribution[],
): Contribution | undefined {
  return contributions.reduce<Contribution | undefined>(
    (largest, contribution) =>
      largest === undefined ||
      Math.abs(contribution.amount) > Math.abs(largest.amount)
        ? contribution
        : largest,
    undefined,
  );
}

export function projectContributions(
  scenario: ScenarioDefinition,
  state: SimulationState,
  affectedNodeIds: readonly string[],
): readonly Contribution[] {
  const affected = new Set(affectedNodeIds);
  const contributions: Contribution[] = [];
  for (const effect of scenario.effects) {
    if (!affected.has(effect.target)) continue;
    const value = state.effects[effect.id]?.lastContribution ?? 0;
    if (Math.abs(value) <= 1e-9) continue;
    const target = scenario.nodes.find(({ id }) => id === effect.target);
    if (!target) continue;
    const sourceTitle =
      effect.source === "_default_"
        ? "Default pressure"
        : getNodeDisplayInfo(scenario, effect.source).name;
    contributions.push({
      id: effect.id,
      kind: "effect",
      amount: value,
      ...(effect.source === "_default_" ? {} : { sourceId: effect.source }),
      sourceTitle,
      sourceMetric:
        effect.source === "_default_"
          ? undefined
          : getNodeDisplayInfo(scenario, effect.source).metric,
      label: effect.label ?? effect.id,
      value: formatSignedValue(value, target.domain),
      targetId: target.id,
      targetMetric: getNodeDisplayInfo(scenario, effect.target).metric,
      targetTitle: getNodeDisplayInfo(scenario, target.id).name,
    });
  }
  for (const grudge of state.grudges) {
    if (grudge.createdTurn >= state.turn) continue;
    if (!affected.has(grudge.target)) continue;
    const target = scenario.nodes.find(({ id }) => id === grudge.target);
    if (!target) continue;
    contributions.push({
      id: grudge.id,
      kind: "grudge",
      amount: grudge.magnitude,
      sourceTitle: "Grudge",
      label: grudge.label,
      value: formatSignedValue(grudge.magnitude, target.domain),
      targetId: target.id,
      targetMetric: getNodeDisplayInfo(scenario, grudge.target).metric,
      targetTitle: getNodeDisplayInfo(scenario, target.id).name,
    });
  }
  return contributions;
}

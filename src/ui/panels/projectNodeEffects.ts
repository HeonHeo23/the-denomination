import { getNodeDisplayInfo } from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { previewStanceEffects } from "../../simulation";
import { formatContributionPercent, formatSignedValue } from "../formatValue";

export type EffectContributionTone = "positive" | "negative" | "neutral";

export interface NodeEffectView {
  readonly id: string;
  readonly kind: "effect" | "grudge";
  readonly relatedNodeId?: string;
  readonly relatedName: string;
  readonly label?: string;
  readonly sourceMetric?: FactionMetricDefinition;
  readonly targetMetric?: FactionMetricDefinition;
  readonly contribution: number;
  readonly contributionLabel: string;
  readonly contributionTone: EffectContributionTone;
  readonly preview?: {
    readonly contribution: number;
    readonly label: string;
    readonly tone: EffectContributionTone;
    readonly kind: "settled" | "estimate";
  };
  readonly inertiaTurns?: number;
}

export interface NodeEffectsView {
  readonly incoming: readonly NodeEffectView[];
  readonly outgoing: readonly NodeEffectView[];
}

function contributionTone(value: number): EffectContributionTone {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

/**
 * Derives persistent relationships and temporary incoming contributions for
 * one node's detail display. This presentation projection never changes state.
 */
export function projectNodeEffects(
  nodeId: string,
  scenario: ScenarioDefinition,
  state: SimulationState,
  previewStanceValue?: number,
): NodeEffectsView {
  const previewByEffect = new Map<
    string,
    { readonly contribution: number; readonly kind: "settled" | "estimate" }
  >(
    previewStanceValue === undefined
      ? []
      : previewStanceEffects(scenario, state, nodeId, previewStanceValue).map(
          ({ effectId, contribution, kind }) =>
            [effectId, { contribution, kind }] as const,
        ),
  );
  const incoming: NodeEffectView[] = [];
  const outgoing: NodeEffectView[] = [];

  for (const effect of scenario.effects) {
    if (effect.source !== nodeId && effect.target !== nodeId) continue;
    const sourceInfo =
      effect.source === "_default_"
        ? undefined
        : getNodeDisplayInfo(scenario, effect.source);
    const targetInfo = getNodeDisplayInfo(scenario, effect.target);
    const previewingOwnEffect =
      previewStanceValue !== undefined && effect.source === nodeId;
    const contribution = state.effects[effect.id]?.lastContribution ?? 0;
    const inactiveSource =
      effect.source !== "_default_" && !state.nodes[effect.source].isActive;
    const view = (
      relatedName: string,
      relatedNodeId?: string,
    ): NodeEffectView => {
      const preview = previewByEffect.get(effect.id);
      return {
        id: effect.id,
        kind: "effect",
        relatedNodeId,
        relatedName,
        label: effect.label,
        sourceMetric: sourceInfo?.metric,
        targetMetric: targetInfo.metric,
        contribution,
        contributionLabel: formatContributionPercent(contribution),
        contributionTone: contributionTone(contribution),
        ...(preview === undefined
          ? {}
          : {
              preview: {
                contribution: preview.contribution,
                label: formatContributionPercent(preview.contribution),
                tone: contributionTone(preview.contribution),
                kind: preview.kind,
              },
            }),
        inertiaTurns: effect.inertiaTurns ?? 1,
      };
    };

    if (effect.target === nodeId) {
      // An inactive source normally contributes zero. Keep its relationship
      // visible only while the runtime snapshot still carries a live,
      // non-zero Effect contribution (for example during a transition).
      if (inactiveSource && Math.abs(contribution) <= 0.000001) continue;
      incoming.push(
        view(
          effect.source === "_default_"
            ? "Default pressure"
            : (sourceInfo?.name ?? effect.source),
          effect.source === "_default_" ? undefined : effect.source,
        ),
      );
    }
    if (effect.source === nodeId) {
      // Outgoing effects follow the live graph projection: dormant sources and
      // inactive targets are not actionable relationships. A Stance preview is
      // the one exception, since its proposed value supplies a hypothetical
      // outgoing contribution while it is being drafted.
      if (
        (!previewingOwnEffect && !state.nodes[nodeId].isActive) ||
        (!previewingOwnEffect && !state.nodes[effect.target].isActive)
      ) {
        continue;
      }
      outgoing.push(view(targetInfo.name, effect.target));
    }
  }

  const target = scenario.nodes.find(({ id }) => id === nodeId);
  if (target) {
    const targetInfo = getNodeDisplayInfo(scenario, nodeId);
    for (const grudge of state.grudges) {
      if (grudge.target !== nodeId) continue;
      incoming.push({
        id: grudge.id,
        kind: "grudge",
        relatedName: "Grudge",
        label: grudge.label,
        targetMetric: targetInfo.metric,
        contribution: grudge.magnitude,
        contributionLabel: formatSignedValue(grudge.magnitude, target.domain),
        contributionTone: contributionTone(grudge.magnitude),
      });
    }
  }

  return { incoming, outgoing };
}

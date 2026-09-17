import type { ScenarioDefinition, SimulationState } from "../../simulation";
import { previewStanceEffects } from "../../simulation";
import { formatContributionPercent } from "../formatValue";

export type EffectContributionTone = "positive" | "negative" | "neutral";

export interface NodeEffectView {
  readonly id: string;
  readonly relatedNodeId?: string;
  readonly relatedName: string;
  readonly label?: string;
  readonly contribution: number;
  readonly contributionLabel: string;
  readonly contributionTone: EffectContributionTone;
  readonly previewContribution?: number;
  readonly previewContributionLabel?: string;
  readonly previewContributionTone?: EffectContributionTone;
  readonly previewKind?: "settled" | "estimate";
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
 * Derives the authored relationships attached to one node for detail display.
 * This remains presentation data: it never changes Effect semantics or state.
 */
export function projectNodeEffects(
  nodeId: string,
  scenario: ScenarioDefinition,
  state: SimulationState,
  previewStanceValue?: number,
): NodeEffectsView {
  const nodeNames = new Map(scenario.nodes.map((node) => [node.id, node.name]));
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
    const previewingOwnEffect =
      previewStanceValue !== undefined && effect.source === nodeId;
    if (
      effect.source !== "_default_" &&
      !state.nodes[effect.source].isActive &&
      !previewingOwnEffect
    )
      continue;
    const contribution = state.effects[effect.id]?.lastContribution ?? 0;
    const view = (
      effectId: string,
      relatedName: string,
      relatedNodeId?: string,
    ): NodeEffectView => {
      const preview = previewByEffect.get(effectId);
      return {
        id: effect.id,
        relatedNodeId,
        relatedName,
        label: effect.label,
        contribution,
        contributionLabel: formatContributionPercent(contribution),
        contributionTone: contributionTone(contribution),
        ...(preview === undefined
          ? {}
          : {
              previewContribution: preview.contribution,
              previewContributionLabel: formatContributionPercent(
                preview.contribution,
              ),
              previewContributionTone: contributionTone(preview.contribution),
              previewKind: preview.kind,
            }),
        inertiaTurns: effect.inertiaTurns ?? 1,
      };
    };

    if (effect.target === nodeId) {
      incoming.push(
        view(
          effect.id,
          effect.source === "_default_"
            ? "Default pressure"
            : (nodeNames.get(effect.source) ?? effect.source),
          effect.source === "_default_" ? undefined : effect.source,
        ),
      );
    }
    if (effect.source === nodeId) {
      outgoing.push(
        view(
          effect.id,
          nodeNames.get(effect.target) ?? effect.target,
          effect.target,
        ),
      );
    }
  }

  return { incoming, outgoing };
}

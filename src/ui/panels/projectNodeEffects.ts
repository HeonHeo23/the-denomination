import type { ScenarioDefinition, SimulationState } from "../../simulation";

export type EffectContributionTone = "positive" | "negative" | "neutral";

export interface NodeEffectView {
  readonly id: string;
  readonly relatedName: string;
  readonly label?: string;
  readonly contributionLabel: string;
  readonly contributionTone: EffectContributionTone;
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

function formatContribution(value: number): string {
  if (value > 0) return `+${value.toFixed(3)}`;
  if (value < 0) return `−${Math.abs(value).toFixed(3)}`;
  return "0.000";
}

/**
 * Derives the authored relationships attached to one node for modal display.
 * This remains presentation data: it never changes Effect semantics or state.
 */
export function projectNodeEffects(
  nodeId: string,
  scenario: ScenarioDefinition,
  state: SimulationState,
): NodeEffectsView {
  const nodeNames = new Map(scenario.nodes.map((node) => [node.id, node.name]));
  const incoming: NodeEffectView[] = [];
  const outgoing: NodeEffectView[] = [];

  for (const effect of scenario.effects) {
    const contribution = state.effects[effect.id]?.lastContribution ?? 0;
    const view = (relatedName: string): NodeEffectView => ({
      id: effect.id,
      relatedName,
      label: effect.label,
      contributionLabel: formatContribution(contribution),
      contributionTone: contributionTone(contribution),
      inertiaTurns: effect.inertiaTurns,
    });

    if (effect.target === nodeId) {
      incoming.push(
        view(
          effect.source === "_default_"
            ? "Default pressure"
            : (nodeNames.get(effect.source) ?? effect.source),
        ),
      );
    }
    if (effect.source === nodeId) {
      outgoing.push(view(nodeNames.get(effect.target) ?? effect.target));
    }
  }

  return { incoming, outgoing };
}

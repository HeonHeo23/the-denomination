import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { ScenarioDefinition, SimulationState } from "../../simulation";

export interface SimulationNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly description: string;
  readonly nodeType: string;
  readonly value: number;
  readonly active: boolean;
  readonly forced: boolean;
}

const columns: Record<string, number> = {
  stance: 0,
  indicator: 360,
  faction: 360,
  situation: 720,
};

const positiveEffectColor = "#39735a";
const negativeEffectColor = "#a94338";
const neutralEffectColor = "#777166";

function effectColor(contribution: number): string {
  if (contribution > 0) return positiveEffectColor;
  if (contribution < 0) return negativeEffectColor;
  return neutralEffectColor;
}

function formatContribution(contribution: number): string {
  if (contribution > 0) return `+${contribution.toFixed(3)}`;
  if (contribution < 0) return `−${Math.abs(contribution).toFixed(3)}`;
  return "0.000";
}

export function projectEffectsToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
  hoveredNodeId?: string,
): Edge[] {
  const visible = new Set(
    scenario.nodes
      .filter((definition) => definition.isVisible !== false)
      .map(({ id }) => id),
  );

  return scenario.effects
    .filter(
      (effect) =>
        effect.source !== "_default_" &&
        visible.has(effect.source) &&
        visible.has(effect.target),
    )
    .map((effect): Edge => {
      const contribution = state.effects[effect.id]?.lastContribution ?? 0;
      const color = effectColor(contribution);
      const isConnected =
        effect.source === hoveredNodeId || effect.target === hoveredNodeId;
      const isTracing = hoveredNodeId !== undefined;
      const baseStrokeWidth = Math.min(3, 1.2 + Math.abs(contribution) * 3);
      const contributionLabel = formatContribution(contribution);
      const label = effect.label
        ? `${effect.label} · ${contributionLabel}`
        : contributionLabel;

      return {
        id: effect.id,
        source: effect.source,
        target: effect.target,
        label,
        type: "smoothstep",
        animated:
          state.nodes[effect.source].isActive && Math.abs(contribution) > 0.001,
        style: {
          opacity: isTracing ? (isConnected ? 1 : 0.12) : 0.88,
          stroke: color,
          strokeWidth:
            isTracing && isConnected
              ? Math.min(4.8, baseStrokeWidth + 1.6)
              : baseStrokeWidth,
        },
        labelStyle: {
          fill: color,
          fontSize: 10,
          fontWeight: 700,
          opacity: isTracing ? (isConnected ? 1 : 0.12) : 1,
        },
        labelBgStyle: {
          fill: "#f5f0e5",
          fillOpacity: isTracing && !isConnected ? 0.18 : 0.92,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
        },
        zIndex: isTracing && isConnected ? 10 : 0,
      };
    });
}

export function projectToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
  hoveredNodeId?: string,
): { nodes: Node<SimulationNodeData>[]; edges: Edge[] } {
  const rows: Record<string, number> = {
    stance: 0,
    indicator: 0,
    faction: 0,
    situation: 0,
  };
  const visible = new Set(
    scenario.nodes
      .filter((definition) => definition.isVisible !== false)
      .map(({ id }) => id),
  );

  const nodes = scenario.nodes
    .filter(({ id }) => visible.has(id))
    .map((definition): Node<SimulationNodeData> => {
      const runtime = state.nodes[definition.id];
      const row = rows[definition.type] ?? 0;
      rows[definition.type] = row + 1;
      return {
        id: definition.id,
        type: "simulation",
        position: { x: columns[definition.type] ?? 0, y: row * 152 },
        ariaLabel: `${definition.name}, ${definition.type}. Click for details.`,
        data: {
          label: definition.name,
          description: definition.description,
          nodeType: definition.type,
          value: runtime.value,
          active: runtime.isActive,
          forced: runtime.isForced,
        },
      };
    });

  const edges = projectEffectsToReactFlow(scenario, state, hoveredNodeId);

  return { nodes, edges };
}

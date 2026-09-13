import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type {
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatContributionPercent } from "../formatValue";

export interface SimulationNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly description: string;
  readonly nodeType: string;
  readonly category: string;
  readonly value: number;
  readonly domain: NumericDomain;
  readonly active: boolean;
  readonly forced: boolean;
  readonly turnDelta?: number;
  readonly activationTransition?: "began" | "ended";
  readonly revealing?: boolean;
}

export interface GraphTurnFeedback {
  readonly changes: readonly {
    readonly nodeId: string;
    readonly delta: number;
    readonly previousActive: boolean;
    readonly isActive: boolean;
  }[];
  readonly changedEffectIds: readonly string[];
}

const nodeTypeOrder = [
  "stance",
  "indicator",
  "faction",
  "situation",
  "resource",
];
const clusterWidth = 530;
const clusterGap = 70;
const clusterMinimumHeight = 180;
const nodeColumnGap = 188;
const nodeRowGap = 96;

const positiveEffectColor = "var(--game-increasing)";
const negativeEffectColor = "var(--game-decreasing)";
const neutralEffectColor = "var(--game-neutral-effect)";

function effectColor(contribution: number): string {
  if (contribution > 0) return positiveEffectColor;
  if (contribution < 0) return negativeEffectColor;
  return neutralEffectColor;
}

export function projectEffectsToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
  hoveredNodeId?: string,
  turnFeedback?: GraphTurnFeedback,
): Edge[] {
  const visible = new Set(
    scenario.nodes
      .filter((definition) => definition.graphVisible !== false)
      .map(({ id }) => id),
  );

  const changedEffects = new Set(turnFeedback?.changedEffectIds ?? []);

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
      const isTurnChanged = changedEffects.has(effect.id);
      const baseStrokeWidth = Math.min(3, 1.2 + Math.abs(contribution) * 3);
      const contributionLabel = formatContributionPercent(contribution);
      const label = isConnected
        ? effect.label
          ? `${effect.label} · ${contributionLabel}`
          : contributionLabel
        : undefined;

      return {
        id: effect.id,
        source: effect.source,
        target: effect.target,
        label,
        type: "smoothstep",
        animated:
          (isConnected || isTurnChanged) &&
          state.nodes[effect.source].isActive &&
          Math.abs(contribution) > 0.001,
        className: isTurnChanged
          ? "effect-edge effect-edge--turn-changed"
          : "effect-edge",
        style: {
          opacity: isTracing
            ? isConnected
              ? 1
              : 0.1
            : isTurnChanged
              ? 0.9
              : 0.28,
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
          opacity: isConnected ? 1 : 0,
        },
        labelBgStyle: {
          fill: "#f5f0e5",
          fillOpacity: isTracing && !isConnected ? 0.18 : 0.92,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
        },
        zIndex: isConnected ? 10 : 0,
      };
    });
}

export function projectToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
  hoveredNodeId?: string,
  turnFeedback?: GraphTurnFeedback,
): { nodes: Node<SimulationNodeData>[]; edges: Edge[] } {
  const turnChanges = new Map(
    turnFeedback?.changes.map((change) => [change.nodeId, change]) ?? [],
  );
  const groupedNodes = new Map<string, typeof scenario.nodes>();
  for (const definition of scenario.nodes) {
    if (definition.graphVisible === false) continue;
    const category = definition.category ?? "Other concerns";
    const group = groupedNodes.get(category) ?? [];
    groupedNodes.set(category, [...group, definition]);
  }
  const groups = [...groupedNodes.entries()];
  const clusterColumns = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
  const clusterRowHeights = groups.reduce<number[]>(
    (heights, [, nodes], index) => {
      const row = Math.floor(index / clusterColumns);
      const nodeRows = Math.ceil(nodes.length / 2);
      const height = Math.max(clusterMinimumHeight, nodeRows * nodeRowGap + 16);
      heights[row] = Math.max(heights[row] ?? 0, height);
      return heights;
    },
    [],
  );
  const clusterRowOffsets = clusterRowHeights.reduce<number[]>(
    (offsets, _height, index) => {
      offsets[index] =
        index === 0
          ? 0
          : offsets[index - 1] + clusterRowHeights[index - 1] + clusterGap;
      return offsets;
    },
    [],
  );

  const nodes = groups.flatMap(([category, definitions], clusterIndex) => {
    const clusterX =
      (clusterIndex % clusterColumns) * (clusterWidth + clusterGap);
    const clusterY =
      clusterRowOffsets[Math.floor(clusterIndex / clusterColumns)];
    const orderedDefinitions = [...definitions].sort((left, right) => {
      const typeDifference =
        nodeTypeOrder.indexOf(left.type) - nodeTypeOrder.indexOf(right.type);
      return typeDifference === 0
        ? left.name.localeCompare(right.name)
        : typeDifference;
    });

    return orderedDefinitions.map(
      (definition, nodeIndex): Node<SimulationNodeData> => {
        const runtime = state.nodes[definition.id];
        const turnChange = turnChanges.get(definition.id);
        const column = nodeIndex % 2;
        const row = Math.floor(nodeIndex / 2);
        return {
          id: definition.id,
          type: "simulation",
          position: {
            x: clusterX + column * nodeColumnGap,
            y: clusterY + row * nodeRowGap,
          },
          ariaLabel: `${definition.name}, ${definition.type}. Click for details.`,
          data: {
            label: definition.name,
            description: definition.description,
            nodeType: definition.type,
            category,
            value: runtime.value,
            domain: definition.domain,
            active: runtime.isActive,
            forced: runtime.isForced,
            turnDelta: turnChange?.delta,
            activationTransition:
              turnChange && turnChange.previousActive !== turnChange.isActive
                ? turnChange.isActive
                  ? "began"
                  : "ended"
                : undefined,
            revealing: turnChange !== undefined,
          },
        };
      },
    );
  });

  const edges = projectEffectsToReactFlow(
    scenario,
    state,
    hoveredNodeId,
    turnFeedback,
  );

  return { nodes, edges };
}

import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type {
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatContributionPercent } from "../formatValue";
import {
  projectNodeReferenceMarkers,
  type NodeReferenceMarker,
} from "../referenceMarkers";

export interface SimulationNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly description: string;
  readonly nodeType: string;
  readonly category: string;
  readonly categoryIndex: number;
  readonly value: number;
  readonly referenceMarkers: readonly NodeReferenceMarker[];
  readonly domain: NumericDomain;
  readonly active: boolean;
  readonly forced: boolean;
  readonly turnDelta?: number;
  readonly activationTransition?: "began" | "ended";
  readonly revealing?: boolean;
  readonly revealIndex?: number;
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

export interface GraphCategory {
  readonly id: string;
  readonly label: string;
  readonly nodeIds: readonly string[];
}

const nodeTypeOrder = [
  "stance",
  "indicator",
  "faction",
  "situation",
  "resource",
];
const clusterWidth = 650;
const clusterGap = 96;
const clusterMinimumHeight = 238;
const nodeColumnGap = 244;
const nodeRowGap = 126;

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
          fill: "var(--game-paper)",
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

export function projectGraphCategories(
  scenario: ScenarioDefinition,
): GraphCategory[] {
  const groups = new Map<string, string[]>();
  for (const definition of scenario.nodes) {
    if (definition.graphVisible === false) continue;
    const label = definition.category ?? "Other concerns";
    const nodeIds = groups.get(label) ?? [];
    groups.set(label, [...nodeIds, definition.id]);
  }
  return [...groups].map(([label, nodeIds]) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    nodeIds,
  }));
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
  const categories = projectGraphCategories(scenario);
  const definitionsById = new Map(
    scenario.nodes.map((definition) => [definition.id, definition]),
  );
  const groups = categories.map(
    (category) =>
      [
        category.label,
        category.nodeIds.flatMap((id) => {
          const definition = definitionsById.get(id);
          return definition ? [definition] : [];
        }),
      ] as const,
  );
  const factionIndexById = new Map(
    groups
      .flatMap(([, definitions]) => definitions)
      .filter(({ type }) => type === "faction")
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ id }, index) => [id, index]),
  );
  const clusterColumns = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
  const factionColumnX =
    (clusterColumns - 1) * (clusterWidth + clusterGap) + nodeColumnGap * 2;
  const clusterRowHeights = groups.reduce<number[]>(
    (heights, [, nodes], index) => {
      const row = Math.floor(index / clusterColumns);
      const nonFactionCount = nodes.filter(
        ({ type }) => type !== "faction",
      ).length;
      const nodeRows = Math.ceil(nonFactionCount / 2);
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
    const nonFactionIndexById = new Map(
      orderedDefinitions
        .filter(({ type }) => type !== "faction")
        .map(({ id }, index) => [id, index]),
    );

    return orderedDefinitions.map(
      (definition, nodeIndex): Node<SimulationNodeData> => {
        const runtime = state.nodes[definition.id];
        const turnChange = turnChanges.get(definition.id);
        const isFaction = definition.type === "faction";
        const compactIndex = isFaction
          ? 0
          : (nonFactionIndexById.get(definition.id) ?? nodeIndex);
        const column = compactIndex % 2;
        const row = Math.floor(compactIndex / 2);
        return {
          id: definition.id,
          type: "simulation",
          width: 220,
          height: 104,
          position: {
            x: isFaction ? factionColumnX : clusterX + column * nodeColumnGap,
            y: isFaction
              ? (factionIndexById.get(definition.id) ?? 0) * nodeRowGap
              : clusterY + row * nodeRowGap,
          },
          ariaLabel: `${definition.name}, ${definition.type}. Click for details.`,
          data: {
            label: definition.name,
            description: definition.description,
            nodeType: definition.type,
            category,
            categoryIndex: clusterIndex,
            value: runtime.value,
            referenceMarkers: projectNodeReferenceMarkers(definition),
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
            revealIndex: turnFeedback?.changes.findIndex(
              (change) => change.nodeId === definition.id,
            ),
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

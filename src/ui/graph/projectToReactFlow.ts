import {
  createFactionGraphId,
  getFactionGroupIndex,
} from "../projections/projectFactionGroups";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type {
  FactionMetricDefinition,
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatContributionPercent } from "../formatValue";
import {
  projectNodeReferenceMarkers,
  type NodeReferenceMarker,
} from "../referenceMarkers";

/** Minimal disposable inputs for graph layout and causal routing. */
type GraphScenario = Pick<ScenarioDefinition, "nodes" | "effects">;
type GraphState = Pick<SimulationState, "nodes" | "effects">;

export interface GraphEffectData extends Record<string, unknown> {
  readonly sourceNodeId?: string;
  readonly targetNodeId?: string;
  readonly description?: string;
  readonly contributionLabel: string;
  readonly sourceName: string;
  readonly targetName: string;
  readonly sourceMetric?: FactionMetricDefinition;
  readonly targetMetric?: FactionMetricDefinition;
}

export interface SimulationNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly description: string;
  readonly nodeType: string;
  readonly category: string;
  readonly categoryIndex: number;
  readonly value: number;
  readonly factionCategory?: string;
  readonly nodeId?: string;
  readonly metricLabel?: string;
  readonly factionMetrics?: readonly {
    readonly metricLabel: string;
    readonly value: number;
    readonly delta?: number;
  }[];
  readonly netFlow?: number;
  readonly referenceMarkers: readonly NodeReferenceMarker[];
  readonly domain: NumericDomain;
  readonly active: boolean;
  readonly forced: boolean;
  readonly focused?: boolean;
  readonly turnDelta?: number;
  readonly activationTransition?: "began" | "ended";
  readonly revealing?: boolean;
  readonly revealIndex?: number;
}

export interface GraphTurnFeedback {
  readonly changes: readonly {
    readonly nodeId: string;
    readonly delta: number;
    readonly metricLabel?: string;
    readonly wasActive: boolean;
    readonly isActive: boolean;
  }[];
  readonly changedEffectIds: readonly string[];
}

export interface GraphCategory {
  readonly id: string;
  readonly label: string;
  readonly nodeIds: readonly string[];
  readonly nonFactionNodeCount: number;
}

export function isNodeOnGraph(
  nodeId: string,
  scenario: GraphScenario,
  state: GraphState,
  turnFeedback?: GraphTurnFeedback,
  recentlyEndedNodeIds: readonly string[] = [],
): boolean {
  const definition = scenario.nodes.find((node) => node.id === nodeId);
  if (!definition || definition.graphVisible === false) return false;
  if (state.nodes[nodeId]?.isActive) return true;
  return Boolean(
    turnFeedback?.changes.some(
      (change) =>
        change.nodeId === nodeId && change.wasActive && !change.isActive,
    ) || recentlyEndedNodeIds.includes(nodeId),
  );
}

const nodeTypeOrder = [
  "stance",
  "indicator",
  "faction",
  "situation",
  "resource",
];
const clusterWidth = 512;
const clusterGap = 48;
const clusterMinimumHeight = 238;
const nodeColumnGap = 244;
const nodeRowGap = 126;
const nodeHeight = 104;
const factionColumnGap = clusterGap * 2;

/** Rows fitting the occupied thematic height, independent of viewport and zoom. */
export function factionRowsForHeight(height: number): number {
  return Math.max(1, Math.floor((height - nodeHeight) / nodeRowGap) + 1);
}

const positiveEffectColor = "var(--game-increasing)";
const negativeEffectColor = "var(--game-decreasing)";
const neutralEffectColor = "var(--game-neutral-effect)";

function effectColor(contribution: number): string {
  if (contribution > 0) return positiveEffectColor;
  if (contribution < 0) return negativeEffectColor;
  return neutralEffectColor;
}

function rawProjectEffectsToReactFlow(
  scenario: GraphScenario,
  state: GraphState,
  hoveredNodeId?: string,
  turnFeedback?: GraphTurnFeedback,
  recentlyEndedNodeIds: readonly string[] = [],
): Edge[] {
  const visible = new Set(
    scenario.nodes
      .filter((definition) =>
        isNodeOnGraph(
          definition.id,
          scenario,
          state,
          turnFeedback,
          recentlyEndedNodeIds,
        ),
      )
      .map(({ id }) => id),
  );

  const changedEffects = new Set(turnFeedback?.changedEffectIds ?? []);
  const definitionsById = new Map(
    scenario.nodes.map((node) => [node.id, node]),
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
      const isTurnChanged = changedEffects.has(effect.id);
      const baseStrokeWidth = Math.min(3, 1.2 + Math.abs(contribution) * 3);
      const contributionLabel = formatContributionPercent(contribution);
      const label = isConnected
        ? [effect.label, contributionLabel].filter(Boolean).join(": ")
        : undefined;
      const sourceName = definitionsById.get(effect.source)!.name;
      const targetName = definitionsById.get(effect.target)!.name;

      return {
        id: effect.id,
        source: effect.source,
        target: effect.target,
        label,
        type: "smoothstep",
        data: {
          description: effect.label,
          contributionLabel,
          sourceName,
          targetName,
        } satisfies GraphEffectData,
        ariaLabel: `${sourceName} affects ${targetName}: ${contributionLabel}`,
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

function rawProjectGraphCategories(
  scenario: GraphScenario,
  state: GraphState,
  turnFeedback?: GraphTurnFeedback,
  recentlyEndedNodeIds: readonly string[] = [],
): GraphCategory[] {
  const groups = new Map<string, string[]>();
  for (const definition of scenario.nodes) {
    if (
      !isNodeOnGraph(
        definition.id,
        scenario,
        state,
        turnFeedback,
        recentlyEndedNodeIds,
      )
    )
      continue;
    const label = definition.category ?? "Other concerns";
    const nodeIds = groups.get(label) ?? [];
    groups.set(label, [...nodeIds, definition.id]);
  }
  return [...groups].map(([label, nodeIds]) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    nodeIds,
    nonFactionNodeCount: nodeIds.filter(
      (nodeId) =>
        scenario.nodes.find(({ id }) => id === nodeId)?.type !== "faction" &&
        state.nodes[nodeId].isActive,
    ).length,
  }));
}

/** Navigation adds a faction focus without changing thematic graph layout. */
function rawProjectGraphNavigationCategories(
  scenario: GraphScenario,
  state: GraphState,
  turnFeedback?: GraphTurnFeedback,
  recentlyEndedNodeIds: readonly string[] = [],
) {
  const categories = rawProjectGraphCategories(
    scenario,
    state,
    turnFeedback,
    recentlyEndedNodeIds,
  );
  return navigationCategoriesFromGraphCategories(categories, scenario, state);
}

function navigationCategoriesFromGraphCategories(
  categories: readonly GraphCategory[],
  scenario: GraphScenario,
  state: GraphState,
) {
  const visibleIds = new Set(categories.flatMap(({ nodeIds }) => nodeIds));
  const factionIds = scenario.nodes
    .filter(({ id, type }) => type === "faction" && visibleIds.has(id))
    .map(({ id }) => id);
  return [
    ...categories.map((category) => ({
      id: category.id,
      label: category.label,
      nodeIds: category.nodeIds,
      count: category.nonFactionNodeCount,
      includeFactions: false,
    })),
    ...(factionIds.length
      ? [
          {
            id: "node-type:faction",
            label: "Factions",
            nodeIds: factionIds,
            count: factionIds.filter((id) => state.nodes[id].isActive).length,
            includeFactions: true,
          },
        ]
      : []),
  ];
}

function rawProjectToReactFlow(
  scenario: GraphScenario,
  state: GraphState,
  hoveredNodeId?: string,
  turnFeedback?: GraphTurnFeedback,
  recentlyEndedNodeIds: readonly string[] = [],
  factionRows?: number,
): {
  nodes: Node<SimulationNodeData>[];
  edges: Edge[];
  categories: GraphCategory[];
} {
  const turnChanges = new Map(
    turnFeedback?.changes.map((change) => [change.nodeId, change]) ?? [],
  );
  const categories = rawProjectGraphCategories(
    scenario,
    state,
    turnFeedback,
    recentlyEndedNodeIds,
  );
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
    (clusterColumns - 1) * (clusterWidth + clusterGap) +
    nodeColumnGap * 2 +
    factionColumnGap;
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

  const thematicHeight = groups.reduce((height, [, definitions], index) => {
    const count = definitions.filter(({ type }) => type !== "faction").length;
    if (count === 0) return height;
    const bottom =
      clusterRowOffsets[Math.floor(index / clusterColumns)] +
      (Math.ceil(count / 2) - 1) * nodeRowGap +
      nodeHeight;
    return Math.max(height, bottom);
  }, 0);
  const rowsPerFactionColumn =
    factionRows !== undefined && Number.isFinite(factionRows)
      ? Math.max(1, Math.floor(factionRows))
      : factionRowsForHeight(thematicHeight);

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
        const factionIndex = factionIndexById.get(definition.id) ?? 0;
        const compactIndex = isFaction
          ? 0
          : (nonFactionIndexById.get(definition.id) ?? nodeIndex);
        const column = compactIndex % 2;
        const row = Math.floor(compactIndex / 2);
        return {
          id: definition.id,
          type: "simulation",
          width: 220,
          height: nodeHeight,
          position: {
            x: isFaction
              ? factionColumnX +
                Math.floor(factionIndex / rowsPerFactionColumn) * nodeColumnGap
              : clusterX + column * nodeColumnGap,
            y: isFaction
              ? (factionIndex % rowsPerFactionColumn) * nodeRowGap
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
            ...(definition.type === "faction"
              ? { factionCategory: definition.factionCategory }
              : {}),
            ...(definition.type === "resource"
              ? { netFlow: runtime.netFlow }
              : {}),
            referenceMarkers:
              definition.type === "faction"
                ? []
                : projectNodeReferenceMarkers(definition),
            domain: definition.domain,
            active: runtime.isActive,
            forced: runtime.isForced,
            focused: definition.id === hoveredNodeId,
            turnDelta:
              definition.type === "faction" ? undefined : turnChange?.delta,
            activationTransition:
              turnChange && turnChange.wasActive !== turnChange.isActive
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

  const edges = rawProjectEffectsToReactFlow(
    scenario,
    state,
    hoveredNodeId,
    turnFeedback,
    recentlyEndedNodeIds,
  );

  return { nodes, edges, categories };
}

/** Grouping is a disposable presentation projection, never an engine snapshot. */
function groupedGraphInput(
  scenario: ScenarioDefinition,
  state: SimulationState,
  feedback?: GraphTurnFeedback,
  metricId = scenario.factionMetrics?.[0]?.id,
) {
  const index = getFactionGroupIndex(scenario);
  const displayId = (id: string) => {
    const context = index.byNode.get(id);
    return context ? createFactionGraphId(context.group.id) : id;
  };
  const cards = [...index.byGroup.values()].map(
    (members) =>
      members.find((member) => member.metric.id === metricId) ?? members[0],
  );
  const viewScenario: GraphScenario = {
    nodes: [
      ...scenario.nodes.filter((node) => node.type !== "faction"),
      ...cards.map((context) => ({
        ...context.node,
        id: createFactionGraphId(context.group.id),
        name: context.group.name,
        description: context.group.description,
        category: index.byGroup.get(context.group.id)![0].node.category,
      })),
    ],
    effects: scenario.effects.map((effect) => ({
      ...effect,
      source: displayId(effect.source),
      target: displayId(effect.target),
    })),
  };
  const viewState: GraphState = {
    effects: state.effects,
    nodes: {
      ...state.nodes,
      ...Object.fromEntries(
        cards.map((context) => [
          createFactionGraphId(context.group.id),
          state.nodes[context.node.id],
        ]),
      ),
    },
  };
  const viewFeedback = feedback
    ? {
        ...feedback,
        changes: feedback.changes
          .filter(
            (change) =>
              !index.byNode.has(change.nodeId) ||
              index.byNode.get(change.nodeId)!.metric.id === metricId,
          )
          .map((change) => ({ ...change, nodeId: displayId(change.nodeId) })),
      }
    : undefined;
  return { index, cards, displayId, viewScenario, viewState, viewFeedback };
}
function annotateEdges(
  edges: Edge[],
  scenario: ScenarioDefinition,
  index: ReturnType<typeof getFactionGroupIndex>,
): Edge<GraphEffectData>[] {
  const effects = new Map(
    scenario.effects.map((effect) => [effect.id, effect]),
  );
  return edges.map((edge) => {
    const effect = effects.get(edge.id)!;
    const source = index.byNode.get(effect.source);
    const target = index.byNode.get(effect.target);
    const data = edge.data as GraphEffectData;
    return {
      ...edge,
      label: edge.label
        ? [
            `${source ? `${source.group.name} (${source.metric.label})` : data.sourceName} → ${target ? `${target.group.name} (${target.metric.label})` : data.targetName}`,
            edge.label,
          ].join(" · ")
        : undefined,
      data: {
        ...data,
        sourceNodeId: effect.source,
        targetNodeId: effect.target,
        sourceMetric: source?.metric,
        targetMetric: target?.metric,
      },
      ariaLabel: `${data.sourceName}${source ? ` ${source.metric.label}` : ""} affects ${data.targetName}${target ? ` ${target.metric.label}` : ""}: ${data.contributionLabel}`,
    };
  });
}
export function projectGraphCategories(
  scenario: ScenarioDefinition,
  state: SimulationState,
  feedback?: GraphTurnFeedback,
  ended: readonly string[] = [],
) {
  const view = groupedGraphInput(scenario, state, feedback);
  return rawProjectGraphCategories(
    view.viewScenario,
    view.viewState,
    view.viewFeedback,
    ended.map(view.displayId),
  );
}
export function projectGraphNavigationCategories(
  scenario: ScenarioDefinition,
  state: SimulationState,
  feedback?: GraphTurnFeedback,
  ended: readonly string[] = [],
) {
  const view = groupedGraphInput(scenario, state, feedback);
  return rawProjectGraphNavigationCategories(
    view.viewScenario,
    view.viewState,
    view.viewFeedback,
    ended.map(view.displayId),
  );
}
export function projectEffectsToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
  hovered?: string,
  feedback?: GraphTurnFeedback,
  ended: readonly string[] = [],
) {
  const view = groupedGraphInput(scenario, state, feedback);
  return annotateEdges(
    rawProjectEffectsToReactFlow(
      view.viewScenario,
      view.viewState,
      hovered ? view.displayId(hovered) : undefined,
      view.viewFeedback,
      ended.map(view.displayId),
    ),
    scenario,
    view.index,
  );
}
export function projectToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
  hovered?: string,
  feedback?: GraphTurnFeedback,
  ended: readonly string[] = [],
  rows?: number,
  metricId?: string,
) {
  const view = groupedGraphInput(scenario, state, feedback, metricId);
  const graph = rawProjectToReactFlow(
    view.viewScenario,
    view.viewState,
    hovered ? view.displayId(hovered) : undefined,
    view.viewFeedback,
    ended.map(view.displayId),
    rows,
  );
  const cardsByGraphId = new Map(
    view.cards.map((context) => [
      createFactionGraphId(context.group.id),
      context,
    ]),
  );
  const feedbackByNodeId = new Map(
    feedback?.changes.map((change) => [change.nodeId, change]) ?? [],
  );
  return {
    nodes: graph.nodes.map((node) => {
      const context = cardsByGraphId.get(node.id);
      if (!context) return node;
      const delta = feedbackByNodeId.get(context.node.id)?.delta;
      return {
        ...node,
        data: {
          ...node.data,
          nodeId: context.node.id,
          metricLabel: context.metric.label,
          factionMetrics: [
            {
              metricLabel: context.metric.label,
              value: state.nodes[context.node.id].value,
              delta,
            },
          ],
          referenceMarkers: projectNodeReferenceMarkers(context.node),
        },
      };
    }),
    edges: annotateEdges(graph.edges, scenario, view.index),
    navigationCategories: navigationCategoriesFromGraphCategories(
      graph.categories,
      view.viewScenario,
      view.viewState,
    ),
  };
}

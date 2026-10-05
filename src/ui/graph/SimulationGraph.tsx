import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FactionMetricIcon } from "@/ui/FactionMetric";
import {
  findFactionContext,
  createFactionGraphId,
} from "../projections/projectFactionGroups";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Controls,
  getNodesBounds,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ScenarioDefinition, SimulationState } from "../../simulation";
import {
  projectToReactFlow,
  type GraphTurnFeedback,
  type SimulationNodeData,
} from "./projectToReactFlow";
import {
  projectInactiveStanceSearchEntries,
  projectNodeSearchEntries,
} from "./projectNodeSearch";
import { NodeSearchDialog } from "./NodeSearchDialog";
import { GraphCategoryRail } from "./GraphCategoryRail";
import { SimulationNode } from "./SimulationNode";
import { useInterfaceSound } from "../sound/interfaceSoundContext";
import "./simulation-graph.css";

const nodeTypes: NodeTypes = { simulation: SimulationNode };

interface SimulationGraphProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly factionMetricId: string;
  readonly onFactionMetricChange: (metricId: string) => void;
  readonly inactiveStanceSearchOpen: boolean;
  readonly onInactiveStanceSearchOpenChange: (open: boolean) => void;
  readonly onViewContextChange?: (label: string) => void;
  readonly externalHoveredNodeId?: string;
  readonly turnFeedback?: GraphTurnFeedback;
}

type GraphInstance = ReactFlowInstance<Node<SimulationNodeData>>;

interface FactionMetricToggleProps {
  readonly scenario: ScenarioDefinition;
  readonly metricId: string;
  readonly onChange: (metricId: string) => void;
}

function FactionMetricToggle({
  scenario,
  metricId,
  onChange,
}: FactionMetricToggleProps) {
  const metrics = scenario.factionMetrics ?? [];
  if (!scenario.factionGroups?.length || metrics.length <= 1) return null;

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      className="pointer-events-auto flex max-w-full flex-wrap justify-end gap-1 rounded-sm border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur-sm"
      value={metricId}
      aria-label="Faction metric"
      onValueChange={(value) => {
        if (value) onChange(value);
      }}
    >
      {metrics.map((metric) => (
        <ToggleGroupItem
          key={metric.id}
          value={metric.id}
          aria-label={metric.label}
          title={metric.label}
        >
          <FactionMetricIcon metric={metric.label} metricId={metric.id} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function SimulationGraph({
  scenario,
  state,
  onNodeSelect,
  factionMetricId,
  onFactionMetricChange,
  inactiveStanceSearchOpen,
  onInactiveStanceSearchOpenChange,
  onViewContextChange,
  externalHoveredNodeId,
  turnFeedback,
}: SimulationGraphProps) {
  const { play } = useInterfaceSound();
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [carriedEndedNodeIds, setCarriedEndedNodeIds] = useState<
    readonly string[]
  >([]);
  const endedNodeIdsThisTurn = useMemo(
    () =>
      turnFeedback?.changes
        .filter(({ previousActive, isActive }) => previousActive && !isActive)
        .map(({ nodeId }) => nodeId),
    [turnFeedback],
  );
  useEffect(() => {
    if (!turnFeedback || !endedNodeIdsThisTurn) return;
    // oxlint-disable-next-line react/set-state-in-effect -- retain ended nodes after the transient turn feedback clears.
    setCarriedEndedNodeIds(endedNodeIdsThisTurn);
  }, [endedNodeIdsThisTurn, turnFeedback]);
  const recentlyEndedNodeIds = endedNodeIdsThisTurn ?? carriedEndedNodeIds;
  const highlightedNodeId = externalHoveredNodeId ?? hoveredNodeId;
  const graph = useMemo(
    () =>
      projectToReactFlow(
        scenario,
        state,
        highlightedNodeId,
        turnFeedback,
        recentlyEndedNodeIds,
        undefined,
        factionMetricId,
      ),
    [
      highlightedNodeId,
      recentlyEndedNodeIds,
      scenario,
      state,
      turnFeedback,
      factionMetricId,
    ],
  );
  const categories = graph.navigationCategories;
  const [activeCategoryId, setActiveCategoryId] = useState(
    () => categories[0]?.id,
  );
  const [overview, setOverview] = useState(false);
  const activeCategory = overview
    ? undefined
    : (categories.find(({ id }) => id === activeCategoryId) ?? categories[0]);
  const showingOverview = overview || activeCategory === undefined;
  const instanceRef = useRef<GraphInstance | undefined>(undefined);
  const searchEntries = useMemo(
    () => projectNodeSearchEntries(scenario, state),
    [scenario, state],
  );
  const inactiveStanceEntries = useMemo(
    () => projectInactiveStanceSearchEntries(searchEntries),
    [searchEntries],
  );
  const nodes = graph.nodes;
  const edges = useMemo<Edge[]>(() => {
    return graph.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onNodeSelect: turnFeedback ? undefined : onNodeSelect,
      },
    }));
  }, [graph.edges, turnFeedback, onNodeSelect]);

  // Frame the matching graph nodes in the viewport, including faction groups.
  const fitNodes = useCallback(
    (nodeIds: readonly string[], duration = 480, includeFactions = true) => {
      const instance = instanceRef.current;
      const matchingNodes = nodes.filter((node) =>
        nodeIds.some(
          (id) =>
            node.id === id ||
            node.id ===
              createFactionGraphId(
                findFactionContext(scenario, id)?.group.id ?? "",
              ),
        ),
      );
      const categoryNodes = includeFactions
        ? matchingNodes
        : matchingNodes.filter((node) => node.data.nodeType !== "faction");
      const focusedNodes =
        categoryNodes.length > 0 ? categoryNodes : matchingNodes;
      if (!instance || focusedNodes.length === 0) return;
      void instance.fitBounds(getNodesBounds(focusedNodes), {
        padding: 0.22,
        duration,
      });
    },
    [nodes, scenario],
  );

  const showCategory = useCallback(
    (categoryId: string, duration = 480) => {
      const category = categories.find(({ id }) => id === categoryId);
      if (!category) return;
      setActiveCategoryId(category.id);
      setOverview(false);
      onViewContextChange?.(category.label);
      fitNodes(category.nodeIds, duration, category.includeFactions);
    },
    [categories, fitNodes, onViewContextChange],
  );

  const showOverview = useCallback(
    (duration = 480) => {
      setOverview(true);
      onViewContextChange?.("Overview");
      void instanceRef.current?.fitView({
        padding: 0.12,
        duration,
        maxZoom: 0.9,
      });
    },
    [onViewContextChange],
  );

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.key.toLowerCase() !== "k" ||
        (!event.metaKey && !event.ctrlKey) ||
        turnFeedback
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select, [role='textbox']"))
      )
        return;
      if (
        document.querySelector(
          '[data-slot="dialog-content"], [data-slot="alert-dialog-content"]',
        )
      )
        return;
      event.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, [turnFeedback]);

  const selectSearchEntry = useCallback(
    (entry: (typeof searchEntries)[number]) => {
      if (entry.isOnBoard) {
        // Match faction metrics through their shared group node on the graph.
        const category =
          categories.find(
            ({ nodeIds, includeFactions }) =>
              includeFactions &&
              nodeIds.includes(
                findFactionContext(scenario, entry.id)
                  ? createFactionGraphId(
                      findFactionContext(scenario, entry.id)!.group.id,
                    )
                  : entry.id,
              ),
          ) ??
          categories.find(({ nodeIds }) =>
            nodeIds.includes(
              findFactionContext(scenario, entry.id)
                ? createFactionGraphId(
                    findFactionContext(scenario, entry.id)!.group.id,
                  )
                : entry.id,
            ),
          );
        if (category) {
          // Switch to the matching category and frame the selected entry.
          setActiveCategoryId(category.id);
          setOverview(false);
          onViewContextChange?.(category.label);
          fitNodes([entry.id]);
        }
      }
      // Open the dossier for the selected scalar node, even when it is off-board.
      play("paper");
      onNodeSelect(entry.id);
    },
    [categories, fitNodes, onNodeSelect, onViewContextChange, play, scenario],
  );

  useEffect(() => {
    if (turnFeedback) {
      const changed = turnFeedback.changes.map(({ nodeId }) => nodeId);
      if (changed.length > 0) fitNodes(changed, 260);
      return;
    }
    if (showingOverview) {
      onViewContextChange?.("Overview");
      void instanceRef.current?.fitView({
        padding: 0.12,
        duration: 360,
        maxZoom: 0.9,
      });
    } else if (activeCategory) {
      onViewContextChange?.(activeCategory.label);
      fitNodes(activeCategory.nodeIds, 360, activeCategory.includeFactions);
    }
  }, [
    activeCategory,
    fitNodes,
    onViewContextChange,
    showingOverview,
    turnFeedback,
  ]);

  const minimapColor = useCallback((node: Node<SimulationNodeData>) => {
    if (node.data.revealing) return "var(--game-brass)";
    if (node.data.nodeType === "situation" && node.data.active)
      return "var(--game-warning)";
    if (!node.data.active) return "var(--game-ink-subtle)";
    const categoryColors = [
      "var(--chart-1)",
      "var(--chart-4)",
      "var(--game-brass)",
      "var(--chart-3)",
      "var(--chart-2)",
      "var(--chart-5)",
    ];
    return categoryColors[node.data.categoryIndex % categoryColors.length];
  }, []);

  return (
    <div className="graph-workspace">
      <GraphCategoryRail
        categories={categories}
        activeCategoryId={activeCategory?.id}
        showingOverview={showingOverview}
        disabled={Boolean(turnFeedback)}
        onSearchOpen={() => setSearchOpen(true)}
        onCategorySelect={showCategory}
        onOverviewSelect={showOverview}
      />
      <div
        className="simulation-board"
        data-game-graph-state={turnFeedback ? "resolving" : "ready"}
      >
        <div className="simulation-board__overlay-row">
          <div className="graph-legend" aria-label="Graph legend">
            <span>
              <i className="effect-key effect-key--positive" /> Increasing
            </span>
            <span>
              <i className="effect-key effect-key--negative" /> Decreasing
            </span>
          </div>
          <FactionMetricToggle
            scenario={scenario}
            metricId={factionMetricId}
            onChange={onFactionMetricChange}
          />
        </div>
        {turnFeedback && (
          <div className="turn-reveal-banner" role="status" aria-live="polite">
            <span>Year resolved</span>
            <strong>The board is responding</strong>
          </div>
        )}
        <ReactFlow
          key={scenario.id}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          minZoom={0.25}
          maxZoom={1.7}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={!turnFeedback}
          panOnDrag={!turnFeedback}
          zoomOnScroll={!turnFeedback}
          zoomOnPinch={!turnFeedback}
          onInit={(instance) => {
            instanceRef.current = instance;
            const first = categories[0];
            if (first) requestAnimationFrame(() => showCategory(first.id, 0));
          }}
          onNodeClick={(_event, node) => {
            if (!turnFeedback) {
              play("paper");
              onNodeSelect(node.data.nodeId ?? node.id);
            }
          }}
          onEdgeClick={(_event, edge) => {
            const targetNodeId = edge.data?.targetNodeId;
            if (!turnFeedback && typeof targetNodeId === "string") {
              play("paper");
              onNodeSelect(targetNodeId);
            }
          }}
          onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
          onNodeMouseLeave={(_event, node) =>
            setHoveredNodeId((current) =>
              current === node.id ? undefined : current,
            )
          }
          onPaneMouseLeave={() => setHoveredNodeId(undefined)}
          aria-label="Institutional simulation graph"
        >
          <Controls showInteractive={false} />
          <MiniMap
            ariaLabel="Institutional simulation graph overview"
            nodeColor={minimapColor}
            nodeStrokeColor="var(--game-paper)"
            nodeStrokeWidth={2}
            maskColor="color-mix(in oklch, var(--game-wood) 16%, transparent)"
            pannable
            zoomable
          />
        </ReactFlow>
      </div>
      <NodeSearchDialog
        open={searchOpen}
        entries={searchEntries}
        onOpenChange={setSearchOpen}
        onSelect={selectSearchEntry}
        shortcut="Ctrl K"
      />
      <NodeSearchDialog
        open={inactiveStanceSearchOpen}
        entries={inactiveStanceEntries}
        onOpenChange={onInactiveStanceSearchOpenChange}
        onSelect={selectSearchEntry}
        title="Enact a stance"
        description="Find inactive Stances to review and enact."
        placeholder="Search inactive Stances…"
        emptyMessage="No inactive Stances are available."
        offBoardHeading="Inactive Stances"
      />
    </div>
  );
}

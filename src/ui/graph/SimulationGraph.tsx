import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Controls,
  getNodesBounds,
  MiniMap,
  ReactFlow,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import { CirclePlus, LayoutDashboard, Search } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import type { ScenarioDefinition, SimulationState } from "../../simulation";
import {
  projectEffectsToReactFlow,
  projectGraphCategories,
  projectToReactFlow,
  type GraphTurnFeedback,
  type SimulationNodeData,
} from "./projectToReactFlow";
import {
  projectInactiveStanceSearchEntries,
  projectNodeSearchEntries,
} from "./projectNodeSearch";
import { NodeSearchDialog } from "./NodeSearchDialog";
import { SimulationNode } from "./SimulationNode";
import { useInterfaceSound } from "../sound/interfaceSoundContext";
import "./simulation-graph.css";

const nodeTypes: NodeTypes = { simulation: SimulationNode };

interface SimulationGraphProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onViewContextChange?: (label: string) => void;
  readonly externalHoveredNodeId?: string;
  readonly turnFeedback?: GraphTurnFeedback;
}

type GraphInstance = ReactFlowInstance<Node<SimulationNodeData>>;

export function SimulationGraph({
  scenario,
  state,
  onNodeSelect,
  onViewContextChange,
  externalHoveredNodeId,
  turnFeedback,
}: SimulationGraphProps) {
  const { play } = useInterfaceSound();
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [inactiveStanceSearchOpen, setInactiveStanceSearchOpen] =
    useState(false);
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
  const categories = useMemo(
    () =>
      projectGraphCategories(
        scenario,
        state,
        turnFeedback,
        recentlyEndedNodeIds,
      ),
    [recentlyEndedNodeIds, scenario, state, turnFeedback],
  );
  const [activeCategoryId, setActiveCategoryId] = useState(
    () => categories[0]?.id,
  );
  const [overview, setOverview] = useState(false);
  const activeCategory = overview
    ? undefined
    : (categories.find(({ id }) => id === activeCategoryId) ?? categories[0]);
  const showingOverview = overview || activeCategory === undefined;
  const instanceRef = useRef<GraphInstance | undefined>(undefined);
  const graph = useMemo(
    () =>
      projectToReactFlow(
        scenario,
        state,
        highlightedNodeId,
        turnFeedback,
        recentlyEndedNodeIds,
      ),
    [highlightedNodeId, recentlyEndedNodeIds, scenario, state, turnFeedback],
  );
  const searchEntries = useMemo(
    () => projectNodeSearchEntries(scenario, state),
    [scenario, state],
  );
  const inactiveStanceEntries = useMemo(
    () => projectInactiveStanceSearchEntries(searchEntries),
    [searchEntries],
  );
  const nodes = graph.nodes;
  const edges = useMemo(
    () =>
      highlightedNodeId === undefined
        ? graph.edges
        : projectEffectsToReactFlow(
            scenario,
            state,
            highlightedNodeId,
            turnFeedback,
            recentlyEndedNodeIds,
          ),
    [
      graph.edges,
      highlightedNodeId,
      recentlyEndedNodeIds,
      scenario,
      state,
      turnFeedback,
    ],
  );
  const fitNodes = useCallback(
    (nodeIds: readonly string[], duration = 480, includeFactions = true) => {
      const instance = instanceRef.current;
      const matchingNodes = nodes.filter((node) => nodeIds.includes(node.id));
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
    [nodes],
  );

  const showCategory = useCallback(
    (categoryId: string, duration = 480) => {
      const category = categories.find(({ id }) => id === categoryId);
      if (!category) return;
      setActiveCategoryId(category.id);
      setOverview(false);
      onViewContextChange?.(category.label);
      fitNodes(category.nodeIds, duration, false);
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
        const category = categories.find(({ nodeIds }) =>
          nodeIds.includes(entry.id),
        );
        if (category) {
          setActiveCategoryId(category.id);
          setOverview(false);
          onViewContextChange?.(category.label);
          fitNodes([entry.id]);
        }
      }
      play("paper");
      onNodeSelect(entry.id);
    },
    [categories, fitNodes, onNodeSelect, onViewContextChange, play],
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
      fitNodes(activeCategory.nodeIds, 360, false);
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
      <nav className="graph-category-rail" aria-label="Graph categories">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-game-node-search-trigger
          aria-label="Search nodes"
          aria-keyshortcuts="Control+K Meta+K"
          disabled={Boolean(turnFeedback)}
          onClick={() => setSearchOpen(true)}
        >
          <Search data-icon="inline-start" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-game-inactive-stance-search-trigger
          aria-label="Find a stance to enact"
          disabled={Boolean(turnFeedback)}
          onClick={() => setInactiveStanceSearchOpen(true)}
        >
          <CirclePlus data-icon="inline-start" />
        </Button>
        <div className="graph-category-rail__scroll" role="tablist">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant="ghost"
              role="tab"
              aria-selected={
                !showingOverview && activeCategory?.id === category.id
              }
              data-active={
                !showingOverview && activeCategory?.id === category.id
              }
              onClick={() => showCategory(category.id)}
            >
              {category.label}
              <span aria-hidden="true">{category.nonFactionNodeCount}</span>
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            role="tab"
            aria-selected={showingOverview}
            data-active={showingOverview}
            onClick={() => showOverview()}
          >
            <LayoutDashboard data-icon="inline-start" /> Overview
          </Button>
        </div>
      </nav>
      <div
        className="simulation-board"
        data-game-graph-state={turnFeedback ? "resolving" : "ready"}
      >
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
              onNodeSelect(node.id);
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
      />
      <NodeSearchDialog
        open={inactiveStanceSearchOpen}
        entries={inactiveStanceEntries}
        onOpenChange={setInactiveStanceSearchOpen}
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

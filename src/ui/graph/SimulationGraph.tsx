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
import { Grid2X2, LayoutDashboard } from "lucide-react";
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
import { SimulationNode } from "./SimulationNode";
import { useInterfaceSound } from "../sound/interfaceSoundContext";
import "./simulation-graph.css";

const nodeTypes: NodeTypes = { simulation: SimulationNode };

interface SimulationGraphProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly onViewContextChange?: (label: string) => void;
  readonly turnFeedback?: GraphTurnFeedback;
}

type GraphInstance = ReactFlowInstance<Node<SimulationNodeData>>;

export function SimulationGraph({
  scenario,
  state,
  onNodeSelect,
  onViewContextChange,
  turnFeedback,
}: SimulationGraphProps) {
  const { play } = useInterfaceSound();
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const categories = useMemo(
    () => projectGraphCategories(scenario),
    [scenario],
  );
  const [activeCategoryId, setActiveCategoryId] = useState(
    () => categories[0]?.id,
  );
  const [overview, setOverview] = useState(false);
  const instanceRef = useRef<GraphInstance | undefined>(undefined);
  const graph = useMemo(
    () => projectToReactFlow(scenario, state, undefined, turnFeedback),
    [scenario, state, turnFeedback],
  );
  const nodes = graph.nodes;
  const edges = useMemo(
    () =>
      hoveredNodeId === undefined
        ? graph.edges
        : projectEffectsToReactFlow(
            scenario,
            state,
            hoveredNodeId,
            turnFeedback,
          ),
    [graph.edges, hoveredNodeId, scenario, state, turnFeedback],
  );
  const fitNodes = useCallback(
    (nodeIds: readonly string[], duration = 480) => {
      const instance = instanceRef.current;
      const focusedNodes = nodes.filter((node) => nodeIds.includes(node.id));
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
      fitNodes(category.nodeIds, duration);
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
    if (turnFeedback) {
      const changed = turnFeedback.changes.map(({ nodeId }) => nodeId);
      if (changed.length > 0) fitNodes(changed, 260);
      return;
    }
    if (overview) {
      void instanceRef.current?.fitView({
        padding: 0.12,
        duration: 360,
        maxZoom: 0.9,
      });
    } else if (activeCategoryId) {
      const category = categories.find(({ id }) => id === activeCategoryId);
      if (category) fitNodes(category.nodeIds, 360);
    }
  }, [activeCategoryId, categories, fitNodes, overview, turnFeedback]);

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
    <div
      className="simulation-board"
      data-game-graph-state={turnFeedback ? "resolving" : "ready"}
    >
      <nav className="graph-category-rail" aria-label="Graph categories">
        <span className="graph-category-rail__label">
          <Grid2X2 aria-hidden="true" /> Board focus
        </span>
        <div className="graph-category-rail__scroll" role="tablist">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant="ghost"
              role="tab"
              aria-selected={!overview && activeCategoryId === category.id}
              data-active={!overview && activeCategoryId === category.id}
              onClick={() => showCategory(category.id)}
            >
              {category.label}
              <span aria-hidden="true">{category.nodeIds.length}</span>
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            role="tab"
            aria-selected={overview}
            data-active={overview}
            onClick={() => showOverview()}
          >
            <LayoutDashboard data-icon="inline-start" /> Overview
          </Button>
        </div>
      </nav>
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
  );
}

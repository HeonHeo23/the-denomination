import { useMemo, useState } from "react";
import { Controls, ReactFlow, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ScenarioDefinition, SimulationState } from "../../simulation";
import {
  projectEffectsToReactFlow,
  projectToReactFlow,
  type GraphTurnFeedback,
} from "./projectToReactFlow";
import { SimulationNode } from "./SimulationNode";
import "./simulation-graph.css";

const nodeTypes: NodeTypes = { simulation: SimulationNode };

interface SimulationGraphProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
  readonly turnFeedback?: GraphTurnFeedback;
}

export function SimulationGraph({
  scenario,
  state,
  onNodeSelect,
  turnFeedback,
}: SimulationGraphProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const graph = useMemo(
    () => projectToReactFlow(scenario, state, undefined, turnFeedback),
    [scenario, state, turnFeedback],
  );
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

  return (
    <div
      className="simulation-board"
      data-game-graph-state={turnFeedback ? "resolving" : "ready"}
    >
      {turnFeedback && (
        <div className="turn-reveal-banner" role="status" aria-live="polite">
          <span>Proceedings recorded</span>
          <strong>The institution responds</strong>
        </div>
      )}
      <ReactFlow
        key={scenario.id}
        nodes={graph.nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1.05 }}
        minZoom={0.28}
        maxZoom={1.65}
        nodesDraggable={!turnFeedback}
        nodesConnectable={false}
        elementsSelectable={!turnFeedback}
        panOnDrag={!turnFeedback}
        zoomOnScroll={!turnFeedback}
        zoomOnPinch={!turnFeedback}
        onNodeClick={(_event, node) => {
          if (!turnFeedback) onNodeSelect(node.id);
        }}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={(_event, node) =>
          setHoveredNodeId((current) =>
            current === node.id ? undefined : current,
          )
        }
        onPaneMouseLeave={() => setHoveredNodeId(undefined)}
        proOptions={{ hideAttribution: true }}
        aria-label="Institutional simulation graph"
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

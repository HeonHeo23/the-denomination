import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ScenarioDefinition, SimulationState } from "../../simulation";
import {
  projectEffectsToReactFlow,
  projectToReactFlow,
} from "./projectToReactFlow";
import { SimulationNode } from "./SimulationNode";

const nodeTypes: NodeTypes = { simulation: SimulationNode };

interface SimulationGraphProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly onNodeSelect: (nodeId: string) => void;
}

export function SimulationGraph({
  scenario,
  state,
  onNodeSelect,
}: SimulationGraphProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();
  const graph = useMemo(
    () => projectToReactFlow(scenario, state),
    [scenario, state],
  );
  const edges = useMemo(
    () =>
      hoveredNodeId === undefined
        ? graph.edges
        : projectEffectsToReactFlow(scenario, state, hoveredNodeId),
    [graph.edges, hoveredNodeId, scenario, state],
  );

  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.16 }}
      minZoom={0.35}
      maxZoom={1.5}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      onNodeClick={(_event, node) => onNodeSelect(node.id)}
      onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
      onNodeMouseLeave={(_event, node) =>
        setHoveredNodeId((current) =>
          current === node.id ? undefined : current,
        )
      }
      onPaneMouseLeave={() => setHoveredNodeId(undefined)}
      proOptions={{ hideAttribution: true }}
      aria-label="Institutional causal graph"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

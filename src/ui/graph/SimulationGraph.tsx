import { useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ScenarioDefinition, SimulationState } from '../../simulation'
import { projectToReactFlow } from './projectToReactFlow'
import { SimulationNode } from './SimulationNode'

const nodeTypes: NodeTypes = { simulation: SimulationNode }

interface SimulationGraphProps {
  readonly scenario: ScenarioDefinition
  readonly state: SimulationState
}

export function SimulationGraph({ scenario, state }: SimulationGraphProps) {
  const graph = useMemo(
    () => projectToReactFlow(scenario, state),
    [scenario, state],
  )

  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.16 }}
      minZoom={0.35}
      maxZoom={1.5}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}


import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { ScenarioDefinition, SimulationState } from '../../simulation'

export interface SimulationNodeData extends Record<string, unknown> {
  readonly label: string
  readonly description: string
  readonly nodeType: string
  readonly value: number
  readonly active: boolean
  readonly forced: boolean
}

const columns: Record<string, number> = {
  stance: 0,
  indicator: 360,
  faction: 360,
  situation: 720,
}

export function projectToReactFlow(
  scenario: ScenarioDefinition,
  state: SimulationState,
): { nodes: Node<SimulationNodeData>[]; edges: Edge[] } {
  const rows: Record<string, number> = {
    stance: 0,
    indicator: 0,
    faction: 0,
    situation: 0,
  }
  const visible = new Set(
    scenario.nodes
      .filter((definition) => definition.isVisible !== false)
      .map(({ id }) => id),
  )

  const nodes = scenario.nodes
    .filter(({ id }) => visible.has(id))
    .map((definition): Node<SimulationNodeData> => {
      const runtime = state.nodes[definition.id]
      const row = rows[definition.type] ?? 0
      rows[definition.type] = row + 1
      return {
        id: definition.id,
        type: 'simulation',
        position: { x: columns[definition.type] ?? 0, y: row * 152 },
        data: {
          label: definition.name,
          description: definition.description,
          nodeType: definition.type,
          value: runtime.value,
          active: runtime.isActive,
          forced: runtime.isForced,
        },
      }
    })

  const edges = scenario.effects
    .filter(
      (effect) =>
        effect.source !== '_default_' &&
        visible.has(effect.source) &&
        visible.has(effect.target),
    )
    .map((effect): Edge => {
      const contribution = state.effects[effect.id]?.lastContribution ?? 0
      const positive = contribution >= 0
      return {
        id: effect.id,
        source: effect.source,
        target: effect.target,
        label: effect.label,
        type: 'smoothstep',
        animated:
          state.nodes[effect.source].isActive &&
          Math.abs(contribution) > 0.001,
        style: {
          stroke: positive ? '#4f8f74' : '#b85c4f',
          strokeWidth: Math.min(3, 1.2 + Math.abs(contribution) * 3),
        },
        labelStyle: { fill: '#6e685f', fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#f5f0e5', fillOpacity: 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: positive ? '#4f8f74' : '#b85c4f',
        },
      }
    })

  return { nodes, edges }
}


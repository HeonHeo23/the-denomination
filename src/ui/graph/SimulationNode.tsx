import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { SimulationNodeData } from './projectToReactFlow'

export function SimulationNode({ data }: NodeProps<Node<SimulationNodeData>>) {
  const percent = Math.round(data.value * 100)
  return (
    <div
      className={`simulation-node simulation-node--${data.nodeType}${data.active ? '' : ' is-inactive'}`}
      title={data.description}
    >
      <Handle type="target" position={Position.Left} />
      <div className="simulation-node__eyebrow">
        {data.nodeType}
        {!data.active && <span>inactive</span>}
      </div>
      <strong>{data.label}</strong>
      <div className="simulation-node__meter" aria-label={`${percent} percent`}>
        <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <output>{percent}%</output>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}


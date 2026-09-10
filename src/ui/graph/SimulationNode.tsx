import { formatValue, meterPercent } from "../formatValue";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { SimulationNodeData } from "./projectToReactFlow";

export function SimulationNode({ data }: NodeProps<Node<SimulationNodeData>>) {
  const percent = meterPercent(data.value, data.domain);
  const label = formatValue(data.value, data.domain);
  return (
    <div
      className={`simulation-node simulation-node--${data.nodeType}${data.active ? "" : " is-inactive"}`}
      title={data.description}
    >
      <Handle type="target" position={Position.Left} />
      <div className="simulation-node__eyebrow">
        <span>{data.nodeType}</span>
        <span>{data.category}</span>
        {!data.active && <span>inactive</span>}
      </div>
      <strong>{data.label}</strong>
      <div className="simulation-node__meter" aria-label={label}>
        <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <output>{label}</output>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

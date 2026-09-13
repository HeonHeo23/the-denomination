import { formatValue, meterPercent } from "../formatValue";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Progress } from "@/components/ui/progress";
import type { SimulationNodeData } from "./projectToReactFlow";

export function SimulationNode({ data }: NodeProps<Node<SimulationNodeData>>) {
  const percent = meterPercent(data.value, data.domain);
  const label = formatValue(data.value, data.domain);
  return (
    <div
      className="simulation-node"
      data-node-type={data.nodeType}
      data-inactive={!data.active}
      title={data.description}
    >
      <Handle type="target" position={Position.Left} />
      <div className="simulation-node__meta">
        <span>{data.nodeType}</span>
        <span className="simulation-node__category">{data.category}</span>
        {!data.active && <span>inactive</span>}
      </div>
      <strong className="simulation-node__title">{data.label}</strong>
      <div className="simulation-node__value">
        <Progress
          value={Math.min(100, Math.max(0, percent))}
          aria-label={label}
        />
        <output>{label}</output>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

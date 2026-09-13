import {
  Activity,
  CircleGauge,
  Coins,
  SlidersHorizontal,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { formatSignedValue, formatValue, meterPercent } from "../formatValue";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Progress } from "@/components/ui/progress";
import type { SimulationNodeData } from "./projectToReactFlow";

export function SimulationNode({ data }: NodeProps<Node<SimulationNodeData>>) {
  const percent = meterPercent(data.value, data.domain);
  const label = formatValue(data.value, data.domain);
  const NodeIcon =
    {
      stance: SlidersHorizontal,
      indicator: CircleGauge,
      faction: UsersRound,
      situation: TriangleAlert,
      resource: Coins,
    }[data.nodeType] ?? Activity;
  return (
    <div
      className="simulation-node"
      data-node-type={data.nodeType}
      data-inactive={!data.active}
      data-turn-change={data.revealing ? "true" : undefined}
      data-activation-transition={data.activationTransition}
      title={data.description}
    >
      <Handle type="target" position={Position.Left} />
      <div className="simulation-node__meta">
        <span className="simulation-node__type">
          <NodeIcon aria-hidden="true" />
          {data.nodeType}
        </span>
        <span className="simulation-node__category">{data.category}</span>
      </div>
      <div className="simulation-node__heading">
        <strong className="simulation-node__title">{data.label}</strong>
        {data.turnDelta !== undefined && Math.abs(data.turnDelta) > 1e-9 && (
          <span
            className="simulation-node__delta"
            data-direction={data.turnDelta > 0 ? "increasing" : "decreasing"}
          >
            {formatSignedValue(data.turnDelta, data.domain)}
          </span>
        )}
        {data.activationTransition && (
          <span className="simulation-node__stamp">
            {data.activationTransition === "began" ? "Active" : "Ended"}
          </span>
        )}
      </div>
      <div className="simulation-node__value">
        <Progress
          value={Math.min(100, Math.max(0, percent))}
          aria-label={label}
        />
        <output>{label}</output>
      </div>
      {!data.active && (
        <span className="simulation-node__inactive">Inactive</span>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

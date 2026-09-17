import {
  Activity,
  CircleGauge,
  Coins,
  SlidersHorizontal,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import type { CSSProperties } from "react";
import { formatSignedValue, formatValue, meterPercent } from "../formatValue";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Progress } from "@/components/ui/progress";
import type { SimulationNodeData } from "./projectToReactFlow";
import "../reference-markers.css";

export function SimulationNode({ data }: NodeProps<Node<SimulationNodeData>>) {
  const percent = meterPercent(data.value, data.domain);
  const label = formatValue(data.value, data.domain);
  const referenceDescription = data.referenceMarkers
    .map(
      ({ label: markerLabel, value }) =>
        `${markerLabel} ${formatValue(value, data.domain)}`,
    )
    .join("; ");
  const referenceAriaDescription = referenceDescription
    ? `; ${referenceDescription}`
    : "";
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
      data-focused={data.focused ? "true" : undefined}
      data-activation-transition={data.activationTransition}
      title={data.description}
      style={
        {
          "--reveal-index": Math.max(0, data.revealIndex ?? 0),
        } as CSSProperties
      }
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
        <div className="simulation-node__meter">
          <Progress
            value={Math.min(100, Math.max(0, percent))}
            aria-label={`Current ${label}${referenceAriaDescription}`}
          />
          {data.referenceMarkers.map((marker) => (
            <span
              className="reference-meter-marker"
              data-reference-edge={
                marker.positionPercent === 0
                  ? "start"
                  : marker.positionPercent === 100
                    ? "end"
                    : undefined
              }
              key={marker.kind}
              style={{
                left: `${marker.positionPercent}%`,
              }}
              aria-hidden="true"
            >
              <span
                className="reference-meter-tick"
                data-reference-kind={marker.kind}
              />
              <span className="reference-meter-marker__value">
                {formatValue(marker.value, data.domain)}
              </span>
            </span>
          ))}
        </div>
        <output>{label}</output>
      </div>
      {!data.active && (
        <span className="simulation-node__inactive">Inactive</span>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

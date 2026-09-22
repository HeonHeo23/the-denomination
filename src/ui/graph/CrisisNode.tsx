import { CircleAlert, ShieldCheck, Skull } from "lucide-react";
import type { CSSProperties } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CrisisGraphNodeData } from "./projectToReactFlow";

export function CrisisNode({ data }: NodeProps<Node<CrisisGraphNodeData>>) {
  const Icon =
    data.status === "terminal"
      ? Skull
      : data.status === "recovered"
        ? ShieldCheck
        : CircleAlert;
  const statusLabel =
    data.status === "terminal"
      ? "Terminal"
      : data.status === "recovered"
        ? "Recovered"
        : "Warning";
  const countdown =
    data.status === "terminal"
      ? "Game Over"
      : data.status === "recovered"
        ? "Cleared this turn"
        : `${data.turnsRemaining} turn${data.turnsRemaining === 1 ? "" : "s"} remaining`;

  return (
    <div
      className="crisis-node"
      data-crisis-status={data.status}
      data-focused={data.focused ? "true" : undefined}
      data-turn-change={data.revealing ? "true" : undefined}
      style={
        {
          "--reveal-index": Math.max(0, data.revealIndex ?? 0),
        } as CSSProperties
      }
      title={data.description}
    >
      <Handle type="target" position={Position.Left} />
      <div className="crisis-node__meta">
        <span className="crisis-node__type">
          <Icon aria-hidden="true" /> Crisis trajectory
        </span>
        <Badge
          variant={data.status === "recovered" ? "outline" : "destructive"}
        >
          {statusLabel}
        </Badge>
      </div>
      <strong className="crisis-node__title">{data.label}</strong>
      <div className="crisis-node__stage">
        {data.stageTitle ??
          (data.status === "recovered"
            ? "Prerequisites cleared"
            : "Under inquiry")}
      </div>
      <Progress
        value={Math.min(100, Math.max(0, data.progressPercent))}
        aria-label={`${data.label}: ${data.consecutiveTurns} of ${data.terminalAfterTurns} qualifying turns`}
      />
      <div className="crisis-node__footer">
        <span>{countdown}</span>
        <span>
          {data.consecutiveTurns}/{data.terminalAfterTurns} turns
        </span>
      </div>
    </div>
  );
}

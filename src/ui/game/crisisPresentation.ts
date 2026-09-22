import { CircleAlert, ShieldCheck, Skull } from "lucide-react";
import { createElement } from "react";
import type {
  CrisisStatus,
  CrisisView,
  GameOverWarningView,
} from "./projectGameOvers";

export function crisisStatusLabel(status: CrisisStatus): string {
  if (status === "terminal") return "Terminal";
  if (status === "recovered") return "Recovered this turn";
  return "Warning";
}

export function crisisStatusVariant(status: CrisisStatus) {
  return status === "recovered"
    ? ("outline" as const)
    : ("destructive" as const);
}

export function crisisStatusIcon(status: CrisisStatus) {
  const Icon =
    status === "terminal"
      ? Skull
      : status === "recovered"
        ? ShieldCheck
        : CircleAlert;
  return createElement(Icon, { "aria-hidden": true });
}

export function crisisStageLabel(
  crisis: CrisisView | GameOverWarningView,
): string {
  return (
    crisis.stage?.title ??
    ("status" in crisis && crisis.status === "recovered"
      ? "Prerequisites cleared"
      : "Under inquiry")
  );
}

export function crisisTurnsLabel(turns: number): string {
  return `${turns} turn${turns === 1 ? "" : "s"}`;
}

export function crisisCountdown(crisis: CrisisView): string {
  if (crisis.status === "terminal") return "Game Over";
  if (crisis.status === "recovered") return "Cleared this turn";
  return `${crisisTurnsLabel(crisis.turnsRemaining)} remaining`;
}

export function crisisProgressLabel(crisis: GameOverWarningView): string {
  return `${crisis.definition.title}: ${crisis.consecutiveTurns} of ${crisis.definition.terminalAfterTurns} qualifying turns`;
}

export function crisisElapsedLabel(crisis: GameOverWarningView): string {
  return `${crisis.consecutiveTurns}/${crisis.definition.terminalAfterTurns} qualifying turns`;
}

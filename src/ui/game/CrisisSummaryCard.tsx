import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDossierTriggerProps } from "@/ui/dossierActivation";
import {
  crisisElapsedLabel,
  crisisProgressLabel,
  crisisTurnsLabel,
} from "./crisisPresentation";
import type { CrisisView, GameOverReportCauseView } from "./projectGameOvers";

type CrisisSummaryCardProps =
  | {
      readonly variant: "compact";
      readonly crisis: CrisisView;
      readonly onOpen: () => void;
    }
  | {
      readonly variant: "terminal";
      readonly cause: GameOverReportCauseView;
      readonly duration: number;
      readonly onOpen: () => void;
    };

export function CrisisSummaryCard(props: CrisisSummaryCardProps) {
  const terminal = props.variant === "terminal";
  const definition = terminal
    ? props.cause.definition
    : props.crisis.definition;
  const title = terminal ? definition.report.title : definition.title;

  return (
    <Card
      size="sm"
      className="cursor-pointer border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      data-game-crisis-notice={
        terminal
          ? undefined
          : props.crisis.status === "terminal"
            ? "terminal"
            : "active"
      }
      data-game-effect-table={terminal ? true : undefined}
      data-game-effect-table-interactive={terminal ? true : undefined}
      {...getDossierTriggerProps(
        `Open ${definition.title} crisis dossier`,
        props.onOpen,
      )}
    >
      <CardHeader
        className={terminal ? "border-b border-border/60" : undefined}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="min-w-0 text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      {terminal ? (
        <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex h-full min-w-0 flex-col gap-2">
            <p className="line-clamp-3 leading-relaxed text-muted-foreground">
              {definition.report.narrative}
            </p>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              Open crisis dossier <ArrowRight aria-hidden="true" />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-48 sm:grid-cols-1">
            <div>
              <span className="font-mono text-[0.62rem] tracking-wider text-muted-foreground uppercase">
                Duration
              </span>
              <strong className="mt-1 block text-sm">
                {crisisTurnsLabel(props.duration)}
              </strong>
            </div>
            <div>
              <span className="font-mono text-[0.62rem] tracking-wider text-muted-foreground uppercase">
                Biggest cause
              </span>
              <strong
                className="mt-1 block truncate text-sm"
                title={
                  props.cause.biggestContribution?.sourceTitle ??
                  "Activated prerequisite trajectory"
                }
              >
                {props.cause.biggestContribution?.sourceTitle ??
                  "Activated prerequisites"}
              </strong>
              <small className="mt-1 block truncate text-muted-foreground">
                {props.cause.biggestContribution
                  ? `${props.cause.biggestContribution.value} · ${props.cause.biggestContribution.label}`
                  : `${props.cause.matchedGroups.length} activated group${props.cause.matchedGroups.length === 1 ? "" : "s"}`}
              </small>
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{crisisElapsedLabel(props.crisis)}</span>
          </div>
          <Progress
            value={props.crisis.progressPercent}
            aria-label={crisisProgressLabel(props.crisis)}
          />
        </CardContent>
      )}
    </Card>
  );
}

import type { CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toPercent } from "@/ui/formatValue";
import type { NodeEffectView } from "./projectNodeEffects";

interface NodeEffectCardProps {
  readonly title: string;
  readonly direction: "incoming" | "outgoing";
  readonly effects: readonly NodeEffectView[];
  readonly onNodeSelect: (nodeId: string) => void;
  readonly layout?: "standard" | "stance";
}

function effectBarMagnitudePercent(contribution: number): number {
  if (Math.abs(contribution) < 0.000001) return 0;
  return Math.min(100, Math.max(0, toPercent(Math.abs(contribution))));
}

function effectBarSpanPercent(contribution: number): number {
  return effectBarMagnitudePercent(contribution) / 2;
}

function EffectBar({ effect }: { readonly effect: NodeEffectView }) {
  const span = effectBarSpanPercent(effect.contribution);
  const hasTarget = effect.previewContribution !== undefined;
  const hasPreviewDifference =
    hasTarget &&
    Math.abs(effect.previewContribution - effect.contribution) >= 0.000001;
  const currentPosition =
    50 +
    Math.sign(effect.contribution) * effectBarSpanPercent(effect.contribution);
  const previewPosition = hasPreviewDifference
    ? 50 +
      Math.sign(effect.previewContribution ?? 0) *
        effectBarSpanPercent(effect.previewContribution ?? 0)
    : undefined;
  const style = {
    "--effect-bar-span": `${span}%`,
    ...(previewPosition === undefined
      ? {}
      : {
          "--effect-bar-preview-start": `${Math.min(currentPosition, previewPosition)}%`,
          "--effect-bar-preview-span": `${Math.abs(currentPosition - previewPosition)}%`,
        }),
  } as CSSProperties;
  const displayedLabel = hasTarget
    ? (effect.previewContributionLabel ?? effect.contributionLabel)
    : effect.contributionLabel;
  const displayedTone = hasTarget
    ? (effect.previewContributionTone ?? effect.contributionTone)
    : effect.contributionTone;
  const previewDescription = hasTarget
    ? `Current ${effect.contributionLabel}; settled target ${displayedLabel} after the full ${effect.inertiaTurns ?? 1}-turn inertia window`
    : `${effect.contributionLabel} change`;

  return (
    <div
      className="effect-bar"
      data-tone={effect.contributionTone}
      data-label-tone={displayedTone}
      data-preview={hasPreviewDifference ? "true" : undefined}
      title={previewDescription}
      style={style}
    >
      <Progress
        aria-label={previewDescription}
        data-tone={effect.contributionTone}
        value={effectBarMagnitudePercent(effect.contribution)}
      />
      <span aria-hidden="true" className="effect-bar__fill" />
      {hasPreviewDifference && (
        <span aria-hidden="true" className="effect-bar__preview-fill" />
      )}
      <span className="effect-bar__value">
        {hasTarget ? (
          <>
            <span className="effect-bar__value-current">
              {effect.contributionLabel}
            </span>
            <span className="effect-bar__value-target">{displayedLabel}</span>
          </>
        ) : (
          displayedLabel
        )}
      </span>
    </div>
  );
}

function EffectRow({
  effect,
  direction,
  layout,
  onNodeSelect,
}: {
  readonly effect: NodeEffectView;
  readonly direction: NodeEffectCardProps["direction"];
  readonly layout: NonNullable<NodeEffectCardProps["layout"]>;
  readonly onNodeSelect: NodeEffectCardProps["onNodeSelect"];
}) {
  const Icon = direction === "incoming" ? ArrowDownRight : ArrowUpRight;
  const linked = effect.relatedNodeId !== undefined;
  const inertiaTurns = effect.inertiaTurns ?? 1;
  const relationshipLabel = effect.label ?? "Persistent causal relationship";
  const activateRelatedNode = () => {
    if (effect.relatedNodeId) onNodeSelect(effect.relatedNodeId);
  };

  return (
    <Item
      aria-label={
        linked
          ? `Open ${effect.relatedName} node${effect.label ? `: ${effect.label}` : ""}`
          : (effect.label ?? effect.relatedName)
      }
      className={cn(
        "gap-2 py-1.5",
        layout === "stance" && "flex-nowrap px-2 py-2",
        linked && "cursor-pointer hover:bg-accent focus-visible:bg-accent",
      )}
      onClick={linked ? activateRelatedNode : undefined}
      onKeyDown={
        linked
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activateRelatedNode();
              }
            }
          : undefined
      }
      role={linked ? "button" : "listitem"}
      tabIndex={linked ? 0 : undefined}
      size="sm"
      variant="muted"
    >
      <Icon aria-hidden="true" />
      <ItemContent
        className={
          layout === "stance"
            ? "min-w-0 flex-row items-center gap-2"
            : "min-w-0 gap-1"
        }
      >
        <div
          className={
            layout === "stance"
              ? "flex min-w-0 max-w-[42%] flex-1 items-baseline gap-1 overflow-hidden whitespace-nowrap"
              : "flex min-w-0 items-baseline justify-between gap-1"
          }
        >
          <ItemTitle
            className={
              layout === "stance"
                ? "min-w-0 max-w-[60%] shrink-0"
                : "min-w-0 max-w-[55%]"
            }
          >
            <span
              className={layout === "stance" ? "min-w-0 truncate" : "truncate"}
            >
              {effect.relatedName}
            </span>
          </ItemTitle>
          {layout === "stance" ? (
            <span className="min-w-0 flex-1 truncate text-[0.65rem] leading-none text-muted-foreground">
              {relationshipLabel}
            </span>
          ) : (
            <ItemDescription className="min-w-0 flex-1 truncate text-right">
              {relationshipLabel}
            </ItemDescription>
          )}
        </div>
        <div
          className={
            layout === "stance"
              ? "flex min-w-0 flex-1 items-center gap-2"
              : "flex min-w-0 items-center gap-1"
          }
        >
          <EffectBar effect={effect} />
          <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
            ({inertiaTurns})
          </span>
        </div>
      </ItemContent>
    </Item>
  );
}

export function NodeEffectCard({
  title,
  direction,
  effects,
  onNodeSelect,
  layout = "standard",
}: NodeEffectCardProps) {
  return (
    <Card className="h-full min-h-0 max-h-full" size="sm">
      <CardHeader className="shrink-0">
        <CardTitle>
          {title} ({effects.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-2">
        {effects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {direction} Effects.
          </p>
        ) : (
          <ScrollArea className="h-full max-h-full pr-1">
            <ItemGroup className="gap-1">
              {effects.map((effect) => (
                <EffectRow
                  key={effect.id}
                  effect={effect}
                  direction={direction}
                  layout={layout}
                  onNodeSelect={onNodeSelect}
                />
              ))}
            </ItemGroup>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

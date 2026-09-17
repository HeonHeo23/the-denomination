import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type {
  ScenarioDefinition,
  SimulationState,
  StanceDefinition,
} from "@/simulation";
import {
  assessStanceChange,
  assessStanceEnactment,
  assessStanceRepeal,
} from "@/simulation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { formatValue, meterPercent } from "@/ui/formatValue";
import { useInterfaceSound } from "@/ui/sound/interfaceSoundContext";

interface StanceEditorProps {
  readonly state: SimulationState;
  readonly definition: StanceDefinition;
  readonly value: number;
  readonly scenario: ScenarioDefinition;
  readonly onApply: (value: number) => void;
  readonly onEnact: (value: number) => void;
  readonly onRepeal: () => void;
  readonly onDraftChange: (value: number) => void;
}

export function StanceEditor({
  state,
  definition,
  value,
  scenario,
  onApply,
  onEnact,
  onRepeal,
  onDraftChange,
}: StanceEditorProps) {
  const { play } = useInterfaceSound();
  const [draft, setDraft] = useState(value);
  const inactive = !state.nodes[definition.id].isActive;
  const assessment = inactive
    ? assessStanceEnactment(scenario, state, definition.id, draft)
    : assessStanceChange(scenario, state, definition.id, draft);
  const repealAssessment = assessStanceRepeal(scenario, state, definition.id);
  const costDefinition = inactive ? definition.enactmentCost : definition.cost;
  const resource = costDefinition
    ? scenario.nodes.find(({ id }) => id === costDefinition.resourceId)
    : undefined;
  const step =
    definition.control.kind === "continuous"
      ? Math.min(definition.control.step ?? 0.01, 0.01)
      : 1;
  const updateDraft = (nextValue: number) => {
    setDraft(nextValue);
    onDraftChange(nextValue);
  };
  const nudge = (direction: -1 | 1) => {
    const nextValue = Math.min(
      definition.domain.max,
      Math.max(definition.domain.min, draft + direction * step),
    );
    updateDraft(Number(nextValue.toFixed(10)));
  };
  const currentPercent = meterPercent(value, definition.domain);
  const currentMarkerOffsetRem = 0.625 * (1 - currentPercent / 50);
  const actionLabel = inactive ? "Enact stance" : "Apply change";
  const costLabel = inactive ? "Enactment cost" : "Change cost";

  return (
    <div className="flex flex-col gap-2" data-game-command-tray>
      <div className="stance-command-summary">
        <span>
          Current <strong>{formatValue(value, definition.domain)}</strong>
        </span>
        <span aria-hidden="true">→</span>
        <span>
          Proposed <strong>{formatValue(draft, definition.domain)}</strong>
        </span>
        <span data-state={assessment.legal ? "legal" : "blocked"}>
          {assessment.legal ? "Action available" : "Unavailable"}
        </span>
      </div>
      <Card className="bg-muted/20 py-0 ring-0">
        <CardContent className="px-3 py-1.5 sm:px-4">
          <Field className="gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <FieldDescription className="min-w-0 text-xs leading-tight">
                {costDefinition
                  ? `${costLabel}: ${assessment.cost.toFixed(1)} ${resource?.name ?? "Resource"}`
                  : `${costLabel}: none`}
                {!inactive && definition.cost?.maxChange !== undefined
                  ? ` · Maximum per action: ${formatValue(definition.cost.maxChange, definition.domain)}`
                  : ""}
              </FieldDescription>
              <output className="shrink-0 font-mono text-sm leading-none text-primary">
                {formatValue(draft, definition.domain)}
              </output>
            </div>
            {definition.control.kind === "continuous" ? (
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-0.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Decrease ${definition.name}`}
                  disabled={draft <= definition.domain.min}
                  onClick={() => nudge(-1)}
                >
                  <Minus />
                </Button>
                <div className="relative min-w-0">
                  <Slider
                    className="stance-slider"
                    id="stance-value"
                    aria-label={`Set ${definition.name}`}
                    min={definition.domain.min}
                    max={definition.domain.max}
                    step={step}
                    value={[draft]}
                    markerPosition={currentPercent}
                    markerLabel={formatValue(value, definition.domain)}
                    markerOffsetRem={currentMarkerOffsetRem}
                    onValueChange={([nextValue]) => {
                      if (nextValue === undefined) return;
                      updateDraft(nextValue);
                    }}
                  />
                  <div className="mt-0.5 flex justify-between font-mono text-[0.65rem] leading-none text-muted-foreground">
                    <span>
                      {formatValue(definition.domain.min, definition.domain)}
                    </span>
                    <span>
                      {formatValue(definition.domain.max, definition.domain)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Increase ${definition.name}`}
                  disabled={draft >= definition.domain.max}
                  onClick={() => nudge(1)}
                >
                  <Plus />
                </Button>
              </div>
            ) : (
              <Select
                value={String(draft)}
                onValueChange={(nextValue) => updateDraft(Number(nextValue))}
              >
                <SelectTrigger className="w-full" id="stance-value">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {definition.control.states.map((controlState) => (
                      <SelectItem
                        key={controlState.value}
                        value={String(controlState.value)}
                      >
                        {controlState.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </Field>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-2">
        {!inactive && !state.nodes[definition.id].isForced && (
          <Button
            type="button"
            variant="destructive"
            disabled={!repealAssessment.legal}
            title={repealAssessment.message}
            onClick={() => {
              play("confirm");
              onRepeal();
            }}
          >
            {definition.repealCost
              ? `Repeal policy · ${repealAssessment.cost.toFixed(1)} ${scenario.nodes.find(({ id }) => id === definition.repealCost?.resourceId)?.name ?? "Resource"}`
              : "Repeal policy"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={draft === value}
          onClick={() => updateDraft(value)}
        >
          Revert change
        </Button>
        <Button
          className="shrink-0"
          type="button"
          disabled={!assessment.legal}
          onClick={() => {
            play("confirm");
            if (inactive) onEnact(draft);
            else onApply(draft);
          }}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

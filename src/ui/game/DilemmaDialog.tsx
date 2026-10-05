import { getNodeDisplayInfo } from "../projections/projectFactionGroups";
import { FactionMetricName } from "@/ui/FactionMetric";
import { useState } from "react";
import type {
  ConsequenceDefinition,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatSignedValue } from "@/ui/formatValue";
import { DossierDialogFrame } from "@/ui/panels/DossierDialogFrame";

interface DilemmaDialogProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onResolve: (dilemmaId: string, choiceId: string) => void;
}

function consequenceLabel(
  consequence: ConsequenceDefinition,
  scenario: ScenarioDefinition,
) {
  const target = scenario.nodes.find(({ id }) => id === consequence.target);
  const name = target?.name ?? consequence.target;
  if (consequence.kind === "resource")
    return (
      <span>
        {name}:{" "}
        {formatSignedValue(
          consequence.amount,
          target ? target.domain : undefined,
        )}
      </span>
    );
  if (consequence.kind === "activation")
    return (
      <span>
        {name}: {consequence.active ? "activated" : "deactivated"}
      </span>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <FactionMetricName
        name={getNodeDisplayInfo(scenario, consequence.target).name}
        metric={getNodeDisplayInfo(scenario, consequence.target).metric}
        metricId={getNodeDisplayInfo(scenario, consequence.target).metricId}
      />
      <span>
        temporary{" "}
        {formatSignedValue(
          consequence.magnitude,
          target ? target.domain : undefined,
        )}{" "}
        pressure
      </span>
    </span>
  );
}

export function DilemmaDialog({
  scenario,
  state,
  open,
  onOpenChange,
  onResolve,
}: DilemmaDialogProps) {
  const [selectedDilemmaId, setSelectedDilemmaId] = useState<string>();
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>();
  const pending = state.pendingDilemmaIds.flatMap((id) => {
    const definition = scenario.dilemmas?.find((dilemma) => dilemma.id === id);
    return definition ? [definition] : [];
  });
  const selected =
    pending.find(({ id }) => id === selectedDilemmaId) ?? pending[0];
  const choice = selected?.choices.find(({ id }) => id === selectedChoiceId);

  return (
    <DossierDialogFrame
      open={open && pending.length > 0}
      onOpenChange={onOpenChange}
      surface="dilemma"
      header={
        <div className="min-w-0">
          <span className="font-mono text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase">
            Council decision
          </span>
          <DialogTitle className="mt-1">
            Decisions before the next year
          </DialogTitle>
          <DialogDescription>
            {pending.length}{" "}
            {pending.length === 1 ? "Dilemma awaits" : "Dilemmas await"}. Choose
            their order and resolve each before advancing.
          </DialogDescription>
        </div>
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Decide later
          </Button>
          <Button
            type="button"
            disabled={!selected || !choice}
            onClick={() => {
              if (!selected || !choice) return;
              onResolve(selected.id, choice.id);
              setSelectedDilemmaId(undefined);
              setSelectedChoiceId(undefined);
            }}
          >
            Confirm choice
          </Button>
        </>
      }
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-6 pb-6">
          {pending.length > 1 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Pending Dilemmas"
            >
              {pending.map((dilemma) => (
                <Button
                  key={dilemma.id}
                  type="button"
                  variant={selected.id === dilemma.id ? "default" : "outline"}
                  className="h-auto max-w-full whitespace-normal text-left"
                  aria-pressed={selected.id === dilemma.id}
                  onClick={() => {
                    setSelectedDilemmaId(dilemma.id);
                    setSelectedChoiceId(undefined);
                  }}
                >
                  {dilemma.title}
                </Button>
              ))}
            </div>
          )}
          {selected && (
            <section
              className="flex flex-col gap-4"
              aria-labelledby="dilemma-title"
            >
              <div className="flex flex-col gap-2">
                <h3
                  id="dilemma-title"
                  className="font-heading text-xl font-semibold"
                >
                  {selected.title}
                </h3>
                <p className="text-muted-foreground">{selected.description}</p>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-semibold">
                  Choose a response
                </legend>
                {selected.choices.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 focus-within:ring-2 focus-within:ring-ring has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input
                      type="radio"
                      name="dilemma-choice"
                      value={option.id}
                      checked={choice?.id === option.id}
                      onChange={() => setSelectedChoiceId(option.id)}
                      className="mt-1 accent-primary"
                    />
                    <span className="flex flex-col gap-1">
                      <strong>{option.label}</strong>
                      <span className="text-sm text-muted-foreground">
                        {option.description}
                      </span>
                      <span className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {option.consequences.length
                          ? option.consequences.map((consequence, index) => (
                              <span key={index}>
                                {consequenceLabel(consequence, scenario)}
                              </span>
                            ))
                          : "No immediate effects"}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>
          )}
        </div>
      </ScrollArea>
    </DossierDialogFrame>
  );
}

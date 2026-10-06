import { Image } from "lucide-react";
import { FactionMetricName } from "@/ui/FactionMetric";
import {
  projectDilemmaConsequences,
  projectPendingDilemmas,
} from "./projectDilemma";
import { Item, ItemGroup } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type {
  DilemmaDefinition,
  ConsequenceDefinition,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DossierDialogFrame } from "@/ui/panels/DossierDialogFrame";

const consequenceStyles: Record<
  ConsequenceDefinition["kind"],
  { readonly variant: "outline" | "muted"; readonly className: string }
> = {
  resource: { variant: "muted", className: "" },
  grudge: { variant: "outline", className: "border-dashed" },
  activation: { variant: "muted", className: "" },
};

interface DilemmaDialogProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onResolve: (dilemmaId: string, choiceId: string) => void;
}

function OptionImage({
  image,
  label,
}: {
  readonly image: DilemmaDefinition["choices"][number]["image"];
  readonly label: string;
}) {
  const [failed, setFailed] = useState(false);
  let src: string | undefined;
  if (image) {
    try {
      const base = new URL(import.meta.env.BASE_URL, window.location.origin);
      src = new URL(image.src, base).href;
    } catch {
      // Invalid URLs use the same fallback as missing or failed artwork.
    }
  }
  if (image && src && !failed)
    return (
      <img
        src={src}
        alt={image.alt}
        className="h-24 w-full shrink-0 rounded-lg object-cover"
        onError={() => setFailed(true)}
      />
    );
  return (
    <div
      className="flex h-24 w-full shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground"
      role="img"
      aria-label={`${label} illustration placeholder`}
    >
      <Image aria-hidden="true" className="size-10" />
    </div>
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
  const pending = projectPendingDilemmas(scenario, state);
  const selected =
    pending.find(({ id }) => id === selectedDilemmaId) ?? pending[0];
  const choice = selected?.choices.find(({ id }) => id === selectedChoiceId);

  return (
    <DossierDialogFrame
      open={open && pending.length > 0}
      onOpenChange={onOpenChange}
      surface="dilemma"
      header={
        <div className="flex min-w-0 flex-col gap-2 [overflow-wrap:anywhere]">
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription className="max-h-32 overflow-y-auto" tabIndex={0}>
            {selected?.description}
          </DialogDescription>
        </div>
      }
      footer={
        <>
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
      <div className="flex min-h-0 flex-1 flex-col" data-game-dilemma-body>
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4 px-6">
          {pending.length > 1 && (
            <div
              className="flex max-h-24 shrink-0 flex-wrap gap-2 overflow-y-auto"
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
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              aria-label="Dilemma responses"
            >
              <fieldset className="flex min-h-0 min-w-0 flex-1 flex-col">
                <legend className="sr-only">Choose a response</legend>
                <div
                  className="grid min-h-0 flex-1 grid-flow-col auto-cols-[minmax(16rem,1fr)] grid-rows-[minmax(0,1fr)] gap-4 overflow-x-auto p-1 pb-3"
                  aria-label="Response options"
                >
                  {selected.choices.map((option) => (
                    <label
                      key={option.id}
                      className="relative flex h-full w-full min-h-0 min-w-0 cursor-pointer flex-col gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                      <OptionImage
                        key={`${selected.id}:${option.id}:${option.image?.src ?? ""}`}
                        image={option.image}
                        label={option.label}
                      />
                      <div className="flex w-full min-h-0 min-w-0 flex-1 flex-col gap-2 [overflow-wrap:anywhere]">
                        <span className="flex shrink-0 items-start gap-3">
                          <input
                            type="radio"
                            name="dilemma-choice"
                            value={option.id}
                            checked={choice?.id === option.id}
                            onChange={() => setSelectedChoiceId(option.id)}
                            className="sr-only"
                            aria-label={option.label}
                          />
                          <strong className="line-clamp-2" title={option.label}>
                            {option.label}
                          </strong>
                        </span>
                        <div
                          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
                          role="region"
                          aria-label={`${option.label} response details`}
                          tabIndex={0}
                          data-game-dilemma-option-details
                        >
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {option.description}
                          </span>
                          <Separator className="my-1" />
                          <ItemGroup className="shrink-0 gap-2">
                            {option.consequences.length ? (
                              projectDilemmaConsequences(
                                scenario,
                                option.consequences,
                              ).map((row, index) => {
                                const style =
                                  consequenceStyles[row.consequence.kind];
                                return (
                                  <Item
                                    key={index}
                                    asChild
                                    role="listitem"
                                    size="xs"
                                    variant={style.variant}
                                    className={cn(
                                      "flex-nowrap gap-1.5 px-2 py-1.5",
                                      style.className,
                                    )}
                                    data-game-dilemma-consequence
                                    data-game-effect-kind={row.consequence.kind}
                                  >
                                    <span>
                                      <span className="flex min-w-0 flex-1 items-center">
                                        <FactionMetricName
                                          name={row.name}
                                          metric={row.metric}
                                          metricId={row.metricId}
                                        />
                                      </span>
                                      <span
                                        className="min-w-0 max-w-[35%] truncate text-xs text-muted-foreground"
                                        title={row.kindLabel}
                                      >
                                        {row.kindLabel}
                                      </span>
                                      <span className="shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums">
                                        {row.valueLabel}
                                      </span>
                                    </span>
                                  </Item>
                                );
                              })
                            ) : (
                              <span className="text-muted-foreground">
                                No immediate effects
                              </span>
                            )}
                          </ItemGroup>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          )}
        </div>
      </div>
    </DossierDialogFrame>
  );
}

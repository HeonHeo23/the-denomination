import { Landmark, ScrollText, ShieldAlert, WalletCards } from "lucide-react";
import establishedImage from "@/assets/institution-established.png";
import growingImage from "@/assets/institution-growing.png";
import humbleImage from "@/assets/institution-humble.png";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { getDossierTriggerProps } from "@/ui/dossierActivation";
import type {
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { formatValue, meterPercent } from "@/ui/formatValue";
import { institutionEra, type InstitutionEra } from "@/ui/institutionEra";
import { projectCrises, type CrisisView } from "./projectGameOvers";
import { CrisisSummaryCard } from "./CrisisSummaryCard";

const eraImages: Record<InstitutionEra, string> = {
  humble: humbleImage,
  growing: growingImage,
  established: establishedImage,
};

const eraTitles: Record<InstitutionEra, string> = {
  humble: "Founding season",
  growing: "A growing fellowship",
  established: "An established witness",
};

interface InstitutionOverviewProps {
  readonly scenario: ScenarioDefinition;
  readonly state: SimulationState;
  readonly resources: readonly NodeDefinition[];
  readonly compact?: boolean;
  readonly hideScenario?: boolean;
  readonly className?: string;
  readonly onCrisisSelect: (crisisId: string) => void;
  readonly onResourceHover: (nodeId?: string) => void;
  readonly onResourceSelect: (nodeId: string) => void;
}

interface ActiveCrisisItemsProps {
  readonly crises: readonly CrisisView[];
  readonly onCrisisSelect: (crisisId: string) => void;
}

function ActiveCrisisItems({ crises, onCrisisSelect }: ActiveCrisisItemsProps) {
  return (
    <div className="flex flex-col gap-2" aria-label="Active crises">
      {crises.map((crisis) => (
        <CrisisSummaryCard
          key={crisis.definition.id}
          variant="compact"
          crisis={crisis}
          onOpen={() => onCrisisSelect(crisis.definition.id)}
        />
      ))}
    </div>
  );
}

export function InstitutionOverview({
  scenario,
  state,
  resources,
  compact = false,
  hideScenario = false,
  className,
  onCrisisSelect,
  onResourceHover,
  onResourceSelect,
}: InstitutionOverviewProps) {
  const era = institutionEra(state.turn);
  const activeCrises = projectCrises(scenario, state);

  return (
    <aside
      className={cn(
        "grid content-start gap-4",
        compact ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-1",
        className,
      )}
      data-game-overview
      aria-label="Institution overview"
    >
      <figure
        className={cn(
          "relative min-h-48 overflow-hidden",
          !compact && "md:col-span-2 xl:col-span-1",
        )}
        data-game-portrait
      >
        <img
          className="inset-0 size-full object-cover"
          src={eraImages[era]}
          alt=""
        />
        <div className="absolute inset-0" data-game-portrait-shade />
        <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-primary-foreground">
          <span className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.16em] uppercase opacity-75">
            <Landmark aria-hidden="true" /> Institutional grounds
          </span>
          <strong className="font-heading text-2xl font-semibold">
            {eraTitles[era]}
          </strong>
          <p className="text-xs leading-relaxed opacity-75">
            The fellowship’s visible life changes as its witness takes root.
          </p>
        </figcaption>
      </figure>

      {!hideScenario && (
        <Card size="sm" data-game-document="commission">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <ScrollText aria-hidden="true" /> Scenario
            </CardDescription>
            <CardTitle>{scenario.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {scenario.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Card size="sm" data-game-document="ledger">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletCards aria-hidden="true" /> Stewardship ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemGroup className="gap-2">
            {resources.map((resource) => {
              const value = state.nodes[resource.id].value;
              const formatted = formatValue(value, resource.domain);
              return (
                <Item
                  key={resource.id}
                  variant="muted"
                  data-game-stewardship-resource
                  onMouseEnter={() => onResourceHover(resource.id)}
                  onMouseLeave={() => onResourceHover(undefined)}
                  {...getDossierTriggerProps(
                    `Open ${resource.name} node dossier`,
                    () => onResourceSelect(resource.id),
                  )}
                >
                  <ItemContent className="gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <ItemTitle>{resource.name}</ItemTitle>
                      <strong className="font-mono text-base text-primary">
                        {formatted}
                      </strong>
                    </div>
                    <Progress
                      value={meterPercent(value, resource.domain)}
                      aria-label={`${resource.name}: ${formatted}`}
                    />
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </CardContent>
      </Card>

      <Card size="sm" data-game-document="crises">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <ShieldAlert aria-hidden="true" /> Terminal trajectories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCrises.length === 0 ? (
            <Empty className="min-h-24">
              <EmptyHeader>
                <EmptyTitle>No active crises</EmptyTitle>
                <EmptyDescription>
                  No terminal trajectory currently requires intervention.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ActiveCrisisItems
              crises={activeCrises}
              onCrisisSelect={onCrisisSelect}
            />
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

import { Landmark, ShieldAlert } from "lucide-react";
import humbleImage from "@/assets/institution-humble.png";
import growingImage from "@/assets/institution-growing.png";
import establishedImage from "@/assets/institution-established.png";
import type {
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "@/simulation";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { formatValue, meterPercent } from "@/ui/formatValue";
import { institutionEra, type InstitutionEra } from "@/ui/institutionEra";

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
  readonly situations: readonly NodeDefinition[];
  readonly compact?: boolean;
  readonly hideScenario?: boolean;
  readonly className?: string;
}

export function InstitutionOverview({
  scenario,
  state,
  resources,
  situations,
  compact = false,
  hideScenario = false,
  className,
}: InstitutionOverviewProps) {
  const era = institutionEra(state.turn);
  const activeSituations = situations.filter(
    (situation) => state.nodes[situation.id].isActive,
  );

  return (
    <aside
      className={cn(
        "grid content-start gap-4",
        compact ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-1",
        className,
      )}
      aria-label="Institution overview"
    >
      <figure
        className={cn(
          "institution-portrait relative min-h-48 overflow-hidden rounded-xl border shadow-sm",
          !compact && "md:col-span-2 xl:col-span-1",
        )}
      >
        <img
          className="inset-0 size-full object-cover"
          src={eraImages[era]}
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-primary-foreground">
          <span className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.16em] uppercase opacity-75">
            <Landmark aria-hidden="true" /> Institutional grounds
          </span>
          <strong className="font-heading text-2xl font-semibold">
            {eraTitles[era]}
          </strong>
          <p className="text-xs leading-relaxed opacity-75">
            A presentation of the fellowship’s changing institutional context.
          </p>
        </figcaption>
      </figure>

      {!hideScenario && (
        <Card size="sm">
          <CardHeader>
            <CardDescription>Current focus</CardDescription>
            <CardTitle>{scenario.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {scenario.description}
            </p>
          </CardContent>
        </Card>
      )}

      {resources.map((resource) => {
        const value = state.nodes[resource.id].value;
        return (
          <Card size="sm" key={resource.id}>
            <CardHeader>
              <CardDescription>Stewardship resource</CardDescription>
              <CardTitle>{resource.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <strong className="font-mono text-2xl text-primary">
                {formatValue(value, resource.domain)}
              </strong>
              <Progress
                value={meterPercent(value, resource.domain)}
                aria-label={`${resource.name}: ${formatValue(value, resource.domain)}`}
              />
            </CardContent>
          </Card>
        );
      })}

      <Card size="sm">
        <CardHeader>
          <CardDescription>Watching closely</CardDescription>
          <CardTitle>Active situations</CardTitle>
        </CardHeader>
        <CardContent>
          {activeSituations.length === 0 ? (
            <Empty className="min-h-28 border">
              <EmptyHeader>
                <EmptyTitle>All is quiet</EmptyTitle>
                <EmptyDescription>
                  No active situations require immediate attention.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeSituations.map((situation) => (
                <Badge variant="destructive" key={situation.id}>
                  <ShieldAlert data-icon="inline-start" />
                  {situation.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}

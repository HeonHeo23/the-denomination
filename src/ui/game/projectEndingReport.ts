import { getFactionGroupIndex } from "../projections/projectFactionGroups";
import type {
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatValue } from "../formatValue";

interface EndingReportReading {
  readonly definition: NodeDefinition;
  readonly value?: string;
  readonly factionMetrics?: readonly {
    readonly metric: string;
    readonly metricId?: string;
    readonly value: string;
  }[];
  readonly isActive: boolean;
}

function projectEndingReadings(
  scenario: ScenarioDefinition,
  state: SimulationState,
): EndingReportReading[] {
  const index = getFactionGroupIndex(scenario);
  const seen = new Set<string>();

  return scenario.completion.reportNodeIds.flatMap<EndingReportReading>(
    (id) => {
      const definition = scenario.nodes.find((node) => node.id === id)!;
      const context = index.byNode.get(id);
      if (!context)
        return [
          {
            definition,
            value: formatValue(state.nodes[id].value, definition.domain),
            isActive: state.nodes[id].isActive,
          },
        ];

      if (seen.has(context.group.id)) return [];
      seen.add(context.group.id);

      const groupNodeContexts = index.byGroup
        .get(context.group.id)!
        .filter((member) =>
          scenario.completion.reportNodeIds.includes(member.node.id),
        );

      return [
        {
          definition: {
            ...definition,
            name: context.group.name,
            description: context.group.description,
          },
          factionMetrics: groupNodeContexts.map((member) => ({
            metric: member.metric.label,
            metricId: member.metric.id,
            value: formatValue(
              state.nodes[member.node.id].value,
              member.node.domain,
            ),
          })),
          isActive: true,
        },
      ];
    },
  );
}

/** Project recorded completion and final readings without evaluating mechanics. */
export function projectEndingReport(
  scenario: ScenarioDefinition,
  state: SimulationState,
) {
  const outcome = state.outcome;
  if (outcome?.kind !== "ending") return undefined;
  const ending = outcome.usedFallback
    ? scenario.completion.fallbackEnding
    : scenario.completion.endings.find(({ id }) => id === outcome.endingId);
  if (!ending) return undefined;
  return {
    ending,
    turn: outcome.turn,
    year: state.year,
    usedFallback: outcome.usedFallback,
    triggers: scenario.completion.prerequisiteGroups.filter(({ id }) =>
      outcome.matchedTriggerIds.includes(id),
    ),
    actors: scenario.historicalActors,
    readings: projectEndingReadings(scenario, state),
  };
}

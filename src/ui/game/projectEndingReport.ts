import type { ScenarioDefinition, SimulationState } from "../../simulation";
import { formatValue } from "../formatValue";

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
    readings: scenario.completion.reportNodeIds.map((id) => {
      const definition = scenario.nodes.find((node) => node.id === id)!;
      const runtime = state.nodes[id];
      return {
        definition,
        value: formatValue(runtime.value, definition.domain),
        isActive: runtime.isActive,
      };
    }),
  };
}

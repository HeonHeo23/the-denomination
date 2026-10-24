import { getNodeDisplayName } from "../projections/projectFactionGroups";
import { resolveHistoryRecords } from "./resolveHistoryRecords";
import type { ChangeView } from "../changeView";
import type {
  EventDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";

export interface EventView {
  readonly id: string;
  readonly definition: EventDefinition;
  readonly turn: number;
  readonly year?: number;
  readonly triggerCount: number;
  readonly changes: readonly ChangeView[];
  readonly title: string;
  readonly description: string;
}

/** Derive one player-facing Event record from canonical event history. */
export const projectEvent = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  eventId: string,
): EventView | undefined => {
  const event = state.history.find(
    (entry) => entry.kind === "event" && entry.id === eventId,
  );
  if (!event || event.kind !== "event") return undefined;
  const definition = scenario.events?.find(
    ({ id }) => id === event.definitionId,
  );
  if (!definition) return undefined;

  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const changes = resolveHistoryRecords(scenario, state)
    .filter(
      (record) =>
        record.sourceHistoryId === eventId && record.entry.turn === event.turn,
    )
    .flatMap((record): ChangeView[] => {
      const applied = record.applied;
      if (!applied) return [];
      const node = state.nodes[applied.target]
        ? nodes.get(applied.target)
        : undefined;
      const display = node
        ? getNodeDisplayName(scenario, applied.target)
        : undefined;
      return [
        {
          id: record.entry.id,
          category: applied.kind,
          nodeId: node?.id,
          name: node
            ? (record.targetName ?? display?.name ?? node.name)
            : applied.target,
          domain: node?.domain,
          metric: display?.metric,
          amount:
            applied.kind === "resource"
              ? applied.amount
              : applied.kind === "grudge"
                ? applied.magnitude
                : undefined,
          isActive: applied.kind === "activation" ? applied.active : undefined,
        },
      ];
    });

  return {
    id: eventId,
    definition,
    turn: event.turn,
    year:
      scenario.start.year === undefined
        ? undefined
        : scenario.start.year + event.turn - scenario.start.turn,
    triggerCount: event.triggerCount,
    changes,
    title: event.title,
    description: event.detail,
  };
};

/** The fired Events for one turn, in the engine's Event ID order. */
export const getTurnEventIds = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  turn: number,
): readonly string[] => {
  const definitions = new Set(scenario.events?.map(({ id }) => id));
  return state.history
    .filter((entry) => entry.kind === "event")
    .filter(
      (entry) => entry.turn === turn && definitions.has(entry.definitionId),
    )
    .sort((left, right) =>
      left.definitionId < right.definitionId
        ? -1
        : left.definitionId > right.definitionId
          ? 1
          : 0,
    )
    .map(({ id }) => id);
};

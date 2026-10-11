import {
  getNodeDisplayInfo,
  projectNodeForDisplay,
} from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  EventDefinition,
  NodeDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";

export interface EventConsequenceView {
  readonly id: string;
  readonly kind: "resource" | "grudge" | "activation";
  readonly title: string;
  readonly detail: string;
  readonly target?: NodeDefinition;
  readonly targetMetric?: FactionMetricDefinition;
  readonly endOfTurnValue?: number;
  readonly appliedAmount?: number;
}

export interface EventView {
  readonly id: string;
  readonly definition: EventDefinition;
  readonly turn: number;
  readonly year?: number;
  readonly triggerCount: number;
  readonly consequences: readonly EventConsequenceView[];
}

function parseEventId(
  scenario: ScenarioDefinition,
  eventId: string,
): { definition: EventDefinition; number: number } | undefined {
  for (const definition of scenario.events ?? []) {
    const prefix = `${definition.id}:event:`;
    if (!eventId.startsWith(prefix)) continue;
    const number = Number(eventId.slice(prefix.length));
    if (
      Number.isSafeInteger(number) &&
      number > 0 &&
      eventId === `${prefix}${number}`
    )
      return { definition, number };
  }
  return undefined;
}

/** Derive one player-facing Event record from canonical event history. */
export function projectEvent(
  scenario: ScenarioDefinition,
  state: SimulationState,
  eventId: string,
): EventView | undefined {
  const event = state.history.find(
    (entry) => entry.kind === "event" && entry.id === eventId,
  );
  const match = parseEventId(scenario, eventId);
  if (!event || !match) return undefined;

  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const readings = state.nodeValueHistory[event.turn];
  const consequences = match.definition.consequences.flatMap(
    (consequence, index) => {
      const entry = state.history.find(
        (item) =>
          item.kind === "consequence" &&
          item.id === `${eventId}:consequence:${index}` &&
          item.turn === event.turn,
      );
      if (!entry) return [];
      // Use the saved Resource change for historical detail displays.
      const resourceChange =
        consequence.kind === "resource"
          ? /^Resource balance changed by (-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\.$/.exec(
              entry.detail,
            )
          : null;
      return [
        {
          id: entry.id,
          kind: consequence.kind,
          title: entry.title,
          detail: entry.detail,
          target: projectNodeForDisplay(
            scenario,
            nodes.get(consequence.target)!,
          ),
          targetMetric: getNodeDisplayInfo(scenario, consequence.target).metric,
          endOfTurnValue:
            readings && consequence.kind !== "activation"
              ? readings[consequence.target].value
              : undefined,
          appliedAmount:
            consequence.kind === "grudge"
              ? consequence.magnitude
              : resourceChange
                ? Number(resourceChange[1])
                : undefined,
        },
      ];
    },
  );

  return {
    id: eventId,
    definition: match.definition,
    turn: event.turn,
    year:
      scenario.start.year === undefined
        ? undefined
        : scenario.start.year + event.turn - scenario.start.turn,
    triggerCount: match.number,
    consequences,
  };
}

/** The fired Events for one turn, in the engine's Event ID order. */
export function getTurnEventIds(
  scenario: ScenarioDefinition,
  state: SimulationState,
  turn: number,
): readonly string[] {
  const ids = state.history
    .filter((entry) => entry.kind === "event" && entry.turn === turn)
    .filter((entry) => parseEventId(scenario, entry.id) !== undefined)
    .map((entry) => entry.id);
  return ids.sort((left, right) => {
    const leftId = parseEventId(scenario, left)!.definition.id;
    const rightId = parseEventId(scenario, right)!.definition.id;
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
}

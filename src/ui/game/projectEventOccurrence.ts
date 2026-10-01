import type {
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
  readonly endOfTurnValue?: number;
  readonly appliedAmount?: number;
}

export interface EventOccurrenceView {
  readonly id: string;
  readonly definition: EventDefinition;
  readonly turn: number;
  readonly year?: number;
  readonly occurrenceNumber: number;
  readonly consequences: readonly EventConsequenceView[];
}

function eventForOccurrence(
  scenario: ScenarioDefinition,
  occurrenceId: string,
): { definition: EventDefinition; number: number } | undefined {
  for (const definition of scenario.events ?? []) {
    const prefix = `${definition.id}:event:`;
    if (!occurrenceId.startsWith(prefix)) continue;
    const number = Number(occurrenceId.slice(prefix.length));
    if (
      Number.isSafeInteger(number) &&
      number > 0 &&
      occurrenceId === `${prefix}${number}`
    )
      return { definition, number };
  }
  return undefined;
}

/** Derive one player-facing Event record from canonical occurrence history. */
export function projectEventOccurrence(
  scenario: ScenarioDefinition,
  state: SimulationState,
  occurrenceId: string,
): EventOccurrenceView | undefined {
  const occurrence = state.history.find(
    (entry) => entry.kind === "event" && entry.id === occurrenceId,
  );
  const match = eventForOccurrence(scenario, occurrenceId);
  if (!occurrence || !match) return undefined;

  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const reading = state.nodeValueHistory.find(
    (point) => point.turn === occurrence.turn,
  );
  const consequences = match.definition.consequences.flatMap(
    (consequence, index) => {
      const entry = state.history.find(
        (item) =>
          item.kind === "consequence" &&
          item.id === `${occurrenceId}:consequence:${index}` &&
          item.turn === occurrence.turn,
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
          target: nodes.get(consequence.target),
          endOfTurnValue: reading?.values[consequence.target]?.value,
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
    id: occurrenceId,
    definition: match.definition,
    turn: occurrence.turn,
    year:
      scenario.start.year === undefined
        ? undefined
        : scenario.start.year + occurrence.turn - scenario.start.turn,
    occurrenceNumber: match.number,
    consequences,
  };
}

/** The fired Events for one turn, in the engine's Event ID order. */
export function eventOccurrenceIdsForTurn(
  scenario: ScenarioDefinition,
  state: SimulationState,
  turn: number,
): readonly string[] {
  const ids = state.history
    .filter((entry) => entry.kind === "event" && entry.turn === turn)
    .filter((entry) => eventForOccurrence(scenario, entry.id) !== undefined)
    .map((entry) => entry.id);
  return ids.sort((left, right) => {
    const leftId = eventForOccurrence(scenario, left)!.definition.id;
    const rightId = eventForOccurrence(scenario, right)!.definition.id;
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
}

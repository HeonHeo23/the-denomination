import type {
  ConsequenceDefinition,
  DilemmaDefinition,
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import {
  findFactionContext,
  getFactionGroupIndex,
  getNodeDisplayInfo,
  type NodeDisplayInfo,
} from "../projections/projectFactionGroups";
import { formatSignedValue } from "../formatValue";

/** Resolve queued definitions in pending order, omitting unavailable content. */
export function projectPendingDilemmas(
  scenario: ScenarioDefinition,
  state: Pick<SimulationState, "pendingDilemmaIds">,
): readonly DilemmaDefinition[] {
  const definitions = new Map(
    (scenario.dilemmas ?? []).map((dilemma) => [dilemma.id, dilemma]),
  );
  return state.pendingDilemmaIds.flatMap((id) => {
    const definition = definitions.get(id);
    return definition ? [definition] : [];
  });
}

export interface DilemmaConsequenceView extends NodeDisplayInfo {
  readonly consequence: ConsequenceDefinition;
  readonly domain?: NumericDomain;
  readonly kindLabel: string;
  readonly valueLabel: string;
}

function consequenceLabels(
  consequence: ConsequenceDefinition,
  domain?: NumericDomain,
): Pick<DilemmaConsequenceView, "kindLabel" | "valueLabel"> {
  switch (consequence.kind) {
    case "resource":
      return {
        kindLabel: "Resource change",
        valueLabel: formatSignedValue(consequence.amount, domain),
      };
    case "grudge":
      return {
        kindLabel: "Temporary pressure",
        valueLabel: formatSignedValue(consequence.magnitude, domain),
      };
    case "activation":
      return {
        kindLabel: "Activation change",
        valueLabel: consequence.active ? "Activated" : "Deactivated",
      };
    default: {
      const unreachable: never = consequence;
      throw new Error(`Unsupported consequence: ${unreachable}`);
    }
  }
}

/** Order each group's consequences by its Scenario metric catalog, keeping other slots intact. */
export function projectDilemmaConsequences(
  scenario: ScenarioDefinition,
  consequences: readonly ConsequenceDefinition[],
): readonly DilemmaConsequenceView[] {
  const definitions = getFactionGroupIndex(scenario).definitions;
  const metricPositions = new Map(
    (scenario.factionMetrics ?? []).map((metric, index) => [metric.id, index]),
  );
  const rows = consequences.map((consequence) => {
    const target = definitions.get(consequence.target);
    const context = findFactionContext(scenario, consequence.target);
    return {
      view: {
        ...getNodeDisplayInfo(scenario, consequence.target),
        consequence,
        domain: target?.domain,
        ...consequenceLabels(consequence, target?.domain),
      },
      groupId: context?.group.id,
      metricOrder: context
        ? (metricPositions.get(context.metric.id) ?? -1)
        : -1,
    };
  });
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.groupId === undefined) continue;
    const group = groups.get(row.groupId) ?? [];
    group.push(row);
    groups.set(row.groupId, group);
  }
  for (const group of groups.values())
    group.sort((a, b) => a.metricOrder - b.metricOrder);
  const offsets = new Map<string, number>();
  return rows.map((row) => {
    if (row.groupId === undefined) return row.view;
    const offset = offsets.get(row.groupId) ?? 0;
    offsets.set(row.groupId, offset + 1);
    return groups.get(row.groupId)![offset].view;
  });
}

export interface DilemmaDecisionView {
  readonly id: string;
  readonly turn: number;
  readonly year?: number;
  readonly title: string;
  readonly choiceLabel: string;
  readonly choiceDescription: string;
}

/** Read resolved choices from the canonical, saved occurrence history. */
export function projectDilemmaDecisions(
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly DilemmaDecisionView[] {
  return state.history
    .filter((entry) => entry.kind === "dilemma")
    .map((entry) => {
      const definition = (scenario.dilemmas ?? []).find((dilemma) =>
        entry.id.startsWith(`${dilemma.id}:choice:`),
      );
      const choice = definition?.choices.find(
        ({ label, description }) => entry.detail === `${label}: ${description}`,
      );
      return {
        id: entry.id,
        turn: entry.turn,
        year:
          scenario.start.year === undefined
            ? undefined
            : scenario.start.year + entry.turn - scenario.start.turn,
        title: entry.title,
        choiceLabel: choice?.label ?? entry.detail,
        choiceDescription: choice?.description ?? "",
      };
    })
    .reverse();
}

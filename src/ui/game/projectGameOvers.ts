import type {
  GameOverDefinition,
  PrerequisiteDefinition,
  PrerequisiteGroupDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatSignedValue, formatValue } from "../formatValue";

export interface PrerequisiteStatus {
  readonly prerequisite: PrerequisiteDefinition;
  readonly nodeName: string;
  readonly description: string;
  readonly met: boolean;
}

export interface GameOverWarningView {
  readonly definition: GameOverDefinition;
  readonly consecutiveTurns: number;
  readonly turnsRemaining: number;
  readonly progressPercent: number;
  readonly matchedGroups: readonly {
    readonly group: PrerequisiteGroupDefinition;
    readonly prerequisites: readonly PrerequisiteStatus[];
  }[];
}

function prerequisiteStatus(
  prerequisite: PrerequisiteDefinition,
  scenario: ScenarioDefinition,
  state: SimulationState,
): PrerequisiteStatus {
  const definition = scenario.nodes.find(
    ({ id }) => id === prerequisite.nodeId,
  )!;
  const runtime = state.nodes[prerequisite.nodeId];
  if (prerequisite.kind === "node-activation") {
    return {
      prerequisite,
      nodeName: definition.name,
      met: runtime.isActive === prerequisite.active,
      description: `${definition.name} is ${runtime.isActive ? "active" : "inactive"}; required ${prerequisite.active ? "active" : "inactive"}.`,
    };
  }
  const met =
    prerequisite.comparison === "at-most"
      ? runtime.value <= prerequisite.value
      : runtime.value >= prerequisite.value;
  return {
    prerequisite,
    nodeName: definition.name,
    met,
    description: `${definition.name} is ${formatValue(runtime.value, definition.domain)}; threshold ${prerequisite.comparison === "at-most" ? "≤" : "≥"} ${formatValue(prerequisite.value, definition.domain)}.`,
  };
}

export function projectGameOverWarnings(
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly GameOverWarningView[] {
  return (scenario.gameOvers ?? [])
    .flatMap((definition) => {
      const progress = state.gameOverProgress[definition.id];
      if (!progress || progress.consecutiveTurns === 0) return [];
      const matchedIds = new Set(progress.matchedPrerequisiteGroupIds);
      return [
        {
          definition,
          consecutiveTurns: progress.consecutiveTurns,
          turnsRemaining: Math.max(
            0,
            definition.terminalAfterTurns - progress.consecutiveTurns,
          ),
          progressPercent:
            (progress.consecutiveTurns / definition.terminalAfterTurns) * 100,
          matchedGroups: definition.prerequisiteGroups
            .filter(({ id }) => matchedIds.has(id))
            .map((group) => ({
              group,
              prerequisites: group.allOf.map((prerequisite) =>
                prerequisiteStatus(prerequisite, scenario, state),
              ),
            })),
        },
      ];
    })
    .sort(
      (left, right) =>
        left.turnsRemaining - right.turnsRemaining ||
        left.definition.title.localeCompare(right.definition.title),
    );
}

export interface Contribution {
  readonly id: string;
  readonly sourceTitle: string;
  readonly label: string;
  readonly value: string;
}

export interface GameOverReportCauseView {
  readonly definition: GameOverDefinition;
  readonly matchedGroups: GameOverWarningView["matchedGroups"];
  readonly contributions: readonly Contribution[];
}

export function projectGameOverReport(
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly GameOverReportCauseView[] {
  if (!state.outcome) return [];
  return state.outcome.causes.flatMap((cause) => {
    const definition = scenario.gameOvers?.find(
      ({ id }) => id === cause.gameOverId,
    );
    if (!definition) return [];
    const matchedIds = new Set(cause.matchedPrerequisiteGroupIds);
    const matchedGroups = definition.prerequisiteGroups
      .filter(({ id }) => matchedIds.has(id))
      .map((group) => ({
        group,
        prerequisites: group.allOf.map((prerequisite) =>
          prerequisiteStatus(prerequisite, scenario, state),
        ),
      }));
    const affectedNodeIds = new Set(
      matchedGroups.flatMap(({ group }) =>
        group.allOf.map(({ nodeId }) => nodeId),
      ),
    );
    const contributions: Contribution[] = [];
    for (const effect of scenario.effects) {
      if (!affectedNodeIds.has(effect.target)) continue;
      const value = state.effects[effect.id]?.lastContribution ?? 0;
      if (Math.abs(value) <= 1e-9) continue;
      const target = scenario.nodes.find(({ id }) => id === effect.target)!;
      const sourceTitle =
        effect.source === "_default_"
          ? "Default pressure"
          : scenario.nodes.find(({ id }) => id === effect.source)!.name;
      contributions.push({
        id: effect.id,
        sourceTitle,
        label: effect.label ?? effect.id,
        value: formatSignedValue(value, target.domain),
      });
    }
    for (const grudge of state.grudges) {
      if (!affectedNodeIds.has(grudge.target)) continue;
      const target = scenario.nodes.find(({ id }) => id === grudge.target)!;
      contributions.push({
        id: grudge.id,
        sourceTitle: "Grudge",
        label: grudge.label,
        value: formatSignedValue(grudge.magnitude, target.domain),
      });
    }
    return [{ definition, matchedGroups, contributions }];
  });
}

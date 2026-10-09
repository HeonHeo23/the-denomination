import { getNodeDisplayInfo } from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  GameOverDefinition,
  GameOverStageDefinition,
  PrerequisiteGroupDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { formatSignedValue } from "../formatValue";

import {
  projectPrerequisite,
  type PrerequisiteView,
} from "./projectPrerequisite";

export interface GameOverWarningView {
  readonly definition: GameOverDefinition;
  readonly consecutiveTurns: number;
  readonly turnsRemaining: number;
  readonly progressPercent: number;
  readonly stage?: GameOverStageDefinition;
  readonly allGroups: readonly GameOverGroupView[];
  readonly matchedGroups: readonly {
    readonly group: PrerequisiteGroupDefinition;
    readonly prerequisites: readonly PrerequisiteView[];
  }[];
  readonly matchedPrerequisiteNodeIds: readonly string[];
}

export interface GameOverGroupView {
  readonly group: PrerequisiteGroupDefinition;
  readonly matched: boolean;
  readonly prerequisites: readonly PrerequisiteView[];
}

export interface CrisisTurnTransition {
  readonly kind: "stage" | "recovered";
  readonly gameOverId: string;
  readonly stageAtTurn?: number;
  readonly consecutiveTurns: number;
  readonly turnsRemaining: number;
}

export type CrisisStatus = "warning" | "recovered" | "terminal";

export interface CrisisView extends GameOverWarningView {
  readonly status: CrisisStatus;
}

export function getGroups(
  definition: GameOverDefinition,
  matchedGroupIds: readonly string[],
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly GameOverGroupView[] {
  const matchedIds = new Set(matchedGroupIds);
  return definition.prerequisiteGroups.map((group) => ({
    group,
    matched: matchedIds.has(group.id),
    prerequisites: group.allOf.map((prerequisite) =>
      projectPrerequisite(prerequisite, scenario, state),
    ),
  }));
}

export function getCrisisProgress(
  definition: GameOverDefinition,
  consecutiveTurns: number,
) {
  const stage = definition.stages.reduce<GameOverStageDefinition | undefined>(
    (current, candidate) =>
      candidate.atTurn <= consecutiveTurns &&
      (current === undefined || candidate.atTurn > current.atTurn)
        ? candidate
        : current,
    undefined,
  );
  return {
    consecutiveTurns,
    turnsRemaining: Math.max(
      0,
      definition.terminalAfterTurns - consecutiveTurns,
    ),
    progressPercent: Math.min(
      100,
      (consecutiveTurns / definition.terminalAfterTurns) * 100,
    ),
    stage,
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
      const allGroups = getGroups(
        definition,
        progress.matchedPrerequisiteGroupIds,
        scenario,
        state,
      );
      const matchedGroups = allGroups.filter(({ matched }) => matched);
      return [
        {
          definition,
          ...getCrisisProgress(definition, progress.consecutiveTurns),
          allGroups,
          matchedGroups,
          matchedPrerequisiteNodeIds: [
            ...new Set(
              matchedGroups.flatMap(({ prerequisites }) =>
                prerequisites.flatMap(({ nodeId }) => (nodeId ? [nodeId] : [])),
              ),
            ),
          ],
        },
      ];
    })
    .sort(
      (left, right) =>
        left.turnsRemaining - right.turnsRemaining ||
        left.definition.title.localeCompare(right.definition.title),
    );
}

/** Projects active and just-recovered trajectories for crisis UI surfaces. */
export function projectCrises(
  scenario: ScenarioDefinition,
  state: SimulationState,
  transitions: readonly CrisisTurnTransition[] = [],
): readonly CrisisView[] {
  const warnings = projectGameOverWarnings(scenario, state);
  const terminalIds = new Set(
    state.outcome?.kind === "game-over"
      ? state.outcome.causes.map(({ gameOverId }) => gameOverId)
      : [],
  );
  const items: CrisisView[] = warnings.map((warning) => ({
    ...warning,
    status: terminalIds.has(warning.definition.id)
      ? ("terminal" as const)
      : ("warning" as const),
  }));
  const known = new Set(items.map(({ definition }) => definition.id));
  for (const transition of transitions) {
    if (transition.kind !== "recovered" || known.has(transition.gameOverId))
      continue;
    const definition = scenario.gameOvers?.find(
      ({ id }) => id === transition.gameOverId,
    );
    if (!definition) continue;
    const allGroups = getGroups(definition, [], scenario, state);
    items.push({
      definition,
      ...getCrisisProgress(definition, 0),
      allGroups,
      matchedGroups: [],
      matchedPrerequisiteNodeIds: [],
      status: "recovered",
    });
  }
  return items.sort(
    (left, right) =>
      left.turnsRemaining - right.turnsRemaining ||
      left.definition.title.localeCompare(right.definition.title),
  );
}

export interface Contribution {
  readonly id: string;
  readonly kind: "effect" | "grudge";
  readonly amount: number;
  readonly sourceId?: string;
  readonly sourceTitle: string;
  readonly sourceMetric?: FactionMetricDefinition;
  readonly label: string;
  readonly value: string;
  readonly targetId: string;
  readonly targetMetric?: FactionMetricDefinition;
  readonly targetTitle: string;
}

export interface ContributionGroup {
  readonly targetId: string;
  readonly targetMetric?: FactionMetricDefinition;
  readonly targetTitle: string;
  readonly contributions: readonly Contribution[];
}

export function groupContributions(
  contributions: readonly Contribution[],
): readonly ContributionGroup[] {
  const groups = new Map<string, Contribution[]>();
  for (const contribution of contributions) {
    const key = `${contribution.targetId}:${contribution.targetMetric?.id ?? "value"}`;
    const group = groups.get(key) ?? [];
    group.push(contribution);
    groups.set(key, group);
  }
  return [...groups.values()].map((entries) => ({
    targetId: entries[0].targetId,
    targetMetric: entries[0].targetMetric,
    targetTitle: entries[0].targetTitle,
    contributions: entries,
  }));
}

export function getBiggestContribution(
  contributions: readonly Contribution[],
): Contribution | undefined {
  return contributions.reduce<Contribution | undefined>(
    (largest, contribution) =>
      largest === undefined ||
      Math.abs(contribution.amount) > Math.abs(largest.amount)
        ? contribution
        : largest,
    undefined,
  );
}

export function projectGameOverContributions(
  scenario: ScenarioDefinition,
  state: SimulationState,
  affectedNodeIds: readonly string[],
): readonly Contribution[] {
  const affected = new Set(affectedNodeIds);
  const contributions: Contribution[] = [];
  for (const effect of scenario.effects) {
    if (!affected.has(effect.target)) continue;
    const value = state.effects[effect.id]?.lastContribution ?? 0;
    if (Math.abs(value) <= 1e-9) continue;
    const target = scenario.nodes.find(({ id }) => id === effect.target);
    if (!target) continue;
    const sourceTitle =
      effect.source === "_default_"
        ? "Default pressure"
        : getNodeDisplayInfo(scenario, effect.source).name;
    contributions.push({
      id: effect.id,
      kind: "effect",
      amount: value,
      ...(effect.source === "_default_" ? {} : { sourceId: effect.source }),
      sourceTitle,
      sourceMetric:
        effect.source === "_default_"
          ? undefined
          : getNodeDisplayInfo(scenario, effect.source).metric,
      label: effect.label ?? effect.id,
      value: formatSignedValue(value, target.domain),
      targetId: target.id,
      targetMetric: getNodeDisplayInfo(scenario, effect.target).metric,
      targetTitle: getNodeDisplayInfo(scenario, target.id).name,
    });
  }
  for (const grudge of state.grudges) {
    if (grudge.createdTurn >= state.turn) continue;
    if (!affected.has(grudge.target)) continue;
    const target = scenario.nodes.find(({ id }) => id === grudge.target);
    if (!target) continue;
    contributions.push({
      id: grudge.id,
      kind: "grudge",
      amount: grudge.magnitude,
      sourceTitle: "Grudge",
      label: grudge.label,
      value: formatSignedValue(grudge.magnitude, target.domain),
      targetId: target.id,
      targetMetric: getNodeDisplayInfo(scenario, grudge.target).metric,
      targetTitle: getNodeDisplayInfo(scenario, target.id).name,
    });
  }
  return contributions;
}

export interface GameOverReportCauseView {
  readonly definition: GameOverDefinition;
  readonly matchedGroups: GameOverWarningView["matchedGroups"];
  readonly contributions: readonly Contribution[];
  readonly biggestContribution?: Contribution;
}

export function projectGameOverReport(
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly GameOverReportCauseView[] {
  if (state.outcome?.kind !== "game-over") return [];
  return state.outcome.causes.flatMap((cause) => {
    const definition = scenario.gameOvers?.find(
      ({ id }) => id === cause.gameOverId,
    );
    if (!definition) return [];
    const matchedGroups = getGroups(
      definition,
      cause.matchedPrerequisiteGroupIds,
      scenario,
      state,
    )
      .filter(({ matched }) => matched)
      .map(({ group, prerequisites }) => ({ group, prerequisites }));
    const affectedNodeIds = new Set(
      matchedGroups.flatMap(({ prerequisites }) =>
        prerequisites.flatMap(({ nodeId }) => (nodeId ? [nodeId] : [])),
      ),
    );
    const contributions = projectGameOverContributions(scenario, state, [
      ...affectedNodeIds,
    ]);
    return [
      {
        definition,
        matchedGroups,
        contributions,
        biggestContribution: getBiggestContribution(contributions),
      },
    ];
  });
}

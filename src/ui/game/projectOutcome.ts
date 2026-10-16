import {
  getEndingsInSelectionOrder,
  findPrerequisiteGroupsMet,
  type GameOverDefinition,
  type PrerequisiteGroupDefinition,
  type ScenarioDefinition,
  type SimulationState,
} from "../../simulation";
import { formatValue } from "../formatValue";
import type {
  CompletionSummaryView,
  ConditionAnalysisView,
  CrisisSummaryView,
  CrisisTimelineView,
  EndingSummaryView,
  OutcomeConditionDetailView,
  OutcomeConditionRef,
} from "./outcomeViews";
import { projectPrerequisiteGroups } from "./projectPrerequisite";
import {
  getBiggestContribution,
  groupContributions,
  projectContributions,
} from "./projectContributions";

/** Detail-only analysis; summary projections never scan Effects or Grudges. */
const projectConditionAnalysis = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  groups: readonly PrerequisiteGroupDefinition[],
  matchedIds: readonly string[],
  description: string,
  matchSource: ConditionAnalysisView["matchSource"],
): ConditionAnalysisView => {
  const allGroups = projectPrerequisiteGroups(
    groups,
    matchedIds,
    scenario,
    state,
  );
  const matchedGroups = matchedIds.flatMap((id) => {
    const group = allGroups.find((candidate) => candidate.id === id);
    return group ? [group] : [];
  });
  const nodeIds = [
    ...new Set(
      matchedGroups.flatMap(({ prerequisites }) =>
        prerequisites.flatMap(({ nodeId }) => (nodeId ? [nodeId] : [])),
      ),
    ),
  ];
  const contributions = projectContributions(scenario, state, nodeIds);
  return {
    description,
    matchSource,
    allGroups,
    matchedGroups,
    contributions,
    biggestContribution: getBiggestContribution(contributions),
    contributionGroups: groupContributions(contributions).map((group) => {
      const node = scenario.nodes.find(({ id }) => id === group.targetId);
      return {
        ...group,
        currentReading: node
          ? formatValue(state.nodes[node.id].value, node.domain)
          : undefined,
      };
    }),
  };
};

/** Crisis lifecycle owns countdowns and milestones, independently of report layout. */
const projectCrisisSummary = (
  definition: GameOverDefinition,
  state: SimulationState,
  recovered: boolean,
): CrisisSummaryView | undefined => {
  const progress = state.gameOverProgress[definition.id];
  const terminal =
    state.outcome?.kind === "game-over" &&
    state.outcome.causes.some(({ gameOverId }) => gameOverId === definition.id);
  const consecutiveTurns =
    terminal && !(progress?.consecutiveTurns > 0)
      ? definition.turnsToGameOver
      : (progress?.consecutiveTurns ?? 0);
  if (!terminal && consecutiveTurns <= 0 && !recovered) return undefined;
  return {
    kind: "crisis",
    id: definition.id,
    title: definition.title,
    status: terminal
      ? "terminal"
      : consecutiveTurns > 0
        ? "warning"
        : "recovered",
    consecutiveTurns,
    terminalTurn: definition.turnsToGameOver,
    turnsRemaining: Math.max(0, definition.turnsToGameOver - consecutiveTurns),
    progressPercent: Math.min(
      100,
      (consecutiveTurns / definition.turnsToGameOver) * 100,
    ),
  };
};

export const projectCrisis = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  recoveredCrisisIds: readonly string[] = [],
): readonly CrisisSummaryView[] =>
  (scenario.gameOvers ?? [])
    .flatMap((definition) => {
      const view = projectCrisisSummary(
        definition,
        state,
        recoveredCrisisIds.includes(definition.id),
      );
      return view ? [view] : [];
    })
    .sort(
      (a, b) =>
        a.turnsRemaining - b.turnsRemaining || a.title.localeCompare(b.title),
    );

export const formatCrisisTurns = (turns: number): string =>
  `${turns} turn${turns === 1 ? "" : "s"}`;

export const formatCrisisProgressLabel = (crisis: CrisisSummaryView): string =>
  crisis.status === "recovered"
    ? `${crisis.title}: Recovered, conditions cleared`
    : crisis.status === "terminal"
      ? `${crisis.title}: Game Over, turn ${crisis.terminalTurn} of ${crisis.terminalTurn}`
      : `${crisis.title}: ${crisis.consecutiveTurns} of ${crisis.terminalTurn} qualifying turns`;

const projectCrisisTimeline = (
  definition: GameOverDefinition,
  crisis: CrisisSummaryView,
): CrisisTimelineView => {
  const stages = [...definition.stages].sort((a, b) => a.atTurn - b.atTurn);
  const stage = stages.findLast(
    ({ atTurn }) => atTurn <= crisis.consecutiveTurns,
  );
  const nextThreshold =
    stages.find(({ atTurn }) => atTurn > crisis.consecutiveTurns)?.atTurn ??
    crisis.terminalTurn;
  return {
    stageLabel:
      stage?.title ??
      (crisis.status === "recovered"
        ? "Prerequisites cleared"
        : "Under inquiry"),
    stageDescription: stage?.description,
    progressLabel: formatCrisisProgressLabel(crisis),
    terminalTurn: crisis.terminalTurn,
    progressCopy:
      crisis.status === "recovered"
        ? { primary: "Recovered", secondary: "Conditions cleared" }
        : crisis.status === "terminal"
          ? {
              primary: "Game Over",
              secondary: `Turn: ${crisis.terminalTurn} / ${crisis.terminalTurn}`,
            }
          : {
              primary: `Turn: ${crisis.consecutiveTurns} / ${crisis.terminalTurn}`,
              secondary: `Next threshold: turn ${nextThreshold}`,
            },
    milestones: [
      ...stages.map((s) => ({
        id: s.id,
        turn: s.atTurn,
        positionPercent: (s.atTurn / crisis.terminalTurn) * 100,
        kind: "stage" as const,
        title: s.title,
      })),
      {
        id: "terminal",
        turn: crisis.terminalTurn,
        positionPercent: 100,
        kind: "terminal",
        title: "Game Over",
      },
    ],
  };
};

export const projectCrisisDetail = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  id: string,
  recoveredCrisisIds: readonly string[] = [],
): (OutcomeConditionDetailView & { readonly kind: "crisis" }) | undefined => {
  const definition = scenario.gameOvers?.find((d) => d.id === id);
  if (!definition) return undefined;
  const summary = projectCrisisSummary(
    definition,
    state,
    recoveredCrisisIds.includes(id),
  );
  if (!summary) return undefined;
  const cause =
    state.outcome?.kind === "game-over"
      ? state.outcome.causes.find(({ gameOverId }) => gameOverId === id)
      : undefined;
  const matchedIds =
    cause?.matchedPrerequisiteGroupIds ??
    state.gameOverProgress[id]?.matchedPrerequisiteGroupIds ??
    [];
  return {
    ...summary,
    ...projectConditionAnalysis(
      scenario,
      state,
      definition.prerequisiteGroups,
      matchedIds,
      definition.description,
      cause ? "outcome" : "crisis-evaluation",
    ),
    timeline: projectCrisisTimeline(definition, summary),
  };
};

export const projectCompletionConditions = (
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly CompletionSummaryView[] => {
  const met = new Set(
    findPrerequisiteGroupsMet(
      scenario.completion.prerequisiteGroups,
      state,
    ).map(({ id }) => id),
  );
  return scenario.completion.prerequisiteGroups.map(({ id, title }) => ({
    kind: "completion",
    id,
    title,
    status: met.has(id) ? "met" : "unmet",
  }));
};

export const projectEndingConditions = (
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly EndingSummaryView[] =>
  getEndingsInSelectionOrder(scenario).map((ending) => ({
    kind: "ending",
    id: ending.id,
    title: ending.title,
    priority: ending.priority,
    status: findPrerequisiteGroupsMet(ending.prerequisiteGroups, state).length
      ? "met"
      : "unmet",
  }));

export const projectRequirementDetail = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  ref: OutcomeConditionRef,
): OutcomeConditionDetailView | undefined => {
  const outcome = state.outcome?.kind === "ending" ? state.outcome : undefined;
  if (ref.kind === "completion") {
    const group = scenario.completion.prerequisiteGroups.find(
      ({ id }) => id === ref.id,
    );
    if (!group) return undefined;
    const recorded = outcome?.matchedTriggerIds.includes(group.id) ?? false;
    const ids = recorded
      ? [group.id]
      : findPrerequisiteGroupsMet([group], state).map(({ id }) => id);
    return {
      kind: "completion",
      id: group.id,
      title: group.title,
      status: ids.length ? "met" : "unmet",
      ...projectConditionAnalysis(
        scenario,
        state,
        [group],
        ids,
        group.description,
        recorded ? "outcome" : "current",
      ),
    };
  }
  const ending = scenario.completion.endings.find(({ id }) => id === ref.id);
  if (!ending || ref.kind !== "ending") return undefined;
  const recorded =
    !!outcome && !outcome.usedFallback && outcome.endingId === ending.id;
  const ids = recorded
    ? outcome.matchedPrerequisiteGroupIds
    : findPrerequisiteGroupsMet(ending.prerequisiteGroups, state).map(
        ({ id }) => id,
      );
  return {
    kind: "ending",
    id: ending.id,
    title: ending.title,
    priority: ending.priority,
    status: ids.length ? "met" : "unmet",
    ...projectConditionAnalysis(
      scenario,
      state,
      ending.prerequisiteGroups,
      ids,
      ending.description,
      recorded ? "outcome" : "current",
    ),
  };
};

export const projectOutcomeConditions = (
  scenario: ScenarioDefinition,
  state: SimulationState,
) => ({
  crises: projectCrisis(scenario, state),
  completion: projectCompletionConditions(scenario, state),
  endings: projectEndingConditions(scenario, state),
  fallback: {
    title: scenario.completion.fallbackEnding.title,
    description: scenario.completion.fallbackEnding.description,
  },
});

/** Only the selected condition receives prerequisite readings and contribution analysis. */
export const projectOutcomeConditionDetail = (
  scenario: ScenarioDefinition,
  state: SimulationState,
  ref: OutcomeConditionRef,
  recoveredCrisisIds: readonly string[] = [],
): OutcomeConditionDetailView | undefined =>
  ref.kind === "crisis"
    ? projectCrisisDetail(scenario, state, ref.id, recoveredCrisisIds)
    : projectRequirementDetail(scenario, state, ref);

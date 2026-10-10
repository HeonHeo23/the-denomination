/**
 * Projects active and recently recovered Game Over crises for UI surfaces.
 * Includes progress, prerequisite status, and timeline details.
 */
import type {
  GameOverDefinition,
  GameOverStageDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import {
  projectPrerequisiteGroups,
  type PrerequisiteGroupView,
} from "./projectPrerequisite";

export type CrisisStatus = "warning" | "recovered" | "terminal";

export interface CrisisView {
  readonly status: CrisisStatus;
  readonly definition: GameOverDefinition;
  readonly consecutiveTurns: number;
  readonly turnsRemaining: number;
  readonly progressPercent: number;
  readonly stage?: GameOverStageDefinition;
  readonly allGroups: readonly PrerequisiteGroupView[];
  readonly matchedGroups: readonly PrerequisiteGroupView[];
  readonly matchedPrerequisiteNodeIds: readonly string[];
}

function getCrisisProgress(
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

/** Projects active and just-recovered trajectories for crisis UI surfaces. */
export function projectCrisis(
  scenario: ScenarioDefinition,
  state: SimulationState,
  recoveredCrisisIds: readonly string[] = [],
): readonly CrisisView[] {
  const terminalIds = new Set(
    state.outcome?.kind === "game-over"
      ? state.outcome.causes.map(({ gameOverId }) => gameOverId)
      : [],
  );
  const items: CrisisView[] = (scenario.gameOvers ?? []).flatMap<CrisisView>(
    (definition) => {
      const progress = state.gameOverProgress[definition.id];
      if (!progress || progress.consecutiveTurns <= 0) return [];
      const allGroups = projectPrerequisiteGroups(
        definition.prerequisiteGroups,
        progress.matchedPrerequisiteGroupIds,
        scenario,
        state,
      );
      const matchedGroups = allGroups.filter(({ matched }) => matched);
      return [
        {
          definition,
          status: terminalIds.has(definition.id) ? "terminal" : "warning",
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
    },
  );
  const known = new Set(items.map(({ definition }) => definition.id));
  for (const gameOverId of recoveredCrisisIds) {
    if (known.has(gameOverId)) continue;
    const definition = scenario.gameOvers?.find(({ id }) => id === gameOverId);
    if (!definition) continue;
    const allGroups = projectPrerequisiteGroups(
      definition.prerequisiteGroups,
      [],
      scenario,
      state,
    );
    known.add(gameOverId);
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

export function formatCrisisTurns(turns: number): string {
  return `${turns} turn${turns === 1 ? "" : "s"}`;
}

export function formatCrisisProgressLabel(crisis: CrisisView): string {
  if (crisis.status === "recovered") {
    return `${crisis.definition.title}: Recovered, conditions cleared`;
  }
  if (crisis.status === "terminal") {
    const terminalTurn = crisis.definition.terminalAfterTurns;
    return `${crisis.definition.title}: Game Over, turn ${terminalTurn} of ${terminalTurn}`;
  }
  return `${crisis.definition.title}: ${crisis.consecutiveTurns} of ${crisis.definition.terminalAfterTurns} qualifying turns`;
}

export function formatCrisisElapsedLabel(crisis: CrisisView): string {
  return `${crisis.consecutiveTurns}/${crisis.definition.terminalAfterTurns} qualifying turns`;
}

export interface CrisisDetailView {
  readonly stageLabel: string;
  readonly progressLabel: string;
  readonly terminalTurn: number;
  readonly progressCopy: {
    readonly primary: string;
    readonly secondary: string;
  };
  readonly milestones: readonly {
    readonly id: string;
    readonly turn: number;
    readonly positionPercent: number;
    readonly kind: "stage" | "terminal";
    readonly title: string;
  }[];
}

export function projectCrisisDetail(crisis: CrisisView): CrisisDetailView {
  const terminalTurn = crisis.definition.terminalAfterTurns;
  const stages = [...crisis.definition.stages].sort(
    (left, right) => left.atTurn - right.atTurn,
  );
  const nextThresholdTurn =
    stages.find(({ atTurn }) => atTurn > crisis.consecutiveTurns)?.atTurn ??
    terminalTurn;

  return {
    stageLabel:
      crisis.stage?.title ??
      (crisis.status === "recovered"
        ? "Prerequisites cleared"
        : "Under inquiry"),
    progressLabel: formatCrisisProgressLabel(crisis),
    terminalTurn,
    progressCopy:
      crisis.status === "recovered"
        ? { primary: "Recovered", secondary: "Conditions cleared" }
        : crisis.status === "terminal"
          ? {
              primary: "Game Over",
              secondary: `Turn: ${terminalTurn} / ${terminalTurn}`,
            }
          : {
              primary: `Turn: ${crisis.consecutiveTurns} / ${terminalTurn}`,
              secondary: `Next threshold: turn ${nextThresholdTurn}`,
            },
    milestones: [
      ...stages.map((stage) => ({
        id: stage.id,
        turn: stage.atTurn,
        positionPercent: (stage.atTurn / terminalTurn) * 100,
        kind: "stage" as const,
        title: stage.title,
      })),
      {
        id: "terminal",
        turn: terminalTurn,
        positionPercent: 100,
        kind: "terminal",
        title: "Game Over",
      },
    ],
  };
}

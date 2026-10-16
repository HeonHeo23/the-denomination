/**
 * Projects turn and terminal outcomes into report views.
 * Uses recorded outcome data without evaluating simulation mechanics.
 */
import { getNodeDisplayName } from "../projections/projectFactionGroups";
import type { ReportChange } from "../changeView";
import { initializeScenario } from "../../simulation";
import type {
  HistoricalActorDefinition,
  FactionMetricDefinition,
  NodeDefinition,
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
  GameOverDefinition,
  GameOverStageDefinition,
  EventDefinition,
} from "../../simulation";
import type {
  SavedTurnReport,
  SavedTurnReportChange,
} from "../../app/persistence";
import type {
  OutcomeConditionDetailView,
  CrisisSummaryView,
} from "../game/outcomeViews";
import {
  projectCrisis,
  projectCrisisDetail,
  projectRequirementDetail,
} from "../game/projectOutcome";

export interface FinalCauseView {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly condition: OutcomeConditionDetailView & { readonly kind: "crisis" };
}

export type FinalReportView = {
  readonly title: string;
  readonly description: string;
  readonly turn: number;
  readonly year?: number;
  readonly actors: readonly HistoricalActorDefinition[];
  readonly activeCrises: readonly CrisisSummaryView[];
  readonly changes: readonly ReportChange[];
} & (
  | {
      readonly kind: "ending";
      readonly reason: {
        readonly endingId: string;
        readonly usedFallback: boolean;
        readonly completion: readonly Extract<
          OutcomeConditionDetailView,
          { kind: "completion" }
        >[];
        readonly ending?: Extract<
          OutcomeConditionDetailView,
          { kind: "ending" }
        >;
      };
    }
  | {
      readonly kind: "game-over";
      readonly reason: { readonly causes: readonly FinalCauseView[] };
    }
);

const CHANGE_EPSILON = 1e-9;
const startingSnapshots = new WeakMap<ScenarioDefinition, SimulationState>();

/** Compare all nodes with initialized content, including graph-hidden nodes. */
export const projectFinalChanges = (
  scenario: ScenarioDefinition,
  state: SimulationState,
) => {
  const initial =
    startingSnapshots.get(scenario) ?? initializeScenario(scenario);
  startingSnapshots.set(scenario, initial);
  return projectChanges(scenario, initial, state);
};

/** Describe recorded outcomes without choosing or reevaluating an ending. */
export const projectFinalReport = (
  scenario: ScenarioDefinition,
  state: SimulationState,
): FinalReportView | undefined => {
  const outcome = state.outcome;
  if (!outcome) return undefined;
  const context = {
    turn: outcome.turn,
    year: state.year,
    actors: scenario.historicalActors,
    activeCrises: projectCrisis(scenario, state),
    changes: projectFinalChanges(scenario, state),
  };
  if (outcome.kind === "ending") {
    const definition = outcome.usedFallback
      ? scenario.completion.fallbackEnding
      : scenario.completion.endings.find(({ id }) => id === outcome.endingId);
    if (!definition) return undefined;
    const endingDetail = outcome.usedFallback
      ? undefined
      : projectRequirementDetail(scenario, state, {
          kind: "ending",
          id: outcome.endingId,
        });
    return {
      ...context,
      kind: "ending",
      title: definition.title,
      description: definition.description,
      reason: {
        endingId: outcome.endingId,
        usedFallback: outcome.usedFallback,
        completion: outcome.matchedTriggerIds.flatMap((id) => {
          const detail = projectRequirementDetail(scenario, state, {
            kind: "completion",
            id,
          });
          return detail?.kind === "completion" ? [detail] : [];
        }),
        ending: endingDetail?.kind === "ending" ? endingDetail : undefined,
      },
    };
  }
  return {
    ...context,
    kind: "game-over",
    title: "Game Over",
    description:
      "The institution can no longer continue. Its terminal crises are recorded below.",
    reason: {
      causes: outcome.causes.flatMap(({ gameOverId }) => {
        const definition = scenario.gameOvers?.find(
          ({ id }) => id === gameOverId,
        );
        const condition = projectCrisisDetail(scenario, state, gameOverId);
        return definition && condition
          ? [
              {
                id: gameOverId,
                title: definition.title,
                description: definition.description,
                condition,
              },
            ]
          : [];
      }),
    },
  };
};

export interface TurnReportSituationTransition {
  readonly node: NodeDefinition;
  readonly kind: "began" | "ended";
}

export interface TurnReportGrudge {
  readonly id: string;
  readonly label: string;
  readonly targetId: string;
  readonly targetMetric?: FactionMetricDefinition;
  readonly targetName: string;
  readonly targetDomain?: NumericDomain;
  readonly magnitude: number;
}

export interface TurnReport {
  readonly turn: number;
  readonly year?: number;
  readonly highlights: readonly ReportChange[];
  readonly changes: readonly ReportChange[];
  readonly changedEffectIds: readonly string[];
  readonly situationTransitions: readonly TurnReportSituationTransition[];
  readonly grudges: readonly TurnReportGrudge[];
  readonly crisisTransitions: readonly TurnReportCrisisTransition[];
  readonly events: readonly EventDefinition[];
}

export interface TurnReportCrisisTransition {
  readonly kind: "stage" | "recovered";
  readonly definition: GameOverDefinition;
  readonly stage?: GameOverStageDefinition;
  readonly consecutiveTurns: number;
  readonly turnsRemaining: number;
}

/** Enrich numeric change data identically for live and restored reports. */
const projectChange = (
  node: NodeDefinition,
  scenario: ScenarioDefinition,
  change: Omit<SavedTurnReportChange, "nodeId">,
): ReportChange => {
  const display = getNodeDisplayName(scenario, node.id);
  return {
    id: node.id,
    nodeId: node.id,
    name: display.name,
    domain: node.domain,
    category: node.type,
    ...(display.metric ? { metric: display.metric } : {}),
    previousValue: change.previousValue,
    value: change.value,
    amount: change.delta,
    relativeMagnitude: change.relativeMagnitude,
    isActive: change.isActive,
  };
};

/** Compare node values and activation between snapshots in authored order. */
export const projectChanges = (
  scenario: ScenarioDefinition,
  previous: SimulationState,
  current: SimulationState,
): ReportChange[] => {
  return scenario.nodes.flatMap<ReportChange>((node) => {
    const before = previous.nodes[node.id];
    const after = current.nodes[node.id];
    const delta = after.value - before.value;
    if (Math.abs(delta) <= CHANGE_EPSILON && before.isActive === after.isActive)
      return [];
    return [
      projectChange(node, scenario, {
        previousValue: before.value,
        value: after.value,
        delta,
        relativeMagnitude:
          Math.abs(delta) / (node.domain.max - node.domain.min),
        isActive:
          before.isActive === after.isActive ? undefined : after.isActive,
      }),
    ];
  });
};

/** Projects one completed turn into disposable, player-facing report data. */
export const projectTurnReport = (
  scenario: ScenarioDefinition,
  previous: SimulationState,
  current: SimulationState,
): TurnReport => {
  // Compare snapshots once and index definitions for grudge target metadata.
  const changes = projectChanges(scenario, previous, current);
  const situationTransitions: TurnReportSituationTransition[] = [];
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const crisisTransitions: TurnReportCrisisTransition[] = [];

  // Report crisis recoveries and newly reached authored stages.
  for (const gameOverDef of scenario.gameOvers ?? []) {
    const before = previous.gameOverProgress[gameOverDef.id];
    const after = current.gameOverProgress[gameOverDef.id];
    if (!before || !after) continue;
    if (before.consecutiveTurns > 0 && after.consecutiveTurns === 0) {
      crisisTransitions.push({
        kind: "recovered",
        definition: gameOverDef,
        consecutiveTurns: 0,
        turnsRemaining: gameOverDef.turnsToGameOver,
      });
    } else if (after.consecutiveTurns > before.consecutiveTurns) {
      const stage = gameOverDef.stages.find(
        ({ atTurn }) => atTurn === after.consecutiveTurns,
      );
      if (stage)
        crisisTransitions.push({
          kind: "stage",
          definition: gameOverDef,
          stage,
          consecutiveTurns: after.consecutiveTurns,
          turnsRemaining: gameOverDef.turnsToGameOver - after.consecutiveTurns,
        });
    }
  }

  // Turn situation activation changes into began/ended entries in authored order.
  for (const node of scenario.nodes) {
    const before = previous.nodes[node.id];
    const after = current.nodes[node.id];
    const activationChanged = before.isActive !== after.isActive;
    if (node.type === "situation" && activationChanged) {
      situationTransitions.push({
        node,
        kind: after.isActive ? "began" : "ended",
      });
    }
  }

  // Highlight the four largest domain-relative changes without reordering changes.
  const highlights = [...changes]
    .sort((left, right) => right.relativeMagnitude - left.relativeMagnitude)
    .slice(0, 4);
  // Track contribution changes, treating missing effect state as zero.
  const changedEffectIds = scenario.effects
    .filter((effect) => {
      const previousContribution =
        previous.effects[effect.id]?.lastContribution ?? 0;
      const currentContribution =
        current.effects[effect.id]?.lastContribution ?? 0;
      return (
        Math.abs(currentContribution - previousContribution) > CHANGE_EPSILON
      );
    })
    .map((effect) => effect.id);

  // Assemble the completed turn using recorded state and scenario display data.
  return {
    turn: current.turn,
    year: current.year,
    highlights,
    changes,
    changedEffectIds,
    situationTransitions,
    // Include all current grudges with names, metrics, and domains for display.
    grudges: current.grudges.map((grudge) => {
      const target = nodes.get(grudge.target);
      return {
        id: grudge.id,
        label: grudge.label,
        targetId: grudge.target,
        targetName: getNodeDisplayName(scenario, grudge.target).name,
        targetMetric: getNodeDisplayName(scenario, grudge.target).metric,
        targetDomain: target ? target.domain : undefined,
        magnitude: grudge.magnitude,
      };
    }),
    crisisTransitions,
    // Include newly recorded triggers for this turn, ordered deterministically by ID.
    events: (scenario.events ?? [])
      .filter(
        (definition) =>
          current.events[definition.id]?.lastTriggerTurn === current.turn &&
          current.events[definition.id].triggerCount >
            (previous.events[definition.id]?.triggerCount ?? 0),
      )
      .sort((left, right) =>
        left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
      ),
  };
};

export const serializeTurnReport = (report: TurnReport): SavedTurnReport => ({
  turn: report.turn,
  ...(report.year === undefined ? {} : { year: report.year }),
  changes: report.changes.map<SavedTurnReportChange>((change) => ({
    nodeId: change.nodeId,
    previousValue: change.previousValue,
    value: change.value,
    delta: change.amount,
    relativeMagnitude: change.relativeMagnitude,
    ...(change.isActive === undefined ? {} : { isActive: change.isActive }),
  })),
  changedEffectIds: [...report.changedEffectIds],
  situationTransitions: report.situationTransitions.map((transition) => ({
    nodeId: transition.node.id,
    kind: transition.kind,
  })),
  grudges: report.grudges.map((grudge) => ({
    id: grudge.id,
    label: grudge.label,
    targetId: grudge.targetId,
    magnitude: grudge.magnitude,
  })),
  crisisTransitions: report.crisisTransitions.map((transition) => ({
    kind: transition.kind,
    gameOverId: transition.definition.id,
    ...(transition.stage === undefined
      ? {}
      : { stageAtTurn: transition.stage.atTurn }),
    consecutiveTurns: transition.consecutiveTurns,
    turnsRemaining: transition.turnsRemaining,
  })),
  eventIds: report.events.map(({ id }) => id),
});

export const restoreTurnReport = (
  scenario: ScenarioDefinition,
  saved: SavedTurnReport,
): TurnReport => {
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const gameOvers = new Map(
    (scenario.gameOvers ?? []).map((definition) => [definition.id, definition]),
  );
  const events = new Map(
    (scenario.events ?? []).map((definition) => [definition.id, definition]),
  );
  const changes = saved.changes.map((change) =>
    projectChange(nodes.get(change.nodeId)!, scenario, change),
  );

  return {
    turn: saved.turn,
    ...(saved.year === undefined ? {} : { year: saved.year }),
    highlights: [...changes]
      .sort((left, right) => right.relativeMagnitude - left.relativeMagnitude)
      .slice(0, 4),
    changes,
    changedEffectIds: saved.changedEffectIds,
    situationTransitions: saved.situationTransitions.map((transition) => ({
      node: nodes.get(transition.nodeId)!,
      kind: transition.kind,
    })),
    grudges: saved.grudges.map((grudge) => ({
      id: grudge.id,
      label: grudge.label,
      targetId: grudge.targetId,
      targetMetric: getNodeDisplayName(scenario, grudge.targetId).metric,
      targetName: getNodeDisplayName(scenario, grudge.targetId).name,
      targetDomain: nodes.get(grudge.targetId)!.domain,
      magnitude: grudge.magnitude,
    })),
    crisisTransitions: saved.crisisTransitions.map((transition) => {
      const definition = gameOvers.get(transition.gameOverId)!;
      return {
        kind: transition.kind,
        definition,
        stage:
          transition.stageAtTurn === undefined
            ? undefined
            : definition.stages.find(
                (stage) => stage.atTurn === transition.stageAtTurn,
              ),
        consecutiveTurns: transition.consecutiveTurns,
        turnsRemaining: transition.turnsRemaining,
      };
    }),
    events: saved.eventIds.map((id) => events.get(id)!),
  };
};

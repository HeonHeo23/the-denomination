import type {
  NodeDefinition,
  NodeType,
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
  GameOverDefinition,
  GameOverStageDefinition,
} from "../../simulation";
import type {
  SavedTurnReport,
  SavedTurnReportChange,
} from "../../app/persistence";

const CHANGE_EPSILON = 1e-9;

export interface TurnReportChange {
  readonly node: NodeDefinition;
  readonly previousValue: number;
  readonly value: number;
  readonly delta: number;
  readonly relativeMagnitude: number;
  readonly previousActive: boolean;
  readonly isActive: boolean;
}

export interface TurnReportSituationTransition {
  readonly node: NodeDefinition;
  readonly kind: "began" | "ended";
}

export interface TurnReportGrudge {
  readonly id: string;
  readonly label: string;
  readonly targetId: string;
  readonly targetName: string;
  readonly targetDomain?: NumericDomain;
  readonly magnitude: number;
}

export interface TurnReport {
  readonly turn: number;
  readonly year?: number;
  readonly highlights: readonly TurnReportChange[];
  readonly changes: readonly TurnReportChange[];
  readonly changedEffectIds: readonly string[];
  readonly situationTransitions: readonly TurnReportSituationTransition[];
  readonly grudges: readonly TurnReportGrudge[];
  readonly crisisTransitions: readonly TurnReportCrisisTransition[];
}

export interface TurnReportCrisisTransition {
  readonly kind: "stage" | "recovered";
  readonly definition: GameOverDefinition;
  readonly stage?: GameOverStageDefinition;
  readonly consecutiveTurns: number;
  readonly turnsRemaining: number;
}

function relativeMagnitude(delta: number, node: NodeDefinition): number {
  return Math.abs(delta) / (node.domain.max - node.domain.min);
}

function isSituation(
  node: NodeDefinition,
): node is Extract<NodeDefinition, { type: "situation" }> {
  return node.type === "situation";
}

/** Projects one completed turn into disposable, player-facing report data. */
export function projectTurnReport(
  scenario: ScenarioDefinition,
  previous: SimulationState,
  current: SimulationState,
): TurnReport {
  const changes: TurnReportChange[] = [];
  const situationTransitions: TurnReportSituationTransition[] = [];
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const crisisTransitions: TurnReportCrisisTransition[] = [];

  for (const definition of scenario.gameOvers ?? []) {
    const before = previous.gameOverProgress[definition.id];
    const after = current.gameOverProgress[definition.id];
    if (!before || !after) continue;
    if (before.consecutiveTurns > 0 && after.consecutiveTurns === 0) {
      crisisTransitions.push({
        kind: "recovered",
        definition,
        consecutiveTurns: 0,
        turnsRemaining: definition.terminalAfterTurns,
      });
    } else if (after.consecutiveTurns > before.consecutiveTurns) {
      const stage = definition.stages.find(
        ({ atTurn }) => atTurn === after.consecutiveTurns,
      );
      if (stage)
        crisisTransitions.push({
          kind: "stage",
          definition,
          stage,
          consecutiveTurns: after.consecutiveTurns,
          turnsRemaining:
            definition.terminalAfterTurns - after.consecutiveTurns,
        });
    }
  }

  for (const node of scenario.nodes) {
    const before = previous.nodes[node.id];
    const after = current.nodes[node.id];
    const delta = after.value - before.value;
    const valueChanged = Math.abs(delta) > CHANGE_EPSILON;
    const activationChanged = before.isActive !== after.isActive;

    if (valueChanged || activationChanged) {
      changes.push({
        node,
        previousValue: before.value,
        value: after.value,
        delta,
        relativeMagnitude: relativeMagnitude(delta, node),
        previousActive: before.isActive,
        isActive: after.isActive,
      });
    }

    if (isSituation(node) && activationChanged) {
      situationTransitions.push({
        node,
        kind: after.isActive ? "began" : "ended",
      });
    }
  }

  const highlights = [...changes]
    .sort((left, right) => right.relativeMagnitude - left.relativeMagnitude)
    .slice(0, 4);
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

  return {
    turn: current.turn,
    year: current.year,
    highlights,
    changes,
    changedEffectIds,
    situationTransitions,
    grudges: current.grudges.map((grudge) => {
      const target = nodes.get(grudge.target);
      return {
        id: grudge.id,
        label: grudge.label,
        targetId: grudge.target,
        targetName: target?.name ?? grudge.target,
        targetDomain: target?.domain,
        magnitude: grudge.magnitude,
      };
    }),
    crisisTransitions,
  };
}

export function serializeTurnReport(report: TurnReport): SavedTurnReport {
  return {
    turn: report.turn,
    ...(report.year === undefined ? {} : { year: report.year }),
    changes: report.changes.map<SavedTurnReportChange>((change) => ({
      nodeId: change.node.id,
      previousValue: change.previousValue,
      value: change.value,
      delta: change.delta,
      relativeMagnitude: change.relativeMagnitude,
      previousActive: change.previousActive,
      isActive: change.isActive,
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
      targetName: grudge.targetName,
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
  };
}

export function restoreTurnReport(
  scenario: ScenarioDefinition,
  saved: SavedTurnReport,
): TurnReport {
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const gameOvers = new Map(
    (scenario.gameOvers ?? []).map((definition) => [definition.id, definition]),
  );
  const changes = saved.changes.map((change) => ({
    node: nodes.get(change.nodeId)!,
    previousValue: change.previousValue,
    value: change.value,
    delta: change.delta,
    relativeMagnitude: change.relativeMagnitude,
    previousActive: change.previousActive,
    isActive: change.isActive,
  }));

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
      targetName: grudge.targetName,
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
  };
}

export function nodeTypeLabel(type: NodeType): string {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

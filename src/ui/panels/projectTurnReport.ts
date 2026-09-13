import type {
  NodeDefinition,
  NodeType,
  NumericDomain,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";

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
  readonly targetName: string;
  readonly targetDomain?: NumericDomain;
  readonly magnitude: number;
}

export interface TurnReport {
  readonly turn: number;
  readonly year?: number;
  readonly highlights: readonly TurnReportChange[];
  readonly changes: readonly TurnReportChange[];
  readonly situationTransitions: readonly TurnReportSituationTransition[];
  readonly grudges: readonly TurnReportGrudge[];
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

  return {
    turn: current.turn,
    year: current.year,
    highlights,
    changes,
    situationTransitions,
    grudges: current.grudges.map((grudge) => {
      const target = nodes.get(grudge.target);
      return {
        id: grudge.id,
        label: grudge.label,
        targetName: target?.name ?? grudge.target,
        targetDomain: target?.domain,
        magnitude: grudge.magnitude,
      };
    }),
  };
}

export function nodeTypeLabel(type: NodeType): string {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

/** Stable identifier for a persistent node. */
export type NodeId = string;

/** Stable identifier for a causal Effect. */
export type EffectId = string;

/** The five persistent object kinds supported by the simulation. */
export type NodeType =
  "stance" | "indicator" | "faction" | "resource" | "situation";

/** Non-mechanical metadata used to organize nodes in the interface. */
export type NodeCategory =
  | "Governance"
  | "Belief and Teaching"
  | "Worship and Practice"
  | "Finance and Assets"
  | "Care and Charity"
  | "Mission and Expansion";

/** Numeric bounds for a node and whether engine writes are clamped to them. */
export interface NumericDomain {
  readonly min: number;
  readonly max: number;
  readonly clamp: boolean;
}

export interface InitialNodeState {
  readonly value: number;
  readonly isActive: boolean;
  readonly isForced: boolean;
}

/** Fields shared by every authored node definition. */
interface BaseNodeDefinition {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name: string;
  readonly description: string;
  readonly category?: NodeCategory;
  readonly domain: NumericDomain;
  readonly initial: InitialNodeState;
  readonly baseline?: number;
  readonly graphVisible?: boolean;
  readonly requires?: readonly string[];
}

/** Configuration for a continuously adjustable Stance. */
export interface ContinuousStanceControl {
  readonly kind: "continuous";
  readonly step?: number;
}

/** Configuration for a Stance restricted to named numeric states. */
export interface DiscreteStanceControl {
  readonly kind: "discrete";
  readonly states: readonly {
    readonly value: number;
    readonly label: string;
  }[];
}

/** Resource cost applied when a player changes a Stance. */
export interface StanceCostDefinition {
  readonly resourceId: NodeId;
  readonly base: number;
  readonly perPoint: number;
  readonly maxChange?: number;
}

/** A fixed Resource cost for enacting or repealing a Stance. */
export interface StanceTransitionCostDefinition {
  readonly resourceId: NodeId;
  readonly amount: number;
}

/** A persistent position controlled primarily by the player. */
export interface StanceDefinition extends BaseNodeDefinition {
  readonly type: "stance";
  readonly control: ContinuousStanceControl | DiscreteStanceControl;
  readonly cost?: StanceCostDefinition;
  readonly enactmentCost?: StanceTransitionCostDefinition;
  readonly repealCost?: StanceTransitionCostDefinition;
}

/** A continuously calculated measure that cannot be deactivated. */
export interface IndicatorDefinition extends BaseNodeDefinition {
  readonly type: "indicator";
  readonly initial: InitialNodeState & {
    readonly isActive: true;
    readonly isForced: true;
  };
}

/** A constituency or tendency represented by one scenario-defined scalar. */
export interface FactionDefinition extends BaseNodeDefinition {
  readonly type: "faction";
  readonly valueMeaning: string;
}

/** A spendable or accumulable capacity represented as a node. */
export interface ResourceDefinition extends BaseNodeDefinition {
  readonly type: "resource";
  readonly initial: InitialNodeState & {
    readonly isActive: true;
    readonly isForced: true;
  };
}

/** A persistent condition governed by hysteresis thresholds. */
export interface SituationDefinition extends BaseNodeDefinition {
  readonly type: "situation";
  readonly startThreshold: number;
  readonly stopThreshold: number;
}

/** Any authored persistent node definition. */
export type NodeDefinition =
  | StanceDefinition
  | IndicatorDefinition
  | FactionDefinition
  | ResourceDefinition
  | SituationDefinition;

/** A node source, or the unit-valued pseudo-source for constant effects. */
export type EffectSource = NodeId | "_default_";

/** Declarative function used to map an Effect source to its contribution. */
export type ResponseDefinition =
  | {
      readonly kind: "constant";
      readonly value: number;
    }
  | {
      readonly kind: "linear";
      readonly coefficient: number;
      readonly intercept?: number;
    }
  | {
      readonly kind: "power";
      readonly coefficient: number;
      readonly exponent: number;
      readonly intercept?: number;
    }
  | {
      readonly kind: "product";
      readonly coefficient: number;
      readonly factors: readonly NodeId[];
      readonly intercept?: number;
    };

/** A persistent directed causal relationship between simulation nodes. */
export interface EffectDefinition {
  readonly id: EffectId;
  readonly source: EffectSource;
  readonly target: NodeId;
  readonly response: ResponseDefinition;
  readonly inertiaTurns?: number;
  readonly label?: string;
}

/** A reusable predicate evaluated against one canonical runtime snapshot. */
export type PrerequisiteDefinition =
  | {
      readonly kind: "node-value";
      readonly nodeId: NodeId;
      readonly comparison: "at-most" | "at-least";
      readonly value: number;
    }
  | {
      readonly kind: "node-activation";
      readonly nodeId: NodeId;
      readonly active: boolean;
    };

/** A named conjunction; consumers may treat several groups as alternatives. */
export interface PrerequisiteGroupDefinition {
  readonly id: string;
  readonly title: string;
  readonly allOf: readonly PrerequisiteDefinition[];
}

/** Reusable immediate state changes created by authored occurrences. */
export type ConsequenceDefinition =
  | {
      readonly kind: "resource";
      readonly target: NodeId;
      readonly amount: number;
    }
  | {
      readonly kind: "grudge";
      readonly target: NodeId;
      readonly magnitude: number;
      readonly decay: number;
      readonly label: string;
    }
  | {
      readonly kind: "activation";
      readonly target: NodeId;
      readonly active: boolean;
    };

export interface GameOverStageDefinition {
  readonly id: string;
  readonly atTurn: number;
  readonly title: string;
  readonly description: string;
  readonly consequences?: readonly ConsequenceDefinition[];
}

/** One recoverable, Scenario-authored trajectory toward a terminal outcome. */
export interface GameOverDefinition {
  readonly id: string;
  readonly title: string;
  readonly prerequisiteGroups: readonly PrerequisiteGroupDefinition[];
  readonly terminalAfterTurns: number;
  readonly stages: readonly GameOverStageDefinition[];
  readonly recovery?: {
    readonly title: string;
    readonly description: string;
    readonly consequences?: readonly ConsequenceDefinition[];
  };
  readonly report: {
    readonly title: string;
    readonly narrative: string;
  };
}

/** Complete immutable content required to initialize a playable session. */
export interface ScenarioDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly schemaVersion: 3;
  readonly start: { readonly turn: number; readonly year?: number };
  readonly conditions?: readonly string[];
  /** Incidents are not supported by this implementation yet. */
  readonly events?: readonly never[];
  readonly dilemmas?: readonly never[];
  readonly gameOvers?: readonly GameOverDefinition[];
  readonly nodes: readonly NodeDefinition[];
  readonly effects: readonly EffectDefinition[];
}

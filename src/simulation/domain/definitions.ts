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

/** Fields shared by every authored node definition. */
interface BaseNodeDefinition {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name: string;
  readonly description: string;
  readonly category?: NodeCategory;
  readonly domain: NumericDomain;
  readonly initialValue: number;
  readonly baselineValue?: number;
  readonly isActive: boolean;
  readonly isVisible?: boolean;
  readonly isForced?: boolean;
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
  // readonly maxChange?: number;
}

/** A persistent position controlled primarily by the player. */
export interface StanceDefinition extends BaseNodeDefinition {
  readonly type: "stance";
  readonly control: ContinuousStanceControl | DiscreteStanceControl;
  readonly cost?: StanceCostDefinition;
  readonly prerequisites?: readonly string[];
}

/** A continuously calculated measure that cannot be deactivated. */
export interface IndicatorDefinition extends BaseNodeDefinition {
  readonly type: "indicator";
  readonly isActive: true;
  readonly isForced: true;
}

/** A constituency or tendency represented by one scenario-defined scalar. */
export interface FactionDefinition extends BaseNodeDefinition {
  readonly type: "faction";
  readonly valueMeaning: string;
}

/** A spendable or accumulable capacity represented as a node. */
export interface ResourceDefinition extends BaseNodeDefinition {
  readonly type: "resource";
  readonly isActive: true;
  readonly isForced: true;
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

/** Complete immutable content required to initialize a playable session. */
export interface ScenarioDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly startingTurn: number;
  readonly startingYear?: number;
  readonly prerequisites: readonly string[];
  readonly nodes: readonly NodeDefinition[];
  readonly effects: readonly EffectDefinition[];
}

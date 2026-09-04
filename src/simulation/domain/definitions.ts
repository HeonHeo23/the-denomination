export type NodeId = string
export type EffectId = string
export type IncidentId = string

export type NodeType =
  | 'stance'
  | 'indicator'
  | 'faction'
  | 'resource'
  | 'situation'

export type NodeCategory =
  | 'Governance'
  | 'Belief and Teaching'
  | 'Worship and Practice'
  | 'Finance and Assets'
  | 'Care and Charity'
  | 'Mission and Expansion'

export interface NumericDomain {
  readonly min: number
  readonly max: number
  readonly clamp: boolean
}

interface BaseNodeDefinition {
  readonly id: NodeId
  readonly type: NodeType
  readonly name: string
  readonly description: string
  readonly category?: NodeCategory
  readonly domain: NumericDomain
  readonly initialValue: number
  readonly baselineValue?: number
  readonly isActive: boolean
  readonly isVisible?: boolean
  readonly isForced?: boolean
}

export interface ContinuousStanceControl {
  readonly kind: 'continuous'
  readonly step?: number
}

export interface DiscreteStanceControl {
  readonly kind: 'discrete'
  readonly states: readonly {
    readonly value: number
    readonly label: string
  }[]
}

export interface StanceCostDefinition {
  readonly resourceId: NodeId
  readonly base: number
  readonly perPoint: number
  readonly maxChange?: number
}

export interface StanceDefinition extends BaseNodeDefinition {
  readonly type: 'stance'
  readonly control: ContinuousStanceControl | DiscreteStanceControl
  readonly cost?: StanceCostDefinition
  readonly prerequisites?: readonly string[]
}

export interface IndicatorDefinition extends BaseNodeDefinition {
  readonly type: 'indicator'
  readonly isActive: true
  readonly isForced: true
}

export interface FactionDefinition extends BaseNodeDefinition {
  readonly type: 'faction'
  readonly valueMeaning: string
}

export interface ResourceDefinition extends BaseNodeDefinition {
  readonly type: 'resource'
  readonly isActive: true
  readonly isForced: true
}

export interface SituationDefinition extends BaseNodeDefinition {
  readonly type: 'situation'
  readonly startThreshold: number
  readonly stopThreshold: number
}

export type NodeDefinition =
  | StanceDefinition
  | IndicatorDefinition
  | FactionDefinition
  | ResourceDefinition
  | SituationDefinition

export type EffectSource = NodeId | '_default_'

export type ResponseDefinition =
  | {
      readonly kind: 'constant'
      readonly value: number
    }
  | {
      readonly kind: 'linear'
      readonly coefficient: number
      readonly intercept?: number
    }
  | {
      readonly kind: 'power'
      readonly coefficient: number
      readonly exponent: number
      readonly intercept?: number
    }
  | {
      readonly kind: 'product'
      readonly coefficient: number
      readonly factors: readonly NodeId[]
      readonly intercept?: number
    }

export interface EffectDefinition {
  readonly id: EffectId
  readonly source: EffectSource
  readonly target: NodeId
  readonly response: ResponseDefinition
  readonly inertiaTurns?: number
  readonly label?: string
}

export interface IncidentInfluence {
  readonly source: NodeId | '_random_'
  readonly coefficient: number
  readonly intercept?: number
}

export type ConsequenceDefinition =
  | {
      readonly kind: 'grudge'
      readonly target: NodeId
      readonly magnitude: number
      readonly decay: number
      readonly label: string
    }
  | {
      readonly kind: 'resource'
      readonly target: NodeId
      readonly amount: number
    }
  | {
      readonly kind: 'activation'
      readonly target: NodeId
      readonly active: boolean
    }

interface BaseIncidentDefinition {
  readonly id: IncidentId
  readonly title: string
  readonly description: string
  readonly influences: readonly IncidentInfluence[]
  readonly threshold: number
  readonly cooldownTurns: number
  readonly prerequisites?: readonly string[]
}

export interface EventDefinition extends BaseIncidentDefinition {
  readonly kind: 'event'
  readonly consequences: readonly ConsequenceDefinition[]
}

export interface DilemmaChoiceDefinition {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly consequences: readonly ConsequenceDefinition[]
}

export interface DilemmaDefinition extends BaseIncidentDefinition {
  readonly kind: 'dilemma'
  readonly choices: readonly DilemmaChoiceDefinition[]
}

export interface ScenarioDefinition {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly startingTurn: number
  readonly startingYear?: number
  readonly prerequisites: readonly string[]
  readonly nodes: readonly NodeDefinition[]
  readonly effects: readonly EffectDefinition[]
  readonly events: readonly EventDefinition[]
  readonly dilemmas: readonly DilemmaDefinition[]
}

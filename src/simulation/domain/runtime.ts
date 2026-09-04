import type { EffectId, IncidentId, NodeId } from './definitions'

export interface NodeRuntimeState {
  readonly value: number
  readonly baseValue: number
  readonly isActive: boolean
  readonly isForced: boolean
}

export interface EffectRuntimeState {
  readonly sourceHistory: readonly number[]
  readonly lastContribution: number
}

export interface GrudgeRuntimeState {
  readonly id: string
  readonly sourceIncidentId: IncidentId
  readonly label: string
  readonly target: NodeId
  readonly magnitude: number
  readonly decay: number
  readonly createdTurn: number
}

export interface IncidentRuntimeState {
  readonly lastTriggeredTurn?: number
  readonly timesTriggered: number
}

export interface PendingDilemmaState {
  readonly dilemmaId: IncidentId
  readonly triggeredTurn: number
}

export interface HistoryEntry {
  readonly id: string
  readonly turn: number
  readonly kind: 'event' | 'dilemma' | 'stance' | 'situation'
  readonly title: string
  readonly detail: string
}

export interface SimulationState {
  readonly scenarioId: string
  readonly turn: number
  readonly year?: number
  readonly nodes: Readonly<Record<NodeId, NodeRuntimeState>>
  readonly effects: Readonly<Record<EffectId, EffectRuntimeState>>
  readonly grudges: readonly GrudgeRuntimeState[]
  readonly incidents: Readonly<Record<IncidentId, IncidentRuntimeState>>
  readonly pendingDilemma?: PendingDilemmaState
  readonly history: readonly HistoryEntry[]
}


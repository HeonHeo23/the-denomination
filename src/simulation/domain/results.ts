import type { SimulationState } from './runtime'

export interface CalculationTrace {
  readonly targetId: string
  readonly baseline: number
  readonly effectTotal: number
  readonly grudgeTotal: number
  readonly result: number
}

export interface CommandResult {
  readonly accepted: boolean
  readonly state: SimulationState
  readonly message: string
}

export interface TurnResult {
  readonly advanced: boolean
  readonly state: SimulationState
  readonly message: string
  readonly trace: readonly CalculationTrace[]
}


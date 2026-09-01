import type { NodeId } from './definitions'

export type SimulationCommand =
  | {
      readonly type: 'set-stance'
      readonly stanceId: NodeId
      readonly value: number
    }
  | {
      readonly type: 'resolve-dilemma'
      readonly dilemmaId: string
      readonly choiceId: string
    }


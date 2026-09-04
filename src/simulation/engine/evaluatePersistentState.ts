import type {
  EffectDefinition,
  ResponseDefinition,
  ScenarioDefinition,
} from '../domain/definitions'
import type { CalculationTrace } from '../domain/results'
import type {
  EffectRuntimeState,
  HistoryEntry,
  SimulationState,
} from '../domain/runtime'
import { clampValue, indexNodes } from './shared'

interface EvaluationResult {
  readonly state: SimulationState
  readonly trace: readonly CalculationTrace[]
}

function responseValue(
  response: ResponseDefinition,
  sourceValue: number,
  state: SimulationState,
): number {
  switch (response.kind) {
    case 'constant':
      return response.value
    case 'linear':
      return (response.intercept ?? 0) + response.coefficient * sourceValue
    case 'power':
      return (
        (response.intercept ?? 0) +
        response.coefficient * sourceValue ** response.exponent
      )
    case 'product':
      return (
        (response.intercept ?? 0) +
        response.coefficient *
          sourceValue *
          response.factors.reduce(
            (product, nodeId) => product * state.nodes[nodeId].value,
            1,
          )
      )
  }
}

function sampleEffect(
  effect: EffectDefinition,
  state: SimulationState,
): { runtime: EffectRuntimeState; effectiveSource: number } {
  const sourceParticipates =
    effect.source === '_default_' || state.nodes[effect.source].isActive
  const sourceValue =
    effect.source === '_default_'
      ? 1
      : sourceParticipates
        ? state.nodes[effect.source].value
        : 0
  const inertiaTurns = effect.inertiaTurns ?? 1
  const previous = state.effects[effect.id]?.sourceHistory ?? []
  const history = [...previous, sourceValue].slice(-inertiaTurns)
  const effectiveSource =
    history.reduce((total, value) => total + value, 0) / history.length
  const contribution = sourceParticipates
    ? responseValue(effect.response, effectiveSource, state)
    : 0

  return {
    runtime: { sourceHistory: history, lastContribution: contribution },
    effectiveSource,
  }
}

export function evaluatePersistentState(
  scenario: ScenarioDefinition,
  state: SimulationState,
): EvaluationResult {
  const definitions = indexNodes(scenario)
  const effects = { ...state.effects }
  const totals: Record<string, number> = {}

  for (const effect of scenario.effects) {
    const targetDefinition = definitions[effect.target]
    const targetRuntime = state.nodes[effect.target]
    const targetCanReceive =
      targetDefinition.type === 'situation' || targetRuntime.isActive
    const sampled = sampleEffect(effect, state)
    effects[effect.id] = sampled.runtime

    if (targetDefinition.type === 'stance' || !targetCanReceive) continue
    totals[effect.target] =
      (totals[effect.target] ?? 0) + sampled.runtime.lastContribution
  }

  const nodes = { ...state.nodes }
  const trace: CalculationTrace[] = []
  const history: HistoryEntry[] = [...state.history]

  for (const definition of scenario.nodes) {
    const runtime = state.nodes[definition.id]
    if (definition.type === 'stance') continue
    const canReceive =
      definition.type === 'situation' || runtime.isActive
    if (!canReceive) continue

    const effectTotal = totals[definition.id] ?? 0
    const grudgeTotal = state.grudges
      .filter((grudge) => grudge.target === definition.id)
      .reduce((total, grudge) => total + grudge.magnitude, 0)
    const value = clampValue(
      runtime.baseValue + effectTotal + grudgeTotal,
      definition,
    )
    let activation = runtime.isActive

    if (definition.type === 'situation') {
      if (!activation && value >= definition.startThreshold) {
        activation = true
        history.push({
          id: `${definition.id}:start:${state.turn}`,
          turn: state.turn,
          kind: 'situation',
          title: `${definition.name} began`,
          detail: `Pressure reached ${Math.round(value * 100)}%.`,
        })
      } else if (
        activation &&
        value <= definition.stopThreshold
      ) {
        activation = false
        history.push({
          id: `${definition.id}:stop:${state.turn}`,
          turn: state.turn,
          kind: 'situation',
          title: `${definition.name} ended`,
          detail: `Pressure fell to ${Math.round(value * 100)}%.`,
        })
      }
    }

    nodes[definition.id] = { ...runtime, value, isActive: activation }
    trace.push({
      targetId: definition.id,
      baseline: runtime.baseValue,
      effectTotal,
      grudgeTotal,
      result: value,
    })
  }

  return { state: { ...state, nodes, effects, history }, trace }
}

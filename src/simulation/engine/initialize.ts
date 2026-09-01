import type { ScenarioDefinition } from '../domain/definitions'
import type {
  EffectRuntimeState,
  IncidentRuntimeState,
  SimulationState,
} from '../domain/runtime'
import { evaluatePersistentState } from './evaluatePersistentState'
import { validateScenario } from './validateScenario'

export function initializeScenario(
  scenario: ScenarioDefinition,
): SimulationState {
  const errors = validateScenario(scenario)
  if (errors.length > 0) {
    throw new Error(`Invalid scenario:\n${errors.join('\n')}`)
  }

  const nodes = Object.fromEntries(
    scenario.nodes.map((node) => [
      node.id,
      {
        value: node.initialValue,
        baseValue: node.baselineValue ?? node.initialValue,
        activation: node.activation,
      },
    ]),
  )
  const effects: Record<string, EffectRuntimeState> = {}

  for (const effect of scenario.effects) {
    const sourceValue =
      effect.source === '_default_' ? 1 : nodes[effect.source].value
    effects[effect.id] = {
      sourceHistory: Array.from(
        { length: effect.inertiaTurns ?? 1 },
        () => sourceValue,
      ),
      lastContribution: 0,
    }
  }

  const incidents: Record<string, IncidentRuntimeState> = Object.fromEntries(
    [...scenario.events, ...scenario.dilemmas].map((incident) => [
      incident.id,
      { timesTriggered: 0 },
    ]),
  )
  const initial: SimulationState = {
    scenarioId: scenario.id,
    turn: scenario.startingTurn,
    year: scenario.startingYear,
    nodes,
    effects,
    grudges: [],
    incidents,
    history: [],
  }

  return evaluatePersistentState(scenario, initial).state
}

import type {
  ConsequenceDefinition,
  IncidentInfluence,
  ScenarioDefinition,
} from '../domain/definitions'
import type { SimulationState } from '../domain/runtime'
import { clampValue, indexNodes } from './shared'

export interface RandomSource {
  next(): number
}

export const defaultRandomSource: RandomSource = {
  next: () => Math.random(),
}

function prerequisitesMet(
  required: readonly string[] | undefined,
  scenario: ScenarioDefinition,
): boolean {
  return (required ?? []).every((value) =>
    scenario.prerequisites.includes(value),
  )
}

function influenceScore(
  influences: readonly IncidentInfluence[],
  state: SimulationState,
  random: RandomSource,
): number {
  return influences.reduce((score, influence) => {
    const sourceValue =
      influence.source === '_random_'
        ? random.next()
        : state.nodes[influence.source].value
    return (
      score +
      (influence.intercept ?? 0) +
      influence.coefficient * sourceValue
    )
  }, 0)
}

function isOffCooldown(
  state: SimulationState,
  incidentId: string,
  cooldownTurns: number,
): boolean {
  const lastTurn = state.incidents[incidentId]?.lastTriggeredTurn
  return lastTurn === undefined || state.turn - lastTurn >= cooldownTurns
}

export function applyConsequences(
  scenario: ScenarioDefinition,
  state: SimulationState,
  incidentId: string,
  consequences: readonly ConsequenceDefinition[],
): SimulationState {
  const definitions = indexNodes(scenario)
  const nodes = { ...state.nodes }
  const grudges = [...state.grudges]

  consequences.forEach((consequence, index) => {
    const runtime = nodes[consequence.target]
    const definition = definitions[consequence.target]

    switch (consequence.kind) {
      case 'grudge':
        grudges.push({
          id: `${incidentId}:${state.turn}:${index}:${grudges.length}`,
          sourceIncidentId: incidentId,
          label: consequence.label,
          target: consequence.target,
          magnitude: consequence.magnitude,
          decay: consequence.decay,
          createdTurn: state.turn,
        })
        break
      case 'resource': {
        if (definition.type !== 'resource') break
        const baseValue = clampValue(
          runtime.baseValue + consequence.amount,
          definition,
        )
        const actualChange = baseValue - runtime.baseValue
        nodes[consequence.target] = {
          ...runtime,
          baseValue,
          value: clampValue(runtime.value + actualChange, definition),
        }
        break
      }
      case 'activation':
        if (runtime.activation === 'forced-active') break
        nodes[consequence.target] = {
          ...runtime,
          activation: consequence.active ? 'active' : 'inactive',
        }
        break
    }
  })

  return { ...state, nodes, grudges }
}

export function evaluateIncidents(
  scenario: ScenarioDefinition,
  state: SimulationState,
  random: RandomSource,
): SimulationState {
  let nextState = state

  for (const event of scenario.events) {
    if (
      !prerequisitesMet(event.prerequisites, scenario) ||
      !isOffCooldown(nextState, event.id, event.cooldownTurns)
    ) {
      continue
    }
    const score = influenceScore(event.influences, nextState, random)
    if (score < event.threshold) continue

    nextState = applyConsequences(
      scenario,
      nextState,
      event.id,
      event.consequences,
    )
    nextState = {
      ...nextState,
      incidents: {
        ...nextState.incidents,
        [event.id]: {
          lastTriggeredTurn: nextState.turn,
          timesTriggered:
            (nextState.incidents[event.id]?.timesTriggered ?? 0) + 1,
        },
      },
      history: [
        ...nextState.history,
        {
          id: `${event.id}:${nextState.turn}`,
          turn: nextState.turn,
          kind: 'event',
          title: event.title,
          detail: event.description,
        },
      ],
    }
  }

  if (nextState.pendingDilemma) return nextState

  for (const dilemma of scenario.dilemmas) {
    if (
      !prerequisitesMet(dilemma.prerequisites, scenario) ||
      !isOffCooldown(nextState, dilemma.id, dilemma.cooldownTurns)
    ) {
      continue
    }
    const score = influenceScore(dilemma.influences, nextState, random)
    if (score < dilemma.threshold) continue

    return {
      ...nextState,
      pendingDilemma: {
        dilemmaId: dilemma.id,
        triggeredTurn: nextState.turn,
      },
      incidents: {
        ...nextState.incidents,
        [dilemma.id]: {
          lastTriggeredTurn: nextState.turn,
          timesTriggered:
            (nextState.incidents[dilemma.id]?.timesTriggered ?? 0) + 1,
        },
      },
    }
  }

  return nextState
}


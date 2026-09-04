import { exampleScenario } from '../../src/scenarios/example/index'
import { initializeScenario } from '../../src/simulation/index'
import { projectNodeEffects } from '../../src/ui/panels/projectNodeEffects'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function runNodeEffectProjectionTests() {
  const initial = initializeScenario(exampleScenario)
  const tensionEffects = projectNodeEffects(
    'governance-tension',
    exampleScenario,
    initial,
  )

  assert(
    tensionEffects.incoming.length === 2,
    'A Situation should list both default and node incoming Effects',
  )
  assert(
    tensionEffects.outgoing.length === 1,
    'A Situation should list its outgoing Effect separately',
  )
  assert(
    tensionEffects.incoming.some((effect) => effect.relatedName === 'Default pressure'),
    'The default source should have a player-readable name',
  )

  const inactiveOutgoing = tensionEffects.outgoing[0]
  assert(
    inactiveOutgoing.contributionLabel === '0.000' &&
      inactiveOutgoing.contributionTone === 'neutral',
    'Missing active contribution should remain neutral',
  )

  const stateWithNegativeContribution = {
    ...initial,
    effects: {
      ...initial.effects,
      'centralization-to-localists': {
        ...initial.effects['centralization-to-localists'],
        lastContribution: -0.2,
      },
    },
  }
  const centralizationEffects = projectNodeEffects(
    'centralization',
    exampleScenario,
    stateWithNegativeContribution,
  )
  const delayedEffect = centralizationEffects.outgoing.find(
    (effect) => effect.id === 'centralization-to-localists',
  )
  assert(
    delayedEffect?.inertiaTurns === 2,
    'Configured Effect inertia should be projected',
  )
  assert(
    delayedEffect?.contributionTone === 'negative',
    'Negative contributions should retain their sign for presentation',
  )

  const trustEffects = projectNodeEffects(
    'leadership-trust',
    exampleScenario,
    initial,
  )
  assert(
    trustEffects.outgoing.some((effect) => effect.relatedName === 'Authority'),
    'Effects connected to hidden nodes should remain visible in the modal',
  )
}

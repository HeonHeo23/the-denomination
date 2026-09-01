import { exampleScenario } from '../../src/scenarios/example/index'
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  validateScenario,
  type ScenarioDefinition,
} from '../../src/simulation/index'

const zeroRandom = { next: () => 0 }

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function closeTo(actual: number, expected: number, message: string) {
  assert(Math.abs(actual - expected) < 0.000001, `${message}: ${actual} !== ${expected}`)
}

assert(validateScenario(exampleScenario).length === 0, 'Example Scenario must validate')

const initial = initializeScenario(exampleScenario)
assert(
  initial.nodes['governance-tension'].activation === 'inactive',
  'Governance Tension should start inactive',
)
assert(
  initial.nodes['governance-tension'].value > 0,
  'An inactive Situation must still evaluate incoming Effects',
)
closeTo(
  initial.effects['tension-to-trust'].lastContribution,
  0,
  'An inactive source must not exert outgoing Effects',
)

const first = advanceTurn(exampleScenario, initial, zeroRandom).state
const second = advanceTurn(exampleScenario, first, zeroRandom).state
closeTo(
  first.nodes['governance-reach'].value,
  second.nodes['governance-reach'].value,
  'Persistent Effects must not accumulate every turn',
)

const reversedScenario: ScenarioDefinition = {
  ...exampleScenario,
  effects: [...exampleScenario.effects].reverse(),
}
let normalOrder = initializeScenario(exampleScenario)
let reverseOrder = initializeScenario(reversedScenario)
for (let index = 0; index < 3; index += 1) {
  normalOrder = advanceTurn(exampleScenario, normalOrder, zeroRandom).state
  reverseOrder = advanceTurn(reversedScenario, reverseOrder, zeroRandom).state
}
for (const node of exampleScenario.nodes) {
  closeTo(
    normalOrder.nodes[node.id].value,
    reverseOrder.nodes[node.id].value,
    `Effect declaration order changed ${node.id}`,
  )
}

const formationChange = executeCommand(exampleScenario, initial, {
  type: 'set-stance',
  stanceId: 'clergy-formation',
  value: 0.4,
})
assert(formationChange.accepted, 'A permitted Stance change should succeed')
const afterFormationChange = advanceTurn(
  exampleScenario,
  formationChange.state,
  zeroRandom,
).state
assert(
  afterFormationChange.nodes['clergy-quality'].value < initial.nodes['clergy-quality'].value,
  'Inertia should begin moving the target toward the new contribution',
)
assert(
  afterFormationChange.nodes['clergy-quality'].value > 0.44,
  'Inertia should not apply the full change immediately',
)

let crisisState = initial
for (const value of [0.75, 0.95, 1]) {
  const change = executeCommand(exampleScenario, crisisState, {
    type: 'set-stance',
    stanceId: 'centralization',
    value,
  })
  assert(change.accepted, `Centralization change to ${value} should succeed`)
  crisisState = change.state
}
for (let index = 0; index < 5 && !crisisState.pendingDilemma; index += 1) {
  crisisState = advanceTurn(exampleScenario, crisisState, zeroRandom).state
}
assert(
  crisisState.nodes['governance-tension'].activation === 'active',
  'Situation should activate at its start threshold',
)
assert(crisisState.pendingDilemma, 'Governance Tension should trigger its Dilemma')

const blockedTurn = advanceTurn(exampleScenario, crisisState, zeroRandom)
assert(!blockedTurn.advanced, 'A pending Dilemma should pause turn advancement')

const authorityBeforeChoice = crisisState.nodes.authority.value
const resolution = executeCommand(exampleScenario, crisisState, {
  type: 'resolve-dilemma',
  dilemmaId: 'local-resistance',
  choiceId: 'mediate',
})
assert(resolution.accepted, 'A defined Dilemma choice should resolve')
assert(!resolution.state.pendingDilemma, 'Resolved Dilemma should no longer be pending')
assert(
  resolution.state.nodes.authority.value < authorityBeforeChoice,
  'A Resource consequence should be applied immediately',
)
assert(resolution.state.grudges.length === 1, 'The choice should create one Grudge')

const magnitude = resolution.state.grudges[0].magnitude
const afterDecay = advanceTurn(exampleScenario, resolution.state, zeroRandom).state
assert(
  Math.abs(afterDecay.grudges[0].magnitude) < Math.abs(magnitude),
  'A Grudge should decay after contributing to a turn',
)

console.log('Engine checks passed: 15 assertions across core MVP mechanics.')

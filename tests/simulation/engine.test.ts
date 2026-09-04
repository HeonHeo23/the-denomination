import { exampleScenario } from '../../src/scenarios/example/index'
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  validateScenario,
  type GrudgeRuntimeState,
  type ScenarioDefinition,
} from '../../src/simulation/index'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function closeTo(actual: number, expected: number, message: string) {
  assert(Math.abs(actual - expected) < 0.000001, `${message}: ${actual} !== ${expected}`)
}

assert(validateScenario(exampleScenario).length === 0, 'Example Scenario must validate')

const initial = initializeScenario(exampleScenario)
assert(
  !initial.nodes['governance-tension'].isActive,
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

const first = advanceTurn(exampleScenario, initial).state
const second = advanceTurn(exampleScenario, first).state
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
  normalOrder = advanceTurn(exampleScenario, normalOrder).state
  reverseOrder = advanceTurn(reversedScenario, reverseOrder).state
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
const afterFormationChange = advanceTurn(exampleScenario, formationChange.state).state
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
for (let index = 0; index < 5; index += 1) {
  crisisState = advanceTurn(exampleScenario, crisisState).state
}
assert(
  crisisState.nodes['governance-tension'].isActive,
  'Situation should activate at its start threshold',
)

const grudge: GrudgeRuntimeState = {
  id: 'test-grudge',
  label: 'Temporary test effect',
  target: 'leadership-trust',
  magnitude: -0.12,
  decay: 0.86,
  createdTurn: initial.turn,
}
const magnitude = grudge.magnitude
const afterDecay = advanceTurn(exampleScenario, {
  ...initial,
  grudges: [grudge],
}).state
assert(
  Math.abs(afterDecay.grudges[0].magnitude) < Math.abs(magnitude),
  'A Grudge should decay after contributing to a turn',
)

console.log('Engine checks passed across core MVP mechanics.')

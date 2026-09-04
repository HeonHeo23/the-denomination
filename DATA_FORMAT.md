# Data Format

This document is authoritative for the intended canonical representation of
Scenario and game-content data. Mechanical meaning belongs to
`GAME_DESIGN.md`; software ownership and loading belong to
`ARCHITECTURE.md`.

The canonical format is declarative and JSON-compatible. TypeScript types may
describe and validate it, but authored content MUST NOT contain functions,
classes, React elements, or runtime object references.

## Conventions

- Property names use `camelCase`; enum values and IDs use `kebab-case`.
- IDs are stable, unique within their namespace, and are used for all
  references.
- Reserved pseudo-source IDs begin with `_`; authored node IDs MUST NOT.
- Omitted arrays normalize to empty arrays only where this document says they
  are optional.
- Definitions are immutable after loading.
- Unknown fields are validation errors unless a later schema version permits
  them.

## Scenario

Scenario is the sole top-level playable content object:

```ts
interface ScenarioDefinition {
  schemaVersion: 1
  id: string
  title: string
  description: string
  start: {
    turn: number
    year?: number
  }
  conditions?: string[]
  nodes: NodeDefinition[]
  effects: EffectDefinition[]
  events?: EventDefinition[]
  dilemmas?: DilemmaDefinition[]
}
```

`conditions` is the set of static categorical facts true for this Scenario.
Required conditions on content use `requires`. This naming replaces the MVP's
ambiguous use of `prerequisites` for both provided and required tags.

`schemaVersion` versions the representation, not game balance or saved
runtime state.

## Nodes

All node definitions share:

```ts
type Activation = 'active' | 'inactive' | 'forced-active'

interface NumericDomain {
  min: number
  max: number
  clamp: boolean
}

interface InitialNodeState {
  value: number
  activation: Activation
}

interface BaseNodeDefinition {
  id: string
  type: 'stance' | 'indicator' | 'faction' | 'resource' | 'situation'
  name: string
  description: string
  category?: NodeCategory
  domain: NumericDomain
  initial: InitialNodeState
  baseline?: number
  graphVisible?: boolean
  requires?: string[]
}
```

`initial.value` is authoritative at turn zero. `baseline`, where present, is
the underlying term used by persistent-state calculation after initialization;
it is not an alternate initial value. If omitted, it defaults to
`initial.value`. Resource baseline behavior beyond the current MVP is still a
design TBD.

`graphVisible` defaults to `true` and affects only presentation. A hidden node
remains a normal simulation participant.

`requires` contains static Scenario conditions. Dynamic expressions are not
supported.

### Categories

```ts
type NodeCategory =
  | 'Governance'
  | 'Belief and Teaching'
  | 'Worship and Practice'
  | 'Finance and Assets'
  | 'Care and Charity'
  | 'Mission and Expansion'
```

Categories are organizational metadata and have no implicit mechanics.

### Stance

```ts
interface StanceDefinition extends BaseNodeDefinition {
  type: 'stance'
  control:
    | { kind: 'continuous'; step?: number }
    | {
        kind: 'discrete'
        states: Array<{ value: number; label: string }>
      }
  cost?: {
    resourceId: string
    base: number
    perPoint: number
    maxChange?: number
  }
}
```

Discrete state values must be unique and within the Stance domain. A cost's
`resourceId` must reference a Resource. `maxChange` limits one action, not the
number of actions in a turn.

Named range labels and incompatible-Stance data are not canonical fields until
their deferred mechanics are specified.

### Indicator

```ts
interface IndicatorDefinition extends BaseNodeDefinition {
  type: 'indicator'
  initial: InitialNodeState & { activation: 'forced-active' }
}
```

### Faction

```ts
interface FactionDefinition extends BaseNodeDefinition {
  type: 'faction'
  valueMeaning: string
}
```

`valueMeaning` defines the content-specific interpretation of the scalar.

### Resource

```ts
interface ResourceDefinition extends BaseNodeDefinition {
  type: 'resource'
  initial: InitialNodeState & { activation: 'forced-active' }
}
```

Resources use the same domain, initial state, baseline, visibility, and Effect
references as other nodes.

### Situation

```ts
interface SituationDefinition extends BaseNodeDefinition {
  type: 'situation'
  startThreshold: number
  stopThreshold: number
}
```

Both thresholds must lie within the Situation domain, and `stopThreshold` must
not exceed `startThreshold`.

## Effects

```ts
type EffectSource = string | '_default_'

interface EffectDefinition {
  id: string
  source: EffectSource
  target: string
  response: ResponseDefinition
  inertiaTurns?: number
  label?: string
}
```

`source` and `target` are node IDs except that `_default_` is the reserved
constant/default source. `inertiaTurns` is a positive integer and defaults to
`1`.

The current canonical response shapes are:

```ts
type ResponseDefinition =
  | { kind: 'constant'; value: number }
  | { kind: 'linear'; coefficient: number; intercept?: number }
  | {
      kind: 'power'
      coefficient: number
      exponent: number
      intercept?: number
    }
  | {
      kind: 'product'
      coefficient: number
      factors: string[]
      intercept?: number
    }
```

These tagged objects keep content inspectable and validateable. Their complete
evaluation semantics, especially constant responses attached to node sources
and contextual-factor activation, remain a game-design TBD. Do not add an
arbitrary expression language or executable callbacks until those semantics
are settled. Every `product.factors` entry must reference a node.

## Incidents

Events and Dilemmas share trigger fields:

```ts
interface IncidentInfluence {
  source: string | '_random_'
  coefficient: number
  intercept?: number
}

interface BaseIncidentDefinition {
  id: string
  title: string
  description: string
  influences: IncidentInfluence[]
  threshold: number
  cooldownTurns: number
  requires?: string[]
}
```

`_random_` is the reserved injected-random source. `cooldownTurns` is a
positive integer. Influence sources other than `_random_` must reference
nodes.

The format declares candidates and their thresholds. It does not encode the
still-TBD policy for selecting one incident when multiple candidates qualify.

### Event

```ts
interface EventDefinition extends BaseIncidentDefinition {
  kind: 'event'
  consequences: ConsequenceDefinition[]
}
```

### Dilemma

```ts
interface DilemmaDefinition extends BaseIncidentDefinition {
  kind: 'dilemma'
  choices: Array<{
    id: string
    label: string
    description: string
    consequences: ConsequenceDefinition[]
  }>
}
```

Choice IDs are unique within their Dilemma. A Dilemma has at least two choices.

## Consequences and Grudge creation

```ts
type ConsequenceDefinition =
  | {
      kind: 'grudge'
      target: string
      magnitude: number
      decay: number
      label: string
    }
  | {
      kind: 'resource'
      target: string
      amount: number
    }
  | {
      kind: 'activation'
      target: string
      active: boolean
    }
```

Rules:

- every target references an existing node;
- a `resource` consequence targets a Resource;
- a Grudge decay factor is greater than `0` and at most `1`;
- `activation` cannot deactivate a forced-active node;
- the definition creates a Grudge; generated identity, creation turn, and
  current magnitude belong to runtime state.

No generic permanent node-value consequence is defined. Adding one would
require game-design approval.

## Static definition versus runtime state

Static definition data describes what may happen and the authoritative starting
conditions. Runtime state records what has happened:

| Static content | Runtime state |
|---|---|
| Node domain, metadata, baseline, initial state | Current value and activation |
| Effect source, target, response, Inertia window | Source-value history and last contribution |
| Grudge consequence template | Created Grudge identity, current magnitude, creation metadata |
| Incident influences, threshold, cooldown | Last trigger turn and trigger count |
| Dilemma choices | Pending Dilemma |
| Scenario start | Current turn and year |

A runtime snapshot is not Scenario content and must not be merged back into its
definition. A save format may reuse runtime structures but requires its own
version and compatibility rules.

## Overrides

Scenario overrides are allowed by the game design in principle but their scope
and merge behavior are TBD. Version 1 therefore has no generic `overrides`
field. Authors must provide the complete effective definition in the Scenario.
Do not invent inheritance, patch ordering, or deep-merge behavior.

## Validation

A Scenario is accepted only if:

- its schema version is supported;
- all required fields are present and finite numeric fields are valid;
- IDs are unique in their applicable namespaces;
- all references resolve to compatible definitions;
- initial values and baselines lie within their domains;
- forced-active requirements are respected;
- Situation thresholds and discrete Stance states are valid;
- Inertia and cooldown values are positive integers;
- condition and `requires` tags are valid identifiers;
- incident, choice, and consequence constraints above hold.

Validation produces content-path diagnostics and completes before runtime
initialization. TypeScript's `satisfies` operator is useful author feedback but
does not replace runtime validation for parsed content.

## Example

```ts
{
  schemaVersion: 1,
  id: 'connectional-fellowship-1980',
  title: 'The Connectional Fellowship',
  description: 'A growing fellowship under institutional strain.',
  start: { turn: 0, year: 1980 },
  conditions: ['has-seminary'],
  nodes: [
    {
      id: 'clergy-formation',
      type: 'stance',
      name: 'Clergy Formation',
      description: 'Required rigor and investment.',
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.6, activation: 'forced-active' },
      control: { kind: 'continuous', step: 0.05 },
      requires: ['has-seminary']
    },
    {
      id: 'clergy-quality',
      type: 'indicator',
      name: 'Clergy Quality',
      description: 'Preparation and effectiveness.',
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.57, activation: 'forced-active' },
      baseline: 0.18
    }
  ],
  effects: [
    {
      id: 'formation-to-quality',
      source: 'clergy-formation',
      target: 'clergy-quality',
      response: { kind: 'linear', coefficient: 0.65 },
      inertiaTurns: 3
    }
  ]
}
```

## MVP migration

The MVP representation is close to the intended contract, but migration is
required:

| MVP | Intended format |
|---|---|
| no schema version | `schemaVersion: 1` |
| `startingTurn`, `startingYear` | `start.turn`, `start.year` |
| `initialValue`, `activation` | `initial.value`, `initial.activation` |
| `baselineValue` | `baseline` |
| Scenario `prerequisites` | Scenario `conditions` |
| content `prerequisites` | content `requires` |
| required empty event/dilemma arrays | optional arrays normalized to empty |
| prerequisites only on Stances/incidents | `requires` available to eligible content, including Situations |

The MVP's node, Effect, response, incident, and consequence discriminators are
otherwise useful and should be retained. Migration should be performed at the
content boundary and accompanied by validation updates; the engine should
consume one normalized representation.

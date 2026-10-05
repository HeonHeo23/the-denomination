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
  schemaVersion: 3;
  id: string;
  title: string;
  description: string;
  start: {
    turn: number;
    year?: number;
  };
  conditions?: string[];
  factionMetrics?: FactionMetricDefinition[];
  factionGroups?: FactionGroupDefinition[];
  constraints?: SumConstraintDefinition[];
  nodes: NodeDefinition[];
  effects: EffectDefinition[];
  events?: EventDefinition[];
  dilemmas?: DilemmaDefinition[];
  gameOvers?: GameOverDefinition[];
  historicalActors: HistoricalActorDefinition[];
  completion: CompletionDefinition;
}
```

`gameOvers` is optional and normalizes to an empty array. A Scenario without
Game Overs has no terminal-loss trajectory.

`conditions` is the set of static categorical facts true for this Scenario.
Required conditions on content use `requires`. This naming replaces the MVP's
ambiguous use of `prerequisites` for both provided and required tags.

`schemaVersion` versions the representation, not game balance or saved
runtime state.

```ts
type HistoricalActorDefinition = {
  id: string;
  name: string;
  role: string;
  description: string;
};
type EndingNarrative = { id: string; title: string; narrative: string };
type EndingDefinition = EndingNarrative & {
  priority: number;
  prerequisiteGroups: PrerequisiteGroupDefinition[];
};
interface CompletionDefinition {
  prerequisiteGroups: Array<
    PrerequisiteGroupDefinition & { description: string }
  >;
  endings: EndingDefinition[];
  fallbackEnding: EndingNarrative;
  reportNodeIds: string[];
}
```

Actors require all four fields. Completion groups are non-empty and require
descriptions; endings, actors, and report nodes may be empty. IDs are unique;
the fallback shares the ending namespace. Priorities are integers (higher wins;
ID breaks ties). Prerequisites use the shared validation rules.

Runtime Dilemmas store the latest resolved turn and choice; ending outcomes store
the ending, turn, matched trigger/group IDs, and fallback flag. An ending turn
must follow any recorded Dilemma resolution turn. Versions remain
unchanged; old content and saves missing required fields fail validation.

## Nodes

All nodes, including individual Faction metrics, share numeric fields:

```ts
interface NumericDomain {
  min: number;
  max: number;
  clamp: boolean;
}

interface InitialNodeState {
  value: number;
  isActive: boolean;
  isForced: boolean;
}

interface BaseNodeDefinition {
  id: string;
  type: "stance" | "indicator" | "faction" | "resource" | "situation";
  name: string;
  description: string;
  category?: NodeCategory;
  domain: NumericDomain;
  initial: InitialNodeState;
  baseline?: number;
  graphVisible?: boolean;
  requires?: string[];
}
```

`initial.value` sets the turn-zero value. For non-Resources, `baseline`,
where present, is the underlying term used by persistent-state calculation;
if omitted, it defaults to `initial.value`. Resources do not permit `baseline`:
their `initial.value` is the starting balance, clamped when the domain enables it.

`isActive` controls participation; `isForced` prevents normal deactivation.

`graphVisible` defaults to `true` and affects only presentation. A hidden node
remains a normal simulation participant.

`requires` contains static Scenario conditions. Dynamic expressions are not
supported.

### Categories

```ts
type NodeCategory =
  | "Governance"
  | "Belief and Teaching"
  | "Worship and Practice"
  | "Finance and Assets"
  | "Care and Charity"
  | "Mission and Expansion";
```

Categories are organizational metadata and have no implicit mechanics.

### Stance

```ts
interface StanceDefinition extends BaseNodeDefinition {
  type: "stance";
  control:
    | { kind: "continuous"; step?: number }
    | {
        kind: "discrete";
        states: Array<{ value: number; label: string }>;
      };
  cost?: {
    resourceId: string;
    base: number;
    perPoint: number;
    maxChange?: number;
  };
  enactmentCost?: { resourceId: string; amount: number };
  repealCost?: { resourceId: string; amount: number };
}
```

Discrete state values must be unique and within the Stance domain. Every cost's
`resourceId` must reference a Resource. `maxChange` limits one active-Stance
change action, not the number of actions in a turn. `enactmentCost` and
`repealCost` are optional fixed costs; an omitted transition cost permits that
transition without a Resource debit.

Version 3 Stances do not define a separate target position, implementation
progress, or minister-like actor/assignment. Those belong to a deferred design
direction for gradual Stance implementation. Do not add ad hoc fields for that
system; its authored and runtime representation must be specified and
versioned after the mechanics are settled.

Named range labels and incompatible-Stance data are not canonical fields until
their deferred mechanics are specified.

### Indicator

```ts
interface IndicatorDefinition extends BaseNodeDefinition {
  type: "indicator";
  initial: InitialNodeState & { isActive: true; isForced: true };
}
```

### Faction

```ts
type FactionCategory =
  "theological" | "demographic" | "geographic" | "institutional";
interface FactionDefinition extends BaseNodeDefinition {
  type: "faction";
  factionCategory: FactionCategory;
  constraintId?: string;
  graphVisible?: true;
  initial: InitialNodeState & { isActive: true; isForced: true };
}
type FactionMetricDefinition = { id: string; label: string };
type FactionGroupDefinition = {
  id: string;
  name: string;
  description: string;
  metrics: Record<string, string>;
};
type SumConstraintDefinition = {
  id: string;
  kind: "sum-limit";
  maxTotal: number;
  name?: string;
};
```

Scenarios define an ordered catalog of Faction metrics and named groups. Each group maps every metric to its own node, so the simulation stores ordinary numeric values while the UI presents related metrics together. Optional sum-limit constraints cap the combined values of selected metrics.

### Resource

```ts
interface ResourceDefinition extends BaseNodeDefinition {
  type: "resource";
  baseline?: never;
  initial: InitialNodeState & { isActive: true; isForced: true };
}
```

Resources share the common domain and Effect references and have no baseline.
Runtime state stores the balance in `value` and per-turn Effect and Grudge flow
in `netFlow`. Optional domain clamping occurs before Effect sampling; domains
may allow debt or disable clamping.

### Situation

```ts
interface SituationDefinition extends BaseNodeDefinition {
  type: "situation";
  startThreshold: number;
  stopThreshold: number;
}
```

Both thresholds must lie within the Situation domain, and `stopThreshold` must
not exceed `startThreshold`.

## Effects

```ts
type EffectSource = string | "_default_";

interface EffectDefinition {
  id: string;
  source: EffectSource;
  target: string;
  response: ResponseDefinition;
  inertiaTurns?: number;
  label?: string;
}
```

`source` and `target` are node IDs except that `_default_` is the reserved
constant/default source. `inertiaTurns` is a positive integer and defaults to
`1`.

The current canonical response shapes are:

```ts
type ResponseDefinition =
  | { kind: "constant"; value: number }
  | { kind: "linear"; coefficient: number; intercept?: number }
  | {
      kind: "power";
      coefficient: number;
      exponent: number;
      intercept?: number;
    }
  | {
      kind: "product";
      coefficient: number;
      factors: string[];
      intercept?: number;
    };
```

These tagged objects keep content inspectable and validateable. Their complete
evaluation semantics, especially constant responses attached to node sources
and contextual-factor activation, remain a game-design TBD. Do not add an
arbitrary expression language or executable callbacks until those semantics
are settled. Every `product.factors` entry must reference a node.

All numeric references, including Faction metrics, use node IDs directly.
Legacy metric selectors and nested Faction values are rejected.

## Runtime prerequisites

Runtime prerequisites are reusable predicates over canonical runtime state. They
are distinct from static `requires` tags.

```ts
type PrerequisiteDefinition =
  | {
      kind: "node-value";
      nodeId: string;
      comparison: "at-most" | "at-least";
      value: number;
    }
  | { kind: "node-activation"; nodeId: string; active: boolean }
  | { kind: "turn"; atTurn: number }
  | { kind: "event"; eventId: string }
  | { kind: "dilemma-choice"; dilemmaId: string; choiceId?: string }
  | { kind: "situation-resolved"; nodeId: string };

interface PrerequisiteGroupDefinition {
  id: string;
  title: string;
  description?: string;
  allOf: PrerequisiteDefinition[];
}
```

Every `nodeId` must resolve. A node-value threshold must lie within its node's
domain. A group contains at least one prerequisite. IDs are unique within the
consumer that owns the groups. Turn thresholds are integers after `start.turn`.
Event and Dilemma references (including optional choices) must resolve;
`situation-resolved` must reference a Situation active in retained history but
inactive now. Groups are alternatives; their predicates are conjunctive.
Completion group IDs remain `matchedTriggerIds` in ending outcomes.

## Game Overs

```ts
interface GameOverDefinition {
  id: string;
  title: string;
  prerequisiteGroups: PrerequisiteGroupDefinition[];
  terminalAfterTurns: number;
  stages: GameOverStageDefinition[];
  recovery?: {
    title: string;
    description: string;
    consequences?: ConsequenceDefinition[];
  };
  report: { title: string; narrative: string };
}

interface GameOverStageDefinition {
  id: string;
  atTurn: number;
  title: string;
  description: string;
  consequences?: ConsequenceDefinition[];
}
```

Game Over IDs are unique within a Scenario. `terminalAfterTurns` is an integer
of at least `2`. Stage IDs and `atTurn` values are unique within a trajectory;
stage turns are positive and less than the terminal duration, and every
trajectory has a warning stage at turn `1`. Omitted consequence arrays normalize
to empty arrays. Stage declaration order has no meaning; trusted content sorts
stages by `atTurn`.

## Incidents

Events and Dilemmas share trigger fields:

```ts
interface IncidentInfluence {
  source: string | "_random_";
  coefficient: number;
  intercept?: number;
}

interface BaseIncidentDefinition {
  id: string;
  title: string;
  description: string;
  influences: IncidentInfluence[];
  threshold: number;
  cooldownTurns: number;
  requires?: string[];
}
```

`_random_` is the reserved injected-random source. `cooldownTurns` is a
positive integer. Influence sources other than `_random_` must reference
nodes.

The format declares candidates and their thresholds. One qualifying Dilemma
is selected randomly from the shared snapshot using the same random value as
incident influences; all qualifying Events resolve from that snapshot in Event
ID order.
Dilemma declaration order has no selection meaning.

### Event

```ts
interface EventDefinition extends BaseIncidentDefinition {
  kind: "event";
  consequences: ConsequenceDefinition[];
}
```

### Dilemma

```ts
interface DilemmaDefinition extends BaseIncidentDefinition {
  kind: "dilemma";
  choices: Array<{
    id: string;
    label: string;
    description: string;
    consequences: ConsequenceDefinition[];
  }>;
}
```

Choice IDs are unique within their Dilemma. A Dilemma has at least two choices.

## Reusable consequences and Grudge creation

```ts
type ConsequenceDefinition =
  | {
      kind: "grudge";
      target: string;
      magnitude: number;
      decay: number;
      label: string;
    }
  | {
      kind: "resource";
      target: string;
      amount: number;
    }
  | {
      kind: "activation";
      target: string;
      active: boolean;
    };
```

Rules:

- every target references an existing node;
- a `resource` consequence targets a Resource;
- a Grudge decay factor is greater than `0` and at most `1`;
- `activation` cannot deactivate a node whose initial or runtime state is forced;
- the definition creates a Grudge; generated identity, creation turn, and
  current magnitude belong to runtime state.

No generic permanent node-value consequence is defined. Adding one would
require game-design approval.

These definitions are shared content contracts. Game Over stages and recovery
occurrences, Dilemma choices, and Events execute them.

## Static definition versus runtime state

Static definition data describes what may happen and the authoritative starting
conditions. Runtime state records what has happened:

| Static content              | Runtime state                                                         |
| --------------------------- | --------------------------------------------------------------------- |
| Scenario identity and start | `scenarioId`, `turn`, optional `year`                                 |
| Nodes                       | `nodes`: activation and numeric values; Resource balance and flow      |
| Effects                     | `effects`: source history and last contribution                       |
| Grudge templates            | `grudges`: IDs, targets/metrics, magnitude, decay, creation turn      |
| Events                      | `events`: last trigger turn and count                                 |
| Dilemmas and choices        | `dilemmas`: trigger/resolution state; `pendingDilemmaIds`: queued IDs |
| Game Overs and Endings      | `gameOverProgress`: episode/matched groups; `outcome`: result or null |
| Histories                   | `history`: occurrences; `nodeValueHistory`: turn-keyed node readings  |

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
- non-Resource initial values and baselines lie within their domains;
- Resource initial values are finite and are clamped when their domain enables it;
- separate activation and forced-state requirements are respected;
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
  schemaVersion: 3,
  id: 'connectional-fellowship-1980',
  title: 'The Connectional Fellowship',
  description: 'A growing fellowship under institutional strain.',
  start: { turn: 0, year: 1980 },
  historicalActors: [],
  completion: { prerequisiteGroups: [{ id: 'review',
    title: 'Institutional review', description: 'Review two decades of ministry.',
    allOf: [{ kind: 'turn', atTurn: 20 }] }],
    endings: [], fallbackEnding: { id: 'preservation', title: 'Preservation',
      narrative: 'The fellowship passes its commitments to a new period of leadership.' },
    reportNodeIds: ['clergy-quality'] },
  conditions: ['has-seminary'],
  nodes: [
    {
      id: 'clergy-formation',
      type: 'stance',
      name: 'Clergy Formation',
      description: 'Required rigor and investment.',
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.6, isActive: true, isForced: true },
      control: { kind: 'continuous', step: 0.05 },
      requires: ['has-seminary']
    },
    {
      id: 'clergy-quality',
      type: 'indicator',
      name: 'Clergy Quality',
      description: 'Preparation and effectiveness.',
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.57, isActive: true, isForced: true },
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

| MVP                                     | Intended format                                                |
| --------------------------------------- | -------------------------------------------------------------- |
| no schema version                       | `schemaVersion: 3`                                             |
| `startingTurn`, `startingYear`          | `start.turn`, `start.year`                                     |
| `initialValue`, activation state        | `initial.value`, `initial.isActive`, `initial.isForced`        |
| `baselineValue`                         | `baseline`                                                     |
| Scenario `prerequisites`                | Scenario `conditions`                                          |
| content `prerequisites`                 | content `requires`                                             |
| required empty event/dilemma arrays     | optional arrays normalized to empty                            |
| prerequisites only on Stances/incidents | `requires` available to eligible content, including Situations |

The MVP's node, Effect, response, incident, and consequence discriminators are
otherwise useful and should be retained. Migration should be performed at the
content boundary and accompanied by validation updates; the engine should
consume one normalized representation.

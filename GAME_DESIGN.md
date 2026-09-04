# Game Design

This document is authoritative for game mechanics and simulation semantics. It
defines behavior, not code structure or content serialization. See
`ARCHITECTURE.md` for software boundaries and `DATA_FORMAT.md` for the canonical
content contract.

## Simulation model

The game is a turn-based causal simulation of a Christian denomination. A
Scenario supplies the complete playable configuration. The player primarily
changes Stances; other persistent state responds through Effects. Events and
Dilemmas are discrete incidents whose consequences may include temporary
Grudges or direct Resource changes.

The persistent simulation has exactly five structural node types:

| Type      | Meaning                                                                       | Default control                                | Default activation |
| --------- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| Stance    | Doctrinal, institutional, governance, or practical position                   | Primarily player-controlled                    | Configurable       |
| Indicator | Continuously simulated measurement                                            | Simulated                                      | Forced active      |
| Faction   | Constituency, movement, tendency, or interest group represented by one scalar | Simulated                                      | Configurable       |
| Resource  | Spendable, accumulable, or constrained capacity                               | Simulated and changed by explicit transactions | Forced active      |
| Situation | Persistent condition that may start and stop                                  | Simulated                                      | Configurable       |

Effects are relationships, Inertia and Grudges are temporal mechanisms, Events
and Dilemmas are incidents, and Scenario is configuration. None is an
additional node type.

### Common node semantics

Every node has a unique identity, type, numeric value, numeric domain, and
activation state. It may also have descriptive and organizational metadata.
Numeric domains define a minimum, maximum, and whether values are clamped;
domains are not necessarily normalized to `0..1`.

The activation states are:

- `active`: participates normally;
- `inactive`: does not exert normal outgoing Effects;
- `forced-active`: participates and cannot normally be deactivated.

Ordinary inactive targets do not receive normal persistent Effect
contributions. An inactive node retains its stored runtime state for possible
reactivation. Situation input evaluation is the exception described below.

Simulation participation and presentation are independent. A node may be
hidden from the primary graph while remaining fully simulated. In particular,
a Resource remains a node even when shown only in a dedicated Resource display.

Thematic categories are non-mechanical metadata. They MUST NOT imply Effects,
activation, update order, numeric meaning, or privileges.

## Node-specific rules

### Stance

Stances are the main direct player-control surface. Ordinary Effects SHOULD NOT
set Stance values; any constraint, forced change, or availability rule must be
explicit.

A Stance is either:

- continuous, allowing values within its domain and optionally suggesting an
  adjustment step; or
- discrete, allowing only its named numeric states.

A Stance may require prerequisites or a Resource cost. The general continuous
change cost is:

```text
cost = base cost + cost per point * absolute value change
```

A cost may also cap the change made by one action. The player may make unlimited
Stance-change actions during a turn while each action is legal and sufficient
Resources remain. An inactive Stance may become active when legally enacted. A
forced-active Stance cannot normally be cancelled.

Mutually incompatible Stances and any conflict-resolution behavior require
explicit content support; there is no universal implicit rule.

### Indicator

Indicators are endogenous, continuously simulated state rather than direct
player choices. They are forced active and may receive or source Effects.

### Faction

A Faction is one scalar simulation node. Its definition MUST state what that
scalar means, such as approval, loyalty, strength, prevalence, influence, or
commitment. The engine MUST NOT assign one universal meaning to all Faction
values. Factions use the general activation rules and may receive or source
Effects.

### Resource

A Resource is a normal simulation node despite having transactional uses or a
different UI. It may source or receive Effects and may be changed directly by
costs or incident consequences. A direct debit or credit changes a balance; it
is not a persistent Effect and MUST NOT be reapplied every turn.

The longer-term interaction between direct balance changes, baselines, and
persistent recalculation is not yet fully specified; see **Deferred decisions**.

### Situation

A Situation has a continuously evaluated pressure or severity value plus
separate start and stop thresholds:

```text
inactive and value >= start threshold  -> active
active   and value <= stop threshold   -> inactive
```

The stop threshold MUST NOT exceed the start threshold. Between unequal
thresholds, the prior activation state is retained; this hysteresis prevents
rapid toggling.

An inactive Situation still receives and evaluates the inputs needed to decide
whether it starts, but it does not exert outgoing Effects. A Situation that
activates during a turn begins exerting outgoing Effects on the following turn.

## Effects

An Effect is a persistent directed causal contribution from one source to one
target. It defines a source, target, response function, and optional Inertia.
A special constant/default source may represent pressure that has no node
source.

For a normal simulated target:

```text
value = underlying baseline
      + active Effect contributions
      + active Grudge contributions
      + other explicitly defined direct modifiers
```

An Effect contribution is recalculated from causal state; it is not permanently
added to the prior target value each turn. An unchanged source therefore yields
an unchanged steady contribution rather than runaway accumulation.

Response functions may be constant, linear, nonlinear, or depend on explicitly
referenced contextual node values. Positive and negative contributions have no
universal moral meaning. The expression representation belongs to
`DATA_FORMAT.md`.

The graph may connect any active node types where content defines a meaningful
relationship. Stances SHOULD NOT normally be targets because their values are
player-controlled. Effect declaration order MUST NOT change the semantic
result.

## Inertia

Inertia delays one Effect's response when its causal input changes. It belongs
to the Effect, not its source or target, so Effects sharing a source may respond
at different rates.

The current required behavior is a moving average of recent source values over
that Effect's configured number of turns. The averaged source value is passed
to the response function. An Effect with no explicit Inertia uses one sample
and therefore responds without added delay.

At Scenario initialization, each Effect's history is seeded across its full
window with the source's authoritative turn-zero value. A stable source thus
starts at its steady contribution. Inertia history is runtime state, not static
content.

Inertia delays an ongoing causal relationship. It is not a Grudge.

## Grudges

A Grudge is a temporary, hidden contribution created by a discrete occurrence.
It is not a node and does not permanently change its target's baseline.

A Grudge has a target, current magnitude, and per-turn decay factor. During a
turn it contributes its current magnitude first, then its magnitude is
multiplied by its decay factor:

```text
next magnitude = contributed magnitude * decay
```

A factor closer to `1` lasts longer; `1` may deliberately represent no decay.
Negligible Grudges should be removed without materially changing gameplay.
Creation metadata may be retained for identity, history, and presentation.

A Grudge represents fading aftermath of an occurrence. It MUST NOT be modeled
as an Effect with large Inertia, and Inertia MUST NOT be modeled as a Grudge.

## Incidents

Events and Dilemmas are evaluated from current persistent state but are not
persistent graph nodes. Their trigger influences may reference nodes, bounded
random input, and prerequisites. Incident influences do not use Effect Inertia.
Cooldown or recurrence controls prevent unintended repeated triggering.

Each influence contributes its intercept plus its coefficient multiplied by its
source value. The contributions are summed into the incident score; an eligible
incident qualifies when that score reaches or exceeds its threshold. A random
influence uses the injected bounded random value as its source.

At most one incident is selected per incident evaluation. When multiple Events
or Dilemmas qualify, including when both kinds qualify, the selection mechanism
is TBD. Declaration order MUST NOT silently become the intended selection rule.

### Event

An Event resolves automatically when selected. Its immediate consequences may
create Grudges, change Resources, or explicitly change allowed activation state.

### Dilemma

A Dilemma requires the player to choose among at least two defined options.
Each choice has its own immediate consequences. A pending Dilemma blocks turn
advancement until resolved.

Temporary incident consequences SHOULD normally use Grudges rather than mutate
an unrelated node's underlying baseline.

## Prerequisites

A prerequisite is a categorical condition controlling eligibility or
availability. It is not a node unless content separately models the same
concept as continuous state.

For the current implementation, prerequisites are static tags supplied by the
Scenario. Dynamic prerequisites are deferred. Prerequisites may gate Stances,
Situations, Events, Dilemmas, or other explicitly defined content.

## Scenario and runtime state

Scenario is the sole top-level playable configuration abstraction. There is no
required Denomination definition above or beside it. A Scenario supplies its
identity and starting time, nodes, Effects, incidents, prerequisites, and all
initial conditions required to start play. Scenario-specific variation may use
explicit overrides once their canonical form is specified.

Static definition data never changes during play. Runtime state includes at
least:

- current turn and optional calendar value;
- current node values and activation;
- current Resource balances;
- per-Effect Inertia history and current contribution;
- active Grudges and their current magnitudes;
- incident cooldown/recurrence state;
- a pending Dilemma, if any;
- player-visible history where retained.

Declared initial node values are authoritative at turn zero. Initialization
MUST NOT replace them with a freshly calculated equilibrium. Persistent Effects
begin recalculating nodes when turn simulation begins; seeded Inertia preserves
the intended starting causal history.

## Turn semantics

Persistent evaluation uses the MVP's synchronous snapshot model. Every target
for a turn is calculated from the same prior persistent-state snapshot. Effects
produced by values or activation established during that evaluation influence
targets on the following turn. This makes Effect results independent of content
declaration order.

The complete ordering among persistent evaluation, Situation transitions,
Grudge decay, incident selection, and immediate consequences remains TBD. The
following partial ordering is authoritative:

- each turn's persistent targets read one shared prior snapshot;
- a newly active Situation exerts outgoing Effects starting next turn;
- a Grudge contributes before it decays for that turn;
- a pending Dilemma prevents another turn from advancing;
- no more than one incident is selected by one incident evaluation.

Randomness may influence explicitly random mechanics, especially incidents. It
should be bounded, causally constrained, and injectable or seedable where
deterministic replay is required. Exact distributions and cadence are not yet
universal mechanics.

## Design invariants

1. The five persistent node types are Stance, Indicator, Faction, Resource,
   and Situation.
2. Resources remain nodes even when omitted from the primary graph.
3. Stances are primarily player-controlled; Indicators are continuously
   simulated; each Faction has content-defined scalar meaning.
4. Situations are persistent nodes with separate start and stop thresholds.
5. Inactive Situations evaluate incoming start pressure but have no outgoing
   contribution.
6. Effects are persistent causal contributions, not per-turn accumulation.
7. Response functions may be nonlinear and context-dependent.
8. Inertia is per Effect and uses that Effect's runtime history.
9. Grudges are temporary decaying contributions created by occurrences.
10. Inertia and Grudges remain distinct mechanisms.
11. Events and Dilemmas are incidents, not nodes.
12. Scenario is the sole top-level playable configuration abstraction.
13. Static definitions and runtime state remain distinct.
14. Graph visibility never determines simulation participation.
15. Effect declaration order does not determine simulation results.
16. Categories are organizational metadata without implicit mechanics.

## Deferred decisions

Do not infer or implement the following until this document is revised:

- the complete within-turn phase order beyond the partial ordering above;
- selection among multiple simultaneously eligible incidents;
- dynamic or state-derived prerequisites;
- the supported scope and merge semantics of Scenario overrides;
- complete Resource accumulation and baseline interaction rules;
- additional response-function semantics, including exact constant-source and
  contextual-input behavior;
- specialized governance procedures such as votes, ratification, vetoes, or
  polity-specific resolution;
- a separate Denomination definition;
- a required multi-attribute Faction model;
- universal incident cadence, probability constants, or random distribution;
- incompatible-Stance resolution beyond explicit supported content;
- any iterative or equilibrium solver replacing synchronous snapshot updates.

Governance concepts currently use the ordinary nodes, Effects, Resources,
Situations, and incidents defined here.

## Reference Model

The simulation is structurally inspired by the causal simulation model exposed by the _Democracy 4_ modding system.

Each relevant section of the reference documentation has one primary
counterpart in this design:

| Reference model section                                                        | Primary counterpart                                       | Correspondence                                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Modding basics](https://www.positech.co.uk/democracy4/modding.html)           | [Simulation model](#simulation-model)                     | Data-defined objects connected by causal Effects                                         |
| [Policies](https://www.positech.co.uk/democracy4/mod_policies.html)            | [Stance](#stance)                                         | Player-controlled positions with values, availability, costs, and outputs                |
| [Dilemmas](https://www.positech.co.uk/democracy4/mod_dilemmas.html)            | [Dilemma](#dilemma)                                       | Triggered incidents resolved by a player choice                                          |
| [Events](https://www.positech.co.uk/democracy4/mod_events.html)                | [Event](#event)                                           | Triggered incidents that resolve automatically                                           |
| [Situations](https://www.positech.co.uk/democracy4/mod_situations.html)        | [Situation](#situation)                                   | Persistent conditions with inputs, outputs, and separate start/stop thresholds           |
| [Simulation values](https://www.positech.co.uk/democracy4/mod_simulation.html) | [Indicator](#indicator)                                   | Continuously simulated values with causal inputs and outputs                             |
| [Countries](https://www.positech.co.uk/democracy4/mod_countries.html)          | [Scenario and runtime state](#scenario-and-runtime-state) | Playable starting configuration, active starting positions, prerequisites, and overrides |

This game is not required to reproduce every _Democracy 4_ rule, data format, balance constant, UI convention, or political-government mechanic.

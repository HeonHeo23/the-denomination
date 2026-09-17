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
- forced active: participates and cannot normally be deactivated.

Authored activation is represented as one of these three states, but runtime
state keeps two separate facts: `isActive` records whether the node currently
participates, while `isForced` records whether ordinary deactivation is
forbidden. The valid runtime combinations are:

| Runtime flags                        | Meaning                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `isActive: true`, `isForced: false`  | Normally active and participating.                                       |
| `isActive: false`, `isForced: false` | Normally inactive and not participating in outgoing Effects.             |
| `isActive: true`, `isForced: true`   | Forced active and participating; normal deactivation cannot turn it off. |

Forced activation is therefore a constraint on deactivation, not a replacement
for the active-state flag. A node can be active without being forced, and
activation participation and graph visibility remain independent concerns.

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

An inactive Stance is enacted at a chosen legal value. Its optional fixed
enactment cost is charged instead of the normal change cost, so enacting at the
stored value is a meaningful action. An active non-forced Stance may be
repealed for its optional fixed repeal cost; repeal preserves its stored value
for a later enactment and never refunds prior costs. Omitted enactment or
repeal costs permit that transition for free.

Identity Stances describe positions constitutive of the denomination and will
normally be authored forced active. Policy Stances describe enacted programs
and will normally be authored with configurable activation. This distinction is
currently descriptive only: activation flags and explicitly authored costs,
rather than a Stance subtype, determine engine behavior.

Under the current rules, a legal Stance change immediately updates that
Stance's stored runtime value. This does not immediately recalculate its
outgoing Effects. Those are evaluated during turn simulation and respond
according to each Effect's Inertia.

Enactment and repeal likewise change activation immediately. An inactive
source contributes zero to its Effect inertia history; enactment therefore
builds through that Effect's configured Inertia while repeal stops normal
outgoing participation when the following turn is evaluated.

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

| Response kind | Contribution equation (`intercept` defaults to `0`)          |
| ------------- | ------------------------------------------------------------ |
| `constant`    | `value`                                                      |
| `linear`      | `intercept + coefficient * source`                           |
| `power`       | `intercept + coefficient * source ** exponent`               |
| `product`     | `intercept + coefficient * source * factor1 * ... * factorN` |

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

The existing `requires` mechanism uses static tags supplied by the Scenario.
Deriving or changing those tags from runtime state remains deferred. Static
requirements may gate Stances, Situations, Events, Dilemmas, or other explicitly
defined content.

Runtime prerequisites are separately authored predicates over canonical node
state. A runtime prerequisite may compare one node value with an inclusive
upper or lower threshold, or require a node to be active or inactive. A named
prerequisite group is a conjunction: every predicate in the group must hold.
Consumers that accept multiple groups treat them as alternatives. Runtime
prerequisites are currently used by Game Over trajectories; their use by other
systems must be explicitly specified rather than inferred.

## Reusable consequences

An authored occurrence may apply reusable immediate consequences. A Resource
consequence changes both its current balance and underlying runtime balance so
the transaction survives later persistent recalculation. A Grudge consequence
creates the temporary contribution described above. An activation consequence
changes ordinary activation but MUST NOT deactivate a forced-active node.

Consequences are applied once for the occurrence that created them. A Grudge
created after a completed turn begins contributing during the following turn.
The same declarative consequence shapes may be consumed by crisis stages,
recoveries, and future incident implementations without giving those systems
identical triggering or ordering semantics.

## Game Overs

A Game Over is a Scenario-authored terminal trajectory, not a persistent node
or an incident. Its prerequisite groups may refer to any Scenario nodes, so the
content can express polity-specific failures through authority, legitimacy,
Faction relationships, Resources, Situations, or other modeled institutional
state.

A trajectory gains one consecutive turn of progress whenever at least one of
its prerequisite groups is satisfied after persistent evaluation. Changing
from one satisfied group to another does not interrupt the trajectory. If no
group is satisfied after progress began, the crisis fully resets and its
optional recovery occurrence is applied once. A later breach begins a new
episode and may recover again.

Each trajectory has a terminal duration of at least two turns and MUST warn the
player on its first qualifying turn. Authored stages before the terminal turn
provide historical narrative and may apply reusable consequences once when
reached. Stage consequences do not retroactively change the qualification that
selected that stage.

When the terminal duration is reached, the runtime records an irreversible
Game Over. If several trajectories become terminal on the same turn, all are
recorded as causes of one outcome. Further player commands and turn advancement
are rejected. Game Over resolution MUST run before any normal Ending resolution
and prevents an Ending from resolving on that turn or afterward.

The final report combines the Scenario's historical narrative with mechanical
evidence: matched prerequisite groups, current node readings, persistence
duration, and relevant Effect and Grudge contributions.

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
- per-trajectory Game Over episode and consecutive-turn progress;
- a terminal Game Over outcome, if reached;
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
- Game Over prerequisites read the post-persistent, post-decay snapshot before
  newly reached stage or recovery consequences are applied;
- Game Over resolution precedes and blocks normal Ending resolution;
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
17. Game Overs are Scenario-authored terminal trajectories, not nodes or incidents.
18. Reusable prerequisites and consequences do not imply shared trigger timing across consumers.

## Deferred decisions

Do not infer or implement the following until this document is revised:

- the complete within-turn phase order beyond the partial ordering above;
- selection among multiple simultaneously eligible incidents;
- runtime-prerequisite use outside explicitly supported consumers;
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
- Stance implementation progress and the minister-like system intended to
  influence it. The future direction is for a chosen Stance position to be
  implemented over time, with its rate affected by minister-like actors or
  offices. This is separate from per-Effect Inertia. The actor model,
  assignments, capabilities, progress formula, Resource/cost timing,
  cancellation or reversal behavior, and persistence rules are unspecified.
  Until those rules are defined, Stance changes remain immediate as described
  above; do not add implementation delay or minister mechanics;
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

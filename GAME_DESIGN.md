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

| Type      | Meaning                                                     | Default control                                | Default activation |
| --------- | ----------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| Stance    | Doctrinal, institutional, governance, or practical position | Primarily player-controlled                    | Configurable       |
| Indicator | Continuously simulated measurement                          | Simulated                                      | Forced active      |
| Faction   | One metric of a categorized constituency                    | Simulated                                      | Forced active      |
| Resource  | Spendable, accumulable, or constrained capacity             | Simulated and changed by explicit transactions | Forced active      |
| Situation | Persistent condition that may start and stop                | Simulated                                      | Configurable       |

Effects are relationships, Inertia and Grudges are temporal mechanisms, Events
and Dilemmas are incidents, and Scenario is configuration. None is an
additional node type.

### Common node semantics

Every node has a unique identity, type, numeric state, numeric bounds, and
activation state. It may also have descriptive and organizational metadata.
Numeric domains define a minimum, maximum, and whether values are clamped;
domains are not necessarily normalized to `0..1`.

| Activation state | `isActive` | `isForced` | Behavior                                                               |
| ---------------- | ---------- | ---------- | ---------------------------------------------------------------------- |
| Active           | `true`     | `false`    | Participates in outgoing Effects; ordinary deactivation is allowed.    |
| Inactive         | `false`    | `false`    | Does not source outgoing Effects; retains its stored state.            |
| Forced active    | `true`     | `true`     | Participates in outgoing Effects; ordinary deactivation is prohibited. |

`isActive` controls participation; `isForced` prevents ordinary deactivation.
A forced node MUST be active.
Inactive nodes receive no normal persistent contributions, except that inactive Situations evaluate inputs needed to start.

Simulation participation and presentation are independent.
A node may be hidden from the primary graph while remaining fully simulated. In particular, a Resource remains a node even when shown only in a dedicated Resource display.

Thematic categories are non-mechanical metadata. They MUST NOT imply Effects, activation, update order, numeric meaning, or privileges.

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

Stance changes and enactment or repeal take effect immediately. Their causal
effects respond during turn simulation and follow their configured Inertia.

Mutually incompatible Stances and any conflict-resolution behavior require
explicit content support; there is no universal implicit rule.

### Indicator

Indicators are endogenous, continuously simulated state rather than direct
player choices. They are forced active and may receive or source Effects.

### Faction

Faction groups identify constituencies; each declared metric has its own
Faction node. Scenario metric labels and ordering are configurable.
Membership and Satisfaction are the bundled metrics, measuring population
share and satisfaction within a group. Groups may overlap freely.

These nodes are always active, forced, and graph-visible. Each has its own
numeric domain, initial value, and optional baseline. They use the ordinary
non-Resource calculation; Effects, Grudges, and runtime prerequisites reference
individual node IDs. Groups have no mutable simulation state.

Explicit sum-limit constraints connect two or more Faction nodes through
an optional constraint ID. Participants have zero-minimum clamped domains and
an initial total within the positive cap. After all Faction metrics are calculated,
scale participants proportionally when their total exceeds the cap. Classification
never implies a constraint. The bundled theological Membership constraints cap
opposing sides at `1`.

#### Movements

Represent temporary campaigns as ordinary Situations, using faction metrics as
inputs and existing thresholds and lifecycle. No separate Movement type exists.

### Resource

A Resource is a simulation node that can also be changed through transactions
and incident consequences. Incoming Effects and Grudges are per-turn flows;
direct costs and consequences change its balance once. At the start of each
turn, clamp the prior balance if its domain requires it, then apply the flows:

```text
balance(start) = applyDomain(balance(previous turn), Resource domain)
netFlow = incoming Effect contributions + active Grudge contributions
balance(after flow) = balance(start) + netFlow
```

Transactions and flows may move the balance beyond its bounds until the next
turn. Resources have no baseline.

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

An Effect is a persistent causal contribution from one source to one target.
Its response may use a constant source. Faction relationships reference the
individual Faction node.

For a non-Resource simulated target:

```text
value = underlying baseline
      + active Effect contributions
      + active Grudge contributions
      + other explicitly defined direct modifiers
```

An Effect contribution is recalculated from causal state. For non-Resource
targets it is not permanently added to the prior target value. For Resources,
the contribution is a flow added to stock each turn.

Response functions may be constant, linear, nonlinear, or contextual. Their
contribution equations (`intercept` defaults to `0`) are:

| Response kind | Contribution                                                 |
| ------------- | ------------------------------------------------------------ |
| `constant`    | `value`                                                      |
| `linear`      | `intercept + coefficient * source`                           |
| `power`       | `intercept + coefficient * source ** exponent`               |
| `product`     | `intercept + coefficient * source * factor1 * ... * factorN` |

Positive and negative contributions have no universal moral meaning. The
canonical content shapes are defined in `DATA_FORMAT.md`.

The graph may connect any active node types where content defines a meaningful
relationship. Stances SHOULD NOT normally be targets because their values are
player-controlled. Effect declaration order MUST NOT change the semantic
result.

## Inertia

Inertia belongs to an individual Effect. It averages that Effect's recent
source values over its configured window, then passes the average to the
response function. After a source changes, the contribution approaches its new
level gradually; a longer window slows the response. Effects sharing a source
may respond at different rates. Without Inertia, an Effect responds to the
current source value.

## Incidents

Events and Dilemmas are incidents evaluated from persistent state. Their trigger
scores combine authored influences and may include bounded random input.
Cooldowns or recurrence limits prevent unintended repetition.

Each influence contributes its source value scaled by a coefficient, plus any
intercept. Sum the influences into a trigger score. An incident qualifies when
its prerequisites hold and the score reaches its threshold.

Evaluate incidents against one shared turn snapshot. Every qualifying Event
fires once; its consequences do not trigger another incident evaluation that
turn.

### Events

Events resolve automatically when selected. Their immediate consequences may
create Grudges, change Resources, or explicitly change allowed activation state.

### Dilemmas

At most one qualifying Dilemma queues per turn. A Dilemma offers at least two
choices and blocks turn advancement until resolved. Choices apply consequences
immediately; persistent state responds on a later turn. Cooldowns prevent
repeated triggering for their authored duration.

Temporary incident consequences SHOULD normally use Grudges rather than mutate
an unrelated node's underlying baseline.

## Prerequisites

A prerequisite controls eligibility without changing state.

| Form                  | Input                             | Semantics                                                                                                                        |
| --------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Runtime predicate     | Current state or retained history | Checks node value/activation, reached turn, fired Event, latest Dilemma choice, or resolved Situation.                           |
| Group                 | Predicate set                     | All predicates must hold; groups are alternatives.                                                                               |

References MUST resolve; value thresholds are inclusive and within their node's domain. A resolved Situation must have been active before becoming inactive. Dilemma predicates may require a specific choice. Each consumer defines when prerequisites are evaluated.

## Consequences

Occurrences may apply consequences once; they do not change the trigger or
timing of their occurrence:

- **Resource:** change its balance immediately.
- **Grudge:** create a temporary contribution without changing its target's
  baseline. It contributes before decaying; one created after turn evaluation
  first contributes on the next turn.
- **Activation:** change a node's activation. A forced-active node cannot be
  deactivated.

Grudge decay follows:

```text
next magnitude = contributed magnitude * decay
```

## Game Overs

A Game Over is a Scenario-authored terminal trajectory sustained by qualifying
conditions over time. Stages may apply consequences; if conditions break,
recovery applies and a later qualification starts a new episode. Reaching the
terminal duration ends play. Evaluate conditions before stage or recovery
consequences. Simultaneous terminal trajectories form one outcome with multiple
causes. Game Over takes precedence over normal completion.

## Scenario and runtime state

A Scenario defines the denomination's starting conditions and all content needed
for play. Static definitions remain fixed; runtime state changes as turns resolve.
Declared starting values are authoritative and are not replaced with a calculated
equilibrium.

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
- Game Over resolution precedes normal completion;
- pending Dilemmas prevent another turn from advancing;
- at most one qualifying Dilemma is selected from one shared snapshot;

Each Scenario defines completion conditions, prioritized endings, and a
fallback. Check completion after Events; a pending Dilemma delays it. Resolve
the highest-priority qualifying ending, or use the fallback.

Randomness is limited to explicitly random mechanics and bounded inputs. Exact
distributions and cadence are Scenario-specific or deferred.

## Design invariants

1. The persistent node types are Stance, Indicator, Faction, Resource, and
   Situation; Events and Dilemmas are incidents.
2. Faction metrics are nodes grouped by static Scenario metadata; categories classify constituencies.
3. Inactive Situations evaluate start pressure but exert no outgoing Effects.
4. Resources are nodes, and incoming Effects and Grudges are per-turn flows.
5. Effects are independent of declaration order.
6. Graph visibility does not determine simulation participation.
7. Scenarios define play; static definitions and runtime state remain distinct.
8. Game Overs are terminal Scenario trajectories.

## Deferred decisions

Do not infer or implement the following until this document is revised:

- the complete within-turn phase order beyond the partial ordering above;
- runtime-prerequisite use outside explicitly supported consumers;
- the supported scope and merge semantics of Scenario overrides;
- additional response-function semantics, including exact constant-source and
  contextual-input behavior;
- specialized governance procedures such as votes, ratification, vetoes, or
  polity-specific resolution;
- a separate Denomination definition;
- possible party membership and loyalty as organizational affiliation distinct
  from faction Membership, Satisfaction, and temporary Movements;
- universal incident cadence, probability constants, or random distribution;
- incompatible-Stance resolution beyond explicit supported content;
- Stance implementation delays and minister-like mechanics. Stance changes
  remain immediate until those rules are defined;
- any iterative or equilibrium solver replacing synchronous snapshot updates.

Governance concepts currently use the ordinary nodes, Effects, Resources,
Situations, and incidents defined here.

## Reference model

The simulation is structurally inspired by the causal model in _Democracy 4_.
These sections are the closest counterparts:

| Reference model section                                                        | Primary counterpart                                       | Correspondence                                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Modding basics](https://www.positech.co.uk/democracy4/modding.html)           | [Simulation model](#simulation-model)                     | Data-defined objects connected by causal Effects                                         |
| [Policies](https://www.positech.co.uk/democracy4/mod_policies.html)            | [Stance](#stance)                                         | Player-controlled positions with values, availability, costs, and outputs                |
| [Dilemmas](https://www.positech.co.uk/democracy4/mod_dilemmas.html)            | [Dilemma](#dilemmas)                                      | Triggered incidents resolved by a player choice                                          |
| [Events](https://www.positech.co.uk/democracy4/mod_events.html)                | [Event](#event)                                           | Triggered incidents that resolve automatically                                           |
| [Situations](https://www.positech.co.uk/democracy4/mod_situations.html)        | [Situation](#situation)                                   | Persistent conditions with inputs, outputs, and separate start/stop thresholds           |
| [Simulation values](https://www.positech.co.uk/democracy4/mod_simulation.html) | [Indicator](#indicator)                                   | Continuously simulated values with causal inputs and outputs                             |
| [Countries](https://www.positech.co.uk/democracy4/mod_countries.html)          | [Scenario and runtime state](#scenario-and-runtime-state) | Playable starting configuration, active starting positions, prerequisites, and overrides |

The game need not reproduce _Democracy 4_'s rules, format, balance, interface,
or political systems.

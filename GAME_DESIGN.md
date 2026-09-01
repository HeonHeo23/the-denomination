# GAME_DESIGN.md

## 1. Purpose

This document is the authoritative specification of the current game mechanics for the **Democracy-like Christianity Denomination Game**.

It is written primarily for AI coding agents and contributors working in the repository. Its purpose is to define what the game concepts mean and how the simulation is intended to behave so that implementation work does not need to re-derive game-design intent.

This document specifies **game semantics**, not software architecture.

It does not prescribe:

- programming language constructs;
- class or interface hierarchies;
- file or directory layout;
- serialization formats;
- UI framework choices;
- implementation milestones;
- MVP scope;
- testing framework;
- agent workflow instructions.

Those concerns belong in other repository documentation.

When an implementation choice would change the behavior defined here, this document takes precedence as the game-design source of truth.

---

## 2. Normative Language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** indicate the strength of a game-design requirement.

- **MUST / MUST NOT**: required to preserve current game semantics.
- **SHOULD / SHOULD NOT**: expected default behavior unless a scenario explicitly defines an exception.
- **MAY**: permitted but not required by the core design.

Examples and illustrative values explain semantics. They are not automatically required game content.

---

## 3. Reference Model

The simulation is structurally inspired by the causal simulation model exposed by the *Democracy 4* modding system.

Relevant reference documentation:

- https://www.positech.co.uk/democracy4/modding.html
- https://www.positech.co.uk/democracy4/mod_policies.html
- https://www.positech.co.uk/democracy4/mod_dilemmas.html
- https://www.positech.co.uk/democracy4/mod_events.html
- https://www.positech.co.uk/democracy4/mod_situations.html
- https://www.positech.co.uk/democracy4/mod_simulation.html
- https://www.positech.co.uk/democracy4/mod_countries.html

The reference model is used for simulation principles, especially:

- data-driven simulation objects;
- directed effects between objects;
- functional effect equations;
- per-effect inertia;
- player-controlled policy-like objects;
- persistent situations with separate start and stop thresholds;
- event and dilemma influences;
- temporary decaying effects called grudges;
- prerequisites;
- scenario-specific starting state and overrides.

This game is not required to reproduce every *Democracy 4* rule, data format, balance constant, UI convention, or political-government mechanic.

---

# 4. Core Simulation Model

## 4.1 Overview

The game is a turn-based causal simulation of a Christian denomination.

The player directly controls selected doctrinal, institutional, and practical positions. The rest of the denomination evolves through relationships between persistent simulation objects.

The core model is:

```text
Player
  |
  | changes or enacts
  v
Stances
  |
  v
Effect Graph
  |
  +----------------------+
  |                      |
  v                      v
Indicators            Factions
  |                      |
  +----------+-----------+
             |
             v
         Situations
             |
             v
        Other Nodes
```

Resources also participate in the simulation and support player actions.

Events and Dilemmas are discrete incidents driven by current simulation state. Their consequences may create Grudges, which temporarily modify simulation objects and decay over time.

---

## 4.2 Simulation Objects and Mechanisms

The design distinguishes persistent simulation objects from relationships and temporal/discrete mechanisms.

### Persistent node types

There are exactly five core structural node types in the current design:

1. **Stance**
2. **Indicator**
3. **Faction**
4. **Resource**
5. **Situation**

These are structural simulation types, not thematic categories.

### Relationships

- **Effect**: persistent directed causal relationship between simulation objects.

### Temporal mechanisms

- **Inertia**: delayed response attached to an Effect.
- **Grudge**: temporary decaying contribution created by a discrete occurrence.

### Discrete incidents

- **Event**: triggered incident that resolves automatically.
- **Dilemma**: triggered incident that requires a player choice.

### Configuration

- **Scenario**: the complete configuration of a playable denominational setup.

Events, Dilemmas, Effects, Inertia, Grudges, and Scenarios are NOT additional node types.

---

# 5. Node Model

## 5.1 Common Node Semantics

Every node has, conceptually:

- a unique identity;
- a node type;
- a human-readable name;
- a description;
- an optional thematic category;
- a numeric value or numeric state;
- a numeric domain;
- an active state where applicable;
- type-specific behavior.

The exact data representation is an implementation concern.

---

## 5.2 Numeric Domain

A node's numeric domain defines:

- minimum value;
- maximum value;
- whether the value is clamped to that range.

The core design does NOT require every node to use the same numeric domain.

Normalized ranges such as `0.0` to `1.0` are useful for many simulation values and effect functions, but Resources and other domain-specific values MAY use other meaningful ranges.

An implementation MUST NOT silently assume that every node uses `0.0` to `1.0` unless the scenario or data specification establishes that invariant.

---

## 5.3 Active State

Activation determines whether a node currently participates in the active simulation.

The core activation modes are:

- **Active**
- **Inactive**
- **Forced Active**

### Default behavior

| Node Type | Default Activation |
|---|---|
| Indicator | Forced Active |
| Resource | Forced Active |
| Stance | Configurable |
| Faction | Configurable |
| Situation | Configurable |

A Scenario MAY override configurable starting activation.

Forced-active nodes cannot normally be deactivated.

---

## 5.4 Inactive Node Behavior

Unless a node type defines an exception:

- an inactive node MUST NOT exert its normal outgoing Effects;
- its stored state MAY remain available for later reactivation;
- it MUST NOT be treated as active merely because it is visible in the UI.

Situations are the important exception:

> An inactive Situation MUST still evaluate the incoming influences required to determine whether it reaches its start threshold.

Its outgoing Effects do not participate until the Situation becomes active.

---

## 5.5 Graph Visibility

Simulation participation and visualization are separate concepts.

A node MAY participate fully in the simulation without being rendered on the primary causal graph.

In particular:

> **Resource nodes MAY be hidden from the graph visualization while remaining normal simulation nodes.**

Implementations MUST NOT infer simulation activity from UI visibility.

---

# 6. Node Categories

Each node MAY have a thematic category for organization, filtering, presentation, and authoring.

The standard category taxonomy is:

- **Governance**
- **Belief and Teaching**
- **Worship and Practice**
- **Finance and Assets**
- **Care and Charity**
- **Mission and Expansion**

Categories do not create simulation behavior by themselves.

A category MUST NOT automatically:

- create Effects;
- change activation;
- change update order;
- change numeric semantics;
- grant special privileges to a node type.

Mechanics that differ between nodes MUST be represented explicitly rather than inferred only from category membership.

---

# 7. Stances

## 7.1 Definition

A **Stance** is a player-controlled doctrinal, institutional, policy, governance, or practical position.

Examples include:

- degree of centralization;
- confessional strictness;
- clergy qualification requirements;
- liturgical formality;
- church discipline;
- mission emphasis;
- congregational autonomy.

The term **Stance** is intentionally broader than "Policy."

---

## 7.2 Player Control

Stances are the main direct player-control surface of the simulation.

Ordinary simulation Effects SHOULD NOT directly control Stance values.

If a mechanic needs to constrain, enable, disable, or force a Stance, that behavior SHOULD be represented explicitly rather than by treating the Stance as a normal endogenous Indicator.

---

## 7.3 Continuous Stances

A continuous Stance allows the player to select a value within a permitted range.

It MAY define a preferred adjustment step.

Example:

```text
Degree of Centralization
0.00 ------------------------------ 1.00
Local                              Central
```

---

## 7.4 Discrete Stances

A discrete Stance exposes named permitted states.

Example:

```text
Prohibited
Restricted
Permitted
```

The implementation MAY represent the underlying state numerically, but the player-facing semantics are discrete.

---

## 7.5 Value Labels

A Stance MAY associate portions of its numeric range with descriptive labels.

Example:

```text
0.00 - 0.24  Low
0.25 - 0.74  Moderate
0.75 - 1.00  High
```

Labels are presentation semantics and do not independently change simulation behavior.

---

## 7.6 Change Cost

A Stance MAY require a Resource cost to enact or modify.

The current general cost model supports:

- fixed base cost;
- cost per amount changed;
- optional maximum change per action.

Conceptually:

```text
total cost
=
base cost
+
cost per point * absolute amount changed
```

A Scenario MAY define different costs or use a discrete action cost instead.

---

## 7.7 Enactment and Activation

A Stance MAY start inactive.

An inactive Stance MAY be enacted by the player if its requirements are satisfied.

Enactment MAY require:

- Resource expenditure;
- prerequisites;
- an initial value.

Once enacted, the Stance becomes active and its outgoing Effects may participate.

A forced-active Stance cannot normally be cancelled or made inactive.

---

## 7.8 Opposing or Incompatible Stances

A Scenario MAY define Stances as mutually incompatible.

Enacting one incompatible Stance MAY:

- prevent enactment of another;
- deactivate another;
- require another to be changed first.

The current design does not require a universal conflict-resolution rule beyond explicit scenario definition.

---

# 8. Indicators

## 8.1 Definition

An **Indicator** is a continuously existing measurement of the state of the denomination, its institutions, its members, or its environment.

Examples include:

- Governance Effectiveness
- Congregational Cohesion
- Leadership Trust
- Leadership Capacity
- Doctrinal Clarity
- Lay Theological Literacy
- Clergy Quality
- Faith Adherence
- Leadership Burden
- Public Reputation
- Mission Capacity

Indicators are endogenous simulation state rather than direct player choices.

---

## 8.2 Activation

Indicators are forced active by default.

They continuously participate in the simulation unless a later explicit design change establishes another rule.

---

## 8.3 Inputs and Outputs

Indicators MAY receive Effects from any permitted source and MAY themselves be sources of Effects.

This allows causal chains such as:

```text
Seminary Standards
      |
      v
Clergy Quality
      |
      v
Teaching Quality
      |
      v
Faith Adherence
```

An Indicator MAY have no incoming Effects, no outgoing Effects, or both.

---

# 9. Factions

## 9.1 Definition

A **Faction** is an internal constituency, movement, tendency, or interest group within the denomination.

A Faction is represented by a changing numeric state.

Depending on the Faction's design, that value MAY represent a concept such as:

- approval;
- loyalty;
- strength;
- prevalence;
- influence;
- commitment.

The meaning of a particular Faction's value MUST be defined by that Faction's content definition.

The core engine MUST NOT assume that all Faction values necessarily mean the same real-world concept.

---

## 9.2 Faction Effects

Factions MAY receive Effects from:

- Stances;
- Indicators;
- other Factions;
- Situations;
- Resources;
- Grudges.

Factions MAY also exert Effects on other simulated objects.

Examples:

```text
Confessional Strictness
        |
        v
Confessionalist Approval
        |
        v
Congregational Cohesion
```

or:

```text
Reform Movement Strength
        |
        v
Doctrinal Controversy
```

---

## 9.3 Activation

Factions use the general activation system.

A Scenario MAY define a Faction as initially inactive when the movement or constituency is not present at the start.

Inactive Factions do not exert normal outgoing Effects.

---

# 10. Resources

## 10.1 Definition

A **Resource** is a spendable, accumulable, or strategically constrained capacity represented as a simulation node.

Examples may include:

- Authority;
- Money;
- Institutional Capacity;
- other scenario-specific strategic capacities.

Authority is currently a Resource.

---

## 10.2 Resource Nodes

Resources remain part of the five-node simulation model.

They MUST NOT be converted into a completely separate non-node subsystem merely because their UI or transactional behavior differs from ordinary Indicators.

Resource nodes MAY:

- serve as sources of Effects;
- receive Effects where explicitly defined;
- be modified through explicit costs, rewards, or other game actions;
- be hidden from the primary simulation graph.

---

## 10.3 Spending

A player action MAY directly reduce a Resource balance.

Example:

```text
Authority before action: 40
Stance change cost:      12
Authority after action:  28
```

This direct expenditure is distinct from a persistent Effect contribution.

An Effect does not become a permanent per-turn expenditure merely because its target is a Resource.

---

## 10.4 Resource Visibility

A Resource MAY be:

- visible as a normal graph node;
- visible only in a dedicated resource display;
- hidden from ordinary graph visualization.

Visibility does not alter simulation behavior.

---

# 11. Situations

## 11.1 Definition

A **Situation** is a persistent condition, crisis, movement, or development that may emerge and later disappear.

Examples include:

- Doctrinal Controversy
- Clergy Shortage
- Schism Pressure
- Revival Movement
- Financial Crisis
- External Persecution
- Leadership Scandal

A Situation is not the same as an Event.

A Situation persists and has continuously evaluated simulation strength.

---

## 11.2 Situation Value

A Situation has a numeric value representing its underlying pressure, strength, or severity.

Incoming Effects determine or contribute to this value.

An inactive Situation MUST still evaluate the incoming Effects required to determine whether it starts.

---

## 11.3 Start Trigger

If a Situation is inactive and its value reaches its start threshold, it becomes active.

Default comparison:

```text
if inactive and value >= start threshold:
    activate
```

---

## 11.4 Stop Trigger

If a Situation is active and its value reaches or falls below its stop threshold, it becomes inactive.

Default comparison:

```text
if active and value <= stop threshold:
    deactivate
```

---

## 11.5 Hysteresis

Start and stop thresholds MAY differ.

Example:

```text
start threshold = 0.70
stop threshold  = 0.40
```

At a current value of `0.55`:

- if the Situation was inactive, it remains inactive;
- if the Situation was active, it remains active.

This hysteresis prevents rapid activation/deactivation when a value fluctuates near a single threshold.

---

## 11.6 Situation Outputs

While active, a Situation MAY exert outgoing Effects.

Example:

```text
Low Clergy Recruitment -----+
High Retirement Rate -------+--> Clergy Shortage Pressure
High Requirements ----------+

Clergy Shortage >= 0.70
            |
            v
      CLERGY SHORTAGE
          ACTIVE
            |
       +----+----------------+
       |                     |
       v                     v
Leadership Burden       Governance Reach
      increases             decreases
```

When the Situation becomes inactive, its normal outgoing Effects cease to contribute.

---

# 12. Effects

## 12.1 Definition

An **Effect** is a persistent directed causal relationship from a source to a target.

Conceptually:

```text
Source
  |
  | response function
  v
Contribution
  |
  v
Target
```

Effects form the main causal graph of the simulation.

---

## 12.2 Source and Target

An Effect identifies:

- a source;
- a target;
- a response function or equivalent magnitude rule;
- optional inertia.

A special default or constant source MAY be used when a fixed baseline contribution is required.

---

## 12.3 Contribution Semantics

Effects represent contributions to target state.

They MUST NOT be interpreted as permanent additive changes that accumulate indefinitely each turn.

Example:

Given:

```text
source value = 0.50
effect       = 0.40 * x
```

the contribution is:

```text
0.40 * 0.50 = 0.20
```

If the source remains `0.50`, advancing another turn MUST NOT automatically change the contribution to `0.40`.

The persistent contribution remains `0.20`, subject to inertia or other modifiers.

---

## 12.4 Response Functions

The simplest Effect MAY be a constant magnitude multiplied by the source value:

```text
f(x) = magnitude * x
```

The design also supports functional relationships.

Examples:

```text
f(x) = 0.04 + 0.04x
```

```text
f(x) = -0.20x
```

```text
f(x) = x^2
```

An Effect MAY reference additional simulation values where scenario content requires contextual scaling.

Example:

```text
Mission effect
=
0.30 * MissionSpending * MissionCapacity
```

The exact expression language is a technical/data-format decision.

The game-design requirement is that Effects MAY be nonlinear and MAY depend on explicitly referenced simulation state.

---

## 12.5 Positive and Negative Effects

Positive contribution increases the target relative to its baseline/current calculation.

Negative contribution decreases it.

The sign has no universal moral meaning.

A positive numeric change is not automatically "good," and a negative numeric change is not automatically "bad."

---

## 12.6 Constant Contributions

A special default source MAY provide a fixed contribution independent of another node.

Conceptually:

```text
_default_ -> Situation = +0.10
```

This can represent baseline pressure or baseline state.

---

## 12.7 Permitted Relationships

The effect graph is intentionally general.

Typical relationships include:

```text
Stance    -> Indicator
Stance    -> Faction
Stance    -> Situation
Stance    -> Resource

Indicator -> Indicator
Indicator -> Faction
Indicator -> Situation
Indicator -> Resource

Faction   -> Indicator
Faction   -> Faction
Faction   -> Situation
Faction   -> Resource

Situation -> Indicator
Situation -> Faction
Situation -> Situation
Situation -> Resource

Resource  -> Indicator
Resource  -> Faction
Resource  -> Situation
Resource  -> Resource
```

Stances SHOULD NOT normally be ordinary Effect targets because they represent player-controlled positions.

Any exception MUST be explicit in the game design or scenario content.

---

## 12.8 Effect Evaluation Must Be Order-Independent

The semantic result of the simulation SHOULD NOT depend on the order in which Effects happen to be declared in a file.

Implementation MAY choose any deterministic evaluation strategy that preserves the intended causal semantics.

The game design does not prescribe a specific solver or update algorithm.

---

# 13. Inertia

## 13.1 Definition

**Inertia** is delayed response attached to an individual persistent Effect.

It represents the fact that changes in a cause may take time to fully alter the target.

Inertia belongs to the Effect, not to the source node globally.

---

## 13.2 Per-Effect Behavior

Two Effects from the same source MAY use different inertia.

Example:

```text
Stance --------------------> Leadership Trust
       short inertia

Stance --------------------> Institutional Culture
       long inertia
```

The first target can respond quickly while the second responds slowly.

---

## 13.3 Conceptual Calculation

The reference behavior is a moving influence based on recent source values.

Conceptually:

```text
recent source values
        |
        v
inertia calculation
        |
        v
effective source value
        |
        v
response function
        |
        v
target contribution
```

A source that has remained unchanged for at least the full inertia period should eventually exert its full steady-state Effect.

---

## 13.4 Runtime History

Inertia requires runtime history associated with the individual Effect.

The history is runtime state and MUST NOT be treated as immutable scenario definition data.

---

## 13.5 Inertia Is Not a Grudge

Inertia delays a persistent causal relationship.

A Grudge represents a temporary consequence that decays after being created.

The two mechanisms MUST remain distinct.

---

# 14. Grudges

## 14.1 Definition

A **Grudge** is a temporary hidden effect created by a discrete occurrence.

The term is intentionally retained from the *Democracy* reference model.

Typical sources include:

- Events;
- Dilemma choices;
- exceptional scripted consequences;
- other explicitly defined incidents.

A Grudge is not a persistent node type.

---

## 14.2 Grudge State

A Grudge contains at minimum:

- target;
- current magnitude;
- decay factor.

Conceptually:

```text
Grudge
  |
  +-- target
  +-- magnitude
  `-- decay
```

---

## 14.3 Decay

Each turn, the Grudge's magnitude is multiplied by its decay factor.

Example:

```text
initial magnitude = -0.15
decay             = 0.90
```

Then:

```text
Turn 0  -0.1500
Turn 1  -0.1350
Turn 2  -0.1215
Turn 3  -0.10935
...
```

Higher decay factors closer to `1.0` create longer-lasting effects.

A decay factor of `1.0` MAY represent a non-decaying Grudge if scenario content deliberately requires it.

---

## 14.4 Grudge Contribution

While it exists, a Grudge contributes its current magnitude to its target.

A Grudge does not permanently modify the target's baseline.

---

## 14.5 Removal

A Grudge SHOULD be removed when its remaining magnitude is negligible or when another explicit termination condition is reached.

The exact numeric cleanup threshold is an implementation/data-format concern and MUST NOT materially change intended gameplay behavior.

---

## 14.6 Example

```text
Event:
Leadership Scandal
       |
       v
Create Grudge
Leadership Trust = -0.20
Decay            = 0.85
       |
       v
Temporary trust penalty
that fades over later turns
```

---

# 15. Events

## 15.1 Definition

An **Event** is a discrete incident triggered by simulation conditions and resolved automatically.

An Event is not a persistent node.

Examples might include:

- prominent leader resignation;
- property dispute;
- public scandal;
- unexpected donation;
- missionary opportunity;
- seminary controversy.

---

## 15.2 Event Influences

An Event MAY define any number of incoming influences.

These influences calculate an event score, likelihood, or eligibility measure from current simulation state.

Conceptually:

```text
Indicator ---------+
Situation ----------+--> Event score
Faction ------------+
_random_ -----------+
```

An influence MAY increase or decrease the chance of the Event.

Event influences do not use persistent Effect inertia unless explicitly added by a future design revision.

---

## 15.3 Random Influence

An Event MAY include a bounded random influence.

Randomness SHOULD modify the likelihood of an event rather than replace causal conditions entirely.

The exact random distribution and event-evaluation cadence are scenario or implementation parameters unless otherwise specified.

---

## 15.4 Triggering

Eligible Events are evaluated according to the incident system.

The current design requires the following semantics, not a specific *Democracy 4* constant:

- Events have influences.
- Influences produce a trigger score or likelihood.
- A trigger threshold or selection rule determines whether an Event occurs.
- Events SHOULD support recurrence control or cooldown where needed.
- The system SHOULD avoid repeatedly firing the same Event every turn unless explicitly designed to do so.

The game does NOT currently require *Democracy 4*'s exact "every three turns" or "70%" constants.

---

## 15.5 Event Consequences

When an Event fires, it MAY:

- create one or more Grudges;
- modify Resources;
- change activation state where explicitly allowed;
- invoke other explicitly defined immediate consequences.

Temporary consequences SHOULD normally be represented as Grudges rather than permanent mutation of an unrelated node's baseline.

---

## 15.6 Example

```text
Doctrinal Controversy ----+
Clergy Dissatisfaction ---+--> Professor Resignation score
Seminary Instability -----+
Random variation ---------+

score reaches trigger condition
             |
             v
Professor Resignation Event
             |
             +--> Grudge: Leadership Trust -0.08
             +--> Grudge: Seminary Stability -0.12
```

---

# 16. Dilemmas

## 16.1 Definition

A **Dilemma** is a discrete incident triggered by simulation conditions that requires the player to choose among defined options.

A Dilemma is mechanically distinct from an Event because an Event resolves automatically.

---

## 16.2 Dilemma Influences

Dilemmas use incoming influences to determine whether they become eligible or trigger.

Influences MAY use:

- Stances;
- Indicators;
- Factions;
- Resources;
- Situations;
- random variation;
- prerequisites.

Like Event influences, Dilemma trigger influences do not use persistent Effect inertia unless a future design explicitly changes this rule.

---

## 16.3 Choices

A Dilemma contains two or more player choices.

Each choice MAY create different consequences.

Typical consequences include:

- Grudges;
- Resource changes;
- activation changes where allowed;
- other explicit one-time state changes.

---

## 16.4 Recurrence

A triggered Dilemma SHOULD support a cooldown or recurrence restriction.

The exact cooldown duration is content/configuration rather than a universal fixed constant.

---

## 16.5 Example

```text
Doctrinal Controversy
        |
        v
 Seminary Dispute
     Dilemma
        |
   +----+--------+
   |             |
Discipline     Mediate
Professor      Dispute
   |             |
   v             v
Grudges       Grudges
and costs     and costs
```

---

# 17. Prerequisites and Conditions

## 17.1 Definition

A **Prerequisite** is a condition that must be true for some content or action to be available or eligible.

Prerequisites are not nodes unless a scenario deliberately represents the same concept as a simulation node for other reasons.

Examples:

```text
_has_bishops
_has_seminary
_has_general_assembly
_has_foreign_missions
```

The exact prerequisite names are scenario/content concerns.

---

## 17.2 Uses

Prerequisites MAY control:

- Stance availability;
- Situation eligibility;
- Event eligibility;
- Dilemma eligibility;
- scenario-specific content;
- other explicitly defined mechanics.

Prerequisites SHOULD represent categorical conditions rather than values that already have a natural continuous node representation.

---

# 18. Governance

## 18.1 Current Design

The current game design does **not** define a separate governance-resolution subsystem.

There is currently no special engine-level model for:

- synod votes;
- assembly voting;
- bishop approval;
- congregational ratification;
- formal polity procedures;
- legislative stages;
- institutional vetoes.

Governance is represented through the existing simulation model.

Governance-related concepts MAY therefore appear as ordinary:

- Stances;
- Indicators;
- Factions;
- Resources;
- Situations;
- Effects.

Examples include:

- Governance Effectiveness as an Indicator;
- Congregational Autonomy as a Stance;
- Leadership Trust as an Indicator;
- Authority as a Resource;
- an internal reform movement as a Faction;
- governance crisis as a Situation.

---

## 18.2 No Implicit Governance Subsystem

Implementations MUST NOT infer or introduce a separate governance-resolution architecture from terminology such as "episcopal," "presbyterian," "congregational," "assembly," "bishop," or "synod."

If governance procedures later require specialized mechanics, that will be an explicit future revision of this document.

Until then, governance remains expressed through nodes, Effects, Resources, incidents, and scenario configuration.

---

# 19. Scenario

## 19.1 Definition

A **Scenario** is the sole top-level configuration abstraction for a playable denominational setup.

The current design does NOT distinguish between:

- a separate Denomination definition; and
- a Scenario definition.

Implementations MUST NOT introduce that split as a required game-design concept unless this document is explicitly revised.

---

## 19.2 Scenario Responsibilities

A Scenario MAY define:

- scenario identifier;
- title;
- description;
- starting turn or year;
- simulation nodes;
- simulation Effects;
- initial node values;
- initial active state;
- forced-active state;
- Resources and starting balances;
- available and inactive Stances;
- Situation thresholds;
- Events;
- Dilemmas;
- prerequisites;
- scenario-specific overrides;
- other starting conditions required by the simulation.

The Scenario determines the complete initial denominational and institutional environment.

---

## 19.3 Starting Stances

A Scenario MAY specify which Stances begin active and their initial values.

An active starting Stance is treated as already established at scenario start.

Its normal outgoing Effects SHOULD already be reflected when the initial simulation state is established.

---

## 19.4 Scenario Overrides

A Scenario MAY override general content behavior where necessary.

Possible override targets include:

- starting values;
- Effect strengths or functions;
- prerequisites;
- costs;
- activation;
- thresholds;
- content availability.

Overrides SHOULD be explicit.

An implementation SHOULD NOT fork or duplicate the entire simulation model merely to express a scenario-specific variation that can be represented as an override.

---

# 20. Runtime State

The simulation must distinguish static scenario definition from mutable runtime state.

Runtime state conceptually includes:

- current turn;
- current node values;
- current activation state;
- current Resource balances;
- per-Effect inertia history;
- active Grudges and their current magnitudes;
- Event recurrence/cooldown state;
- Dilemma recurrence/cooldown state;
- other mutable state required by current mechanics.

Example:

```text
Static definition:
Situation starts inactive.
Start threshold = 0.70.
Stop threshold  = 0.40.

Runtime:
Turn 12
Situation value = 0.77
Situation active = true
```

The static definition does not change because the runtime state changed.

---

# 21. Persistent State Calculation

## 21.1 General Principle

Persistent simulation values are determined by current state and active causal contributions.

Conceptually, for a normal simulated target:

```text
target state
=
baseline or underlying state
+
persistent Effect contributions
+
active Grudge contributions
+
other explicitly defined direct modifiers
```

This is a semantic model, not a mandated numerical solver.

---

## 21.2 No Per-Turn Runaway Accumulation

A persistent Effect MUST NOT be interpreted as:

```text
target = target + effect
```

every turn when the author intended a stable causal contribution.

For example:

```text
Stance value = 0.50
Effect contribution = +0.10
```

does not imply:

```text
Turn 1 +0.10
Turn 2 +0.20
Turn 3 +0.30
...
```

The contribution remains associated with the current causal state.

Changes occur when:

- the source changes;
- another referenced value changes;
- inertia is still responding;
- activation changes;
- a Grudge changes;
- another input changes.

---

# 22. Incidents Versus Persistent Simulation

Events and Dilemmas are evaluated from persistent game state but do not themselves become persistent graph nodes.

The distinction is:

```text
PERSISTENT SYSTEM

Stances
Indicators
Factions
Resources
Situations
     |
     v
Effect Graph
     |
     v
Current Simulation State
```

```text
DISCRETE INCIDENT SYSTEM

Current Simulation State
        |
        v
Event / Dilemma Influences
        |
        v
Trigger
        |
        v
Immediate Consequence
        |
        v
Grudges / Resource Changes / Explicit State Changes
        |
        v
Future Simulation State
```

A recurring long-term condition SHOULD generally be a Situation rather than an Event.

A one-time occurrence SHOULD generally be an Event or Dilemma rather than a Situation.

---

# 23. Inertia Versus Grudges

This distinction is a core invariant.

## Inertia

Inertia answers:

> How quickly does an ongoing causal relationship respond when its source changes?

Example:

```text
Stance changes from 0.20 to 0.80
              |
              v
Effect with inertia
              |
              v
Target responds gradually
```

The cause remains present.

## Grudge

A Grudge answers:

> How does the temporary memory or aftermath of a discrete occurrence fade over time?

Example:

```text
Leadership Scandal Event
          |
          v
Trust Grudge = -0.20
          |
          v
-0.17 -> -0.14 -> -0.12 -> ...
```

The occurrence happened once.

### Required distinction

A Grudge MUST NOT be implemented merely as an Effect with large inertia.

Inertia MUST NOT be implemented merely as a Grudge.

---

# 24. Activation and Effect Interaction

The following rules apply unless a node type explicitly defines an exception.

### Active source

Its outgoing Effects participate normally.

### Inactive source

Its normal outgoing Effects do not participate.

### Active target

It may receive normal incoming Effects.

### Inactive Stance or Faction

It does not normally participate in the active graph.

### Inactive Situation

Its incoming trigger influences continue to be evaluated so that it can reach its start threshold.

Its outgoing Effects remain inactive until the Situation starts.

### Forced-active node

It cannot normally be deactivated through ordinary gameplay.

---

# 25. Constant Sources and Baselines

The simulation MAY use a special default or constant source to express baseline contributions.

Example:

```text
_default_
   |
   | +0.20
   v
Institutional Stability
```

This is useful when a variable should have nonzero pressure even without another named node causing it.

A default contribution is still a contribution, not a permanent per-turn addition.

---

# 26. Randomness

Randomness MAY be used in discrete incident triggering or other explicitly designed mechanics.

Randomness SHOULD:

- operate within bounded ranges;
- modify or select among causally plausible outcomes;
- not replace the causal simulation model;
- be reproducible under seeded simulation where deterministic replay is required by the technical design.

The exact RNG implementation is outside the scope of this document.

---

# 27. Worked Examples

## 27.1 Stance to Indicator

```text
Stance:
Seminary Requirements = 0.75

Effect:
Clergy Quality = 0.10 + (0.30 * x)
```

Contribution:

```text
0.10 + (0.30 * 0.75)
= 0.325
```

If Seminary Requirements remains at `0.75`, the Effect continues contributing `0.325`, subject to inertia or contextual modifiers.

It does NOT add another `0.325` permanently every turn.

---

## 27.2 One Source, Different Inertia

```text
Clergy Education Requirement
        |
        | inertia = 1
        v
Leadership Trust

Clergy Education Requirement
        |
        | inertia = 6
        v
Clergy Quality
```

The same Stance change can alter Leadership Trust quickly while its effect on Clergy Quality takes longer to reach steady state.

The inertia history belongs to each Effect separately.

---

## 27.3 Context-Dependent Effect

```text
Mission Emphasis
      |
      | 0.30 * x * MissionCapacity
      v
Evangelistic Reach
```

If:

```text
Mission Emphasis  = 0.80
Mission Capacity  = 0.25
```

then:

```text
0.30 * 0.80 * 0.25
= 0.06
```

Strong mission emphasis has limited effect while Mission Capacity is weak.

---

## 27.4 Situation Lifecycle

Inputs:

```text
Low Clergy Recruitment ---> + Clergy Shortage
High Retirement Rate -----> + Clergy Shortage
Clergy Retention ---------> - Clergy Shortage
```

Thresholds:

```text
start = 0.70
stop  = 0.40
```

Sequence:

```text
Turn 1: value 0.55, inactive -> remains inactive
Turn 2: value 0.73, inactive -> becomes active
Turn 3: value 0.60, active   -> remains active
Turn 4: value 0.43, active   -> remains active
Turn 5: value 0.38, active   -> becomes inactive
```

While active, Clergy Shortage may exert Effects such as:

```text
Clergy Shortage -> Leadership Burden +
Clergy Shortage -> Governance Reach -
Clergy Shortage -> Member Satisfaction -
```

---

## 27.5 Event and Grudge

Event influences:

```text
Doctrinal Controversy ----+
Leadership Distrust ------+--> Leadership Resignation score
Random influence ---------+
```

When the Event triggers:

```text
Leadership Resignation
        |
        +--> Grudge: Leadership Trust -0.15, decay 0.90
        |
        `--> Grudge: Institutional Cohesion -0.08, decay 0.95
```

The penalties then decay independently each turn.

---

## 27.6 Dilemma

Trigger conditions produce:

```text
Property Dispute Dilemma
```

Player choices:

```text
A. Central office intervenes
B. Local congregation decides
C. Seek mediation
```

Each option may create different Grudges and Resource changes.

The Dilemma itself does not become a persistent node after the choice.

---

## 27.7 Hidden Resource Node

```text
Authority
   |
   +--> enables Stance change through explicit cost
   |
   `--> Leadership Capacity through an Effect
```

Authority may be omitted from the main graph visualization.

It remains a Resource node and continues participating in simulation and player actions.

---

# 28. Governance Example Under the Current Model

Governance has no special subsystem.

A governance dynamic can be represented through existing nodes:

```text
Stance:
Centralization
      |
      +------------------+
      |                  |
      v                  v
Governance          Localist Faction
Effectiveness          Approval
      |                  |
      +--------+---------+
               |
               v
      Congregational Cohesion
```

Authority may constrain the player's ability to change Centralization.

A governance crisis may emerge as a Situation:

```text
Low Leadership Trust -----+
Low Cohesion -------------+--> Governance Crisis
High Conflict ------------+
```

This representation is the current design.

The game MUST NOT automatically add assembly-voting or polity-resolution mechanics merely because governance-related nodes exist.

---

# 29. Scenario Example

A Scenario may define:

```text
Title:
Fictional Connectional Church, 1980

Starting turn:
1980

Starting Stances:
- Confessional Strictness = 0.70
- Centralization = 0.55
- Liturgical Formality = 0.40

Starting Indicators:
- Leadership Trust = 0.62
- Congregational Cohesion = 0.68
- Clergy Quality = 0.57

Starting Resources:
- Authority = 45

Starting Situations:
- Clergy Shortage: inactive
- Doctrinal Controversy: inactive

Prerequisites:
- _has_seminary
- _has_general_assembly

Scenario overrides:
- stronger effect from Confessional Strictness to Doctrinal Clarity
- weaker effect from Centralization to Congregational Cohesion
```

This example illustrates the responsibilities of a Scenario. It is not required game content.

There is no separate Denomination object required above this Scenario.

---

# 30. Design Invariants

The following invariants summarize the current design.

1. The core persistent simulation contains five node types: **Stance, Indicator, Faction, Resource, Situation**.

2. **Resource remains a node type.** A Resource MAY be omitted from graph visualization without ceasing to be a node.

3. **Stances are primarily player controlled.** Ordinary simulation Effects SHOULD NOT normally set their values.

4. **Indicators are active by default** and represent continuously simulated state.

5. **Factions are simulation nodes** representing constituencies, movements, tendencies, or interest groups with scenario-defined scalar meaning.

6. **Situations are persistent nodes with active/inactive state.**

7. **Inactive Situations still evaluate their incoming trigger influences.**

8. **Situations use separate start and stop thresholds** and therefore support hysteresis.

9. **Effects are persistent directed causal contributions.**

10. **Effects MUST NOT be treated as permanent per-turn additive mutations.**

11. **Effects MAY use functional and contextual response equations**, not only fixed linear magnitudes.

12. **Inertia belongs to individual Effects** and delays their response.

13. **Grudges are temporary decaying contributions** created by discrete occurrences.

14. **Inertia and Grudges are different mechanisms** and MUST NOT be collapsed into one another.

15. **Events are discrete automatically resolved incidents**, not nodes.

16. **Dilemmas are discrete player-choice incidents**, not nodes.

17. **Events and Dilemmas MAY create Grudges.**

18. **Categories are organizational metadata** and MUST NOT independently create simulation behavior.

19. **Scenario is the sole top-level configuration abstraction** for a playable denominational setup.

20. The current design **does not distinguish Denomination from Scenario**.

21. The current design **does not define a specialized governance-resolution subsystem**.

22. Governance is currently represented through ordinary nodes, Effects, Resources, Situations, Events, Dilemmas, and Scenario configuration.

23. The effect graph SHOULD behave independently of declaration order.

24. Simulation participation and graph/UI visibility are separate concepts.

25. Static scenario definition and mutable runtime state MUST remain conceptually distinct.

---

# 31. Explicitly Deferred or Unspecified Mechanics

The following concepts are intentionally not part of the current authoritative design.

Agents MUST NOT invent them as required systems solely because they appear plausible.

## 31.1 Specialized Governance Resolution

Deferred examples include:

- assembly vote simulation;
- bishop approval procedures;
- synod voting;
- congregational ratification;
- multi-stage constitutional procedures;
- polity-specific decision engines.

Governance remains in the ordinary node/effect model until this document is revised.

---

## 31.2 Denomination / Scenario Split

There is no separate reusable Denomination-definition layer in the current design.

Scenario remains the single configuration abstraction.

---

## 31.3 Multi-Attribute Faction Model

The core design currently treats each Faction as a node with one scenario-defined numeric state.

A required multi-field model such as separate prevalence, approval, loyalty, and influence is not currently specified.

Such a system MAY be added in a later design revision.

---

## 31.4 Exact Incident Scheduling Constants

The current design does not require the exact *Democracy 4* constants for:

- event evaluation frequency;
- trigger threshold;
- dilemma recurrence delay;
- number of incidents per turn.

Those are content/balance decisions unless later standardized here.

---

## 31.5 Exact Numerical Solver

This document does not prescribe:

- synchronous versus iterative numerical solving;
- internal expression syntax;
- floating-point representation;
- storage format;
- exact graph traversal algorithm.

Any implementation MUST preserve the semantic rules defined here, especially contribution behavior, inertia, activation, situation hysteresis, and Grudge decay.

---

# 32. Glossary

| Term | Meaning |
|---|---|
| **Node** | Persistent object participating in the causal simulation. |
| **Stance** | Player-controlled doctrinal, institutional, governance, policy, or practical position. |
| **Indicator** | Continuously simulated state measurement. |
| **Faction** | Internal constituency, movement, tendency, or interest group represented by a scalar state. |
| **Resource** | Spendable, accumulable, or strategically constrained capacity represented as a node. |
| **Situation** | Persistent condition that can activate or deactivate according to simulation pressure. |
| **Effect** | Persistent directed causal contribution from a source to a target. |
| **Response Function** | Rule that maps source/context values to an Effect contribution. |
| **Inertia** | Per-Effect delayed response to changes in causal input. |
| **Grudge** | Temporary hidden contribution whose magnitude decays over time. |
| **Event** | Triggered discrete incident that resolves automatically. |
| **Dilemma** | Triggered discrete incident that requires a player choice. |
| **Prerequisite** | Condition that controls eligibility or availability. |
| **Scenario** | Complete configuration of a playable denominational setup. |
| **Category** | Non-mechanical thematic classification used for organization and presentation. |
| **Active State** | Whether a node currently participates in its normal simulation behavior. |
| **Forced Active** | Activation state that ordinary gameplay cannot deactivate. |

---

# 33. Summary Model

The current design can be summarized as:

```text
                         PLAYER
                           |
                    changes / enacts
                           |
                           v
                        STANCES
                           |
                           v
                  PERSISTENT EFFECT GRAPH
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
        INDICATORS      FACTIONS      RESOURCES
             |             |             |
             +-------------+-------------+
                           |
                           v
                       SITUATIONS
                    start / stop
                           |
                           v
                  PERSISTENT EFFECT GRAPH


                  CURRENT SIMULATION STATE
                           |
                           v
                  INCIDENT INFLUENCES
                           |
                    +------+------+
                    |             |
                    v             v
                  EVENT        DILEMMA
                    |             |
                    |        player choice
                    |             |
                    +------+------+
                           |
                           v
                        GRUDGES
                    temporary decay
                           |
                           v
                  SIMULATION TARGETS
```

A **Scenario** supplies the complete starting configuration and scenario-specific rules around this model.

This is the current authoritative game-mechanics model until `GAME_DESIGN.md` is explicitly revised.

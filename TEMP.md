# Undocumented Implementation Decisions Audit

## Purpose

This is a code-to-document traceability audit of the current repository against
`AGENTS.md`, `GAME_DESIGN.md`, `ARCHITECTURE.md`, and `DATA_FORMAT.md`. It lists
behavior and structural decisions already encoded in the implementation but not
fully represented in those documents.

An implemented behavior is not automatically intended design. In particular,
items below that occupy an explicitly deferred area require a design decision;
they must not be copied into an authoritative document merely because the code
currently behaves that way.

Classifications used below:

- **Omission**: the documents do not address an implemented decision.
- **Granularity gap**: the documents state the general rule but omit a material
  boundary, ordering rule, default, or public contract.
- **Deferred implementation**: the code selects behavior in an area the design
  explicitly leaves TBD.
- **Stale statement**: a document describes an earlier implementation rather
  than the current code.

## Method

- Inventoried the domain contracts, engine transitions, public barrel, Scenario
  content, session hook, UI projections/components, tests, and validation
  scripts.
- Built a reverse traceability map from implemented branches, defaults,
  constants, state fields, and public return values to the four documents.
- Compared the implementation commit history with the later documentation
  consolidation to catch decisions lost through summarization.
- Included behavior only when it can affect simulation output, authored-content
  validity, reproducibility, a public interface, persistence compatibility, or
  observable interaction behavior.
- Treated source comments and tests as evidence of current intent, but applied
  the document precedence from `AGENTS.md` whenever code and documentation
  disagree.

## Material simulation decisions

### 1. Complete turn phase order

- **Classification:** Deferred implementation
- **Current behavior:** A pending Dilemma blocks immediately. Otherwise the
  engine increments turn and year, evaluates persistent state and Situation
  transitions, applies and then decays Grudges, removes small Grudges, and
  finally evaluates incidents against the newly calculated node state.
- **Evidence:** `src/simulation/engine/advanceTurn.ts:25-50` and
  `src/simulation/engine/evaluatePersistentState.ts:121-169`.
- **Documentation gap:** `GAME_DESIGN.md` defines only partial ordering and says
  the complete order is TBD. `ARCHITECTURE.md` says this choice must remain
  localized but does not record the current provisional sequence.
- **Owner:** `GAME_DESIGN.md` if made authoritative; otherwise
  `ARCHITECTURE.md` may identify it explicitly as provisional implementation
  behavior.

### 2. One turn advances the calendar by one year

- **Classification:** Omission
- **Current behavior:** Every successful turn increments `year` by exactly one
  when a calendar year exists. The browser labels the action “Advance year.”
- **Evidence:** `src/simulation/engine/advanceTurn.ts:34-36` and
  `src/App.tsx:34-50`.
- **Documentation gap:** The documents define an optional starting/current
  calendar value but do not define a turn-to-calendar conversion.
- **Owner:** `GAME_DESIGN.md`; any configurable cadence would then need a
  representation in `DATA_FORMAT.md`.

### 3. `_default_` is an always-participating, unit-valued source

- **Classification:** Granularity gap
- **Current behavior:** `_default_` always participates and supplies the numeric
  source value `1`, including when Inertia history is seeded.
- **Evidence:** `src/simulation/engine/evaluatePersistentState.ts:61-68` and
  `src/simulation/engine/initialize.ts:39-47`.
- **Documentation gap:** The documents identify `_default_` as a
  constant/default pseudo-source but do not define its numeric value or
  participation rule. `DATA_FORMAT.md` explicitly leaves exact constant-source
  semantics TBD.
- **Owner:** `GAME_DESIGN.md`; `DATA_FORMAT.md` should retain only the reserved
  identifier and representation.

### 4. Contextual `product` factors use raw prior-snapshot values

- **Classification:** Deferred implementation
- **Current behavior:** Only the primary source is passed through the Effect's
  Inertia history. Every `product` factor reads its stored value directly from
  the shared prior snapshot, regardless of the factor node's activation, and
  factors have no separate Inertia.
- **Evidence:** `src/simulation/engine/evaluatePersistentState.ts:35-43` and
  `src/simulation/engine/evaluatePersistentState.ts:69-76`.
- **Documentation gap:** The arithmetic form is now stated, but factor
  activation and contextual-input behavior remain explicitly TBD.
- **Owner:** `GAME_DESIGN.md`.

### 5. Inactive Effect sources write zeroes into Inertia history

- **Classification:** Granularity gap
- **Current behavior:** An inactive source contributes nothing and is sampled as
  `0` into each outgoing Effect's moving-average history. Reactivation therefore
  ramps through those zero samples instead of immediately resuming from the
  source's retained stored value.
- **Evidence:** `src/simulation/engine/evaluatePersistentState.ts:61-77`.
- **Documentation gap:** The design says inactive nodes retain stored state and
  exert no normal outgoing Effects, but it does not say whether inactivity is a
  zero causal sample or a pause in an Effect's history.
- **Owner:** `GAME_DESIGN.md`.

### 6. Effect histories advance even when the target cannot receive

- **Classification:** Granularity gap
- **Current behavior:** Every Effect is evaluated and its history updated before
  target eligibility is checked. History therefore advances while an ordinary
  target is inactive and even for an Effect whose target is a Stance.
- **Evidence:** `src/simulation/engine/evaluatePersistentState.ts:101-113`.
- **Documentation gap:** Target non-participation is documented, but the fate of
  per-Effect runtime history during that period is not.
- **Owner:** `GAME_DESIGN.md`.

### 7. Stances are categorically excluded as persistent targets

- **Classification:** Omission with a stricter implemented rule
- **Current behavior:** The evaluator always discards contributions targeting a
  Stance, although it still advances the Effect's history.
- **Evidence:** `src/simulation/engine/evaluatePersistentState.ts:107-113` and
  `src/simulation/engine/evaluatePersistentState.ts:121-125`.
- **Documentation gap:** `GAME_DESIGN.md` says Effects **SHOULD NOT normally**
  target Stances, while `DATA_FORMAT.md` permits any node reference as a target.
  Neither document states the engine's unconditional prohibition.
- **Owner:** `GAME_DESIGN.md`; `DATA_FORMAT.md` validation should reflect the
  outcome if this becomes a required restriction.

### 8. Grudge target participation differs by node kind and activation

- **Classification:** Granularity gap
- **Current behavior:** Grudges affect active non-Stance nodes and Situations
  regardless of Situation activation. They do not affect Stances or inactive
  Factions and other ordinary inactive targets.
- **Evidence:** `src/simulation/engine/evaluatePersistentState.ts:121-134`.
- **Documentation gap:** The common-node rule explicitly discusses inactive
  targets receiving normal persistent Effects, not Grudges. The Grudge and
  consequence definitions do not restrict target node types.
- **Owner:** `GAME_DESIGN.md`; compatible target restrictions belong in
  `DATA_FORMAT.md` after the mechanic is decided.

### 9. Grudge cleanup uses a fixed post-decay threshold

- **Classification:** Granularity gap
- **Current behavior:** A Grudge contributes its current magnitude, decays, and
  is then removed when the absolute decayed magnitude is below `0.001`.
  Positive and negative magnitudes use the same threshold.
- **Evidence:** `src/simulation/engine/advanceTurn.ts:11` and
  `src/simulation/engine/advanceTurn.ts:37-48`.
- **Documentation gap:** `GAME_DESIGN.md` says negligible Grudges should be
  removed without defining “negligible” or the cleanup phase.
- **Owner:** `GAME_DESIGN.md` if the threshold is a gameplay constant; otherwise
  document it as an engine-level numerical tolerance in `ARCHITECTURE.md`.

### 10. Direct transactions mutate a runtime baseline

- **Classification:** Deferred implementation
- **Current behavior:** Runtime nodes carry `baseValue`. Stance changes replace
  both current value and `baseValue`. Stance costs clamp the two values
  independently after subtracting the cost. Resource consequences first clamp
  the baseline change, then apply that actual change to the current value. This
  makes transactions survive later persistent recalculation.
- **Evidence:** `src/simulation/domain/runtime.ts:4-9`,
  `src/simulation/engine/playerActions.ts:55-83`, and
  `src/simulation/engine/incidents.ts:89-100`.
- **Documentation gap:** Static `baseline` is documented, but a mutable runtime
  baseline is not. The longer-term interaction between Resource transactions,
  baselines, and persistent recalculation is explicitly TBD.
- **Owner:** `GAME_DESIGN.md` for semantics and `ARCHITECTURE.md` for the runtime
  representation after the semantic decision.

### 11. Consequences execute sequentially with intermediate clamping

- **Classification:** Omission
- **Current behavior:** Consequences are applied in declaration order. Each
  Resource consequence sees the result of the previous consequence and clamps
  immediately, so reordering debits and credits can change the final value near
  a domain boundary. Grudge IDs also include the consequence index and current
  Grudge-array length.
- **Evidence:** `src/simulation/engine/incidents.ts:69-113`.
- **Documentation gap:** The documents define consequence kinds but not ordering,
  atomicity, or clamping across a consequence list.
- **Owner:** `GAME_DESIGN.md`; generated-ID structure can remain an
  implementation detail unless saves or replay expose it.

### 12. Cooldown boundaries and Dilemma trigger timing

- **Classification:** Granularity gap
- **Current behavior:** An incident is off cooldown when
  `currentTurn - lastTriggeredTurn >= cooldownTurns`. A Dilemma records its
  trigger and increments `timesTriggered` when selected, before the player
  resolves it. Recurrence is otherwise unlimited.
- **Evidence:** `src/simulation/engine/incidents.ts:46-54` and
  `src/simulation/engine/incidents.ts:181-195`.
- **Documentation gap:** Cooldowns and trigger counts are represented, but their
  exact boundary and the selection-versus-resolution timestamp are not defined.
- **Owner:** `GAME_DESIGN.md`.

### 13. Incident inputs ignore node activation and consume RNG per influence

- **Classification:** Granularity gap
- **Current behavior:** A node influence always reads the node's stored value,
  even if that node is inactive. Each `_random_` influence consumes one new RNG
  value when its candidate is visited. Under the current Event loop, earlier
  Event consequences can alter values used to score later Events.
- **Evidence:** `src/simulation/engine/incidents.ts:29-43` and
  `src/simulation/engine/incidents.ts:128-167`.
- **Documentation gap:** The score formula is documented, but activation,
  random-sample cadence, and snapshot consistency across incident candidates
  are not. The broader multiple-incident behavior is already acknowledged in
  `ARCHITECTURE.md`.
- **Owner:** `GAME_DESIGN.md`.

## Runtime and public-interface granularity

### 14. The canonical runtime contract is more specific than the documents

- **Classification:** Granularity gap
- **Current behavior:** The public runtime state includes a mutable node
  `baseValue`, redundant `isForced`, Effect `lastContribution`, incident trigger
  counts, pending-Dilemma trigger turns, generated Grudge metadata, and a typed
  history union.
- **Evidence:** `src/simulation/domain/runtime.ts:3-60`.
- **Documentation gap:** `GAME_DESIGN.md` provides an “at least” inventory and
  `DATA_FORMAT.md` provides a static-versus-runtime mapping, but neither defines
  this runtime contract. `DATA_FORMAT.md` intentionally owns authored content,
  not save/session representation.
- **Owner:** `ARCHITECTURE.md` if these fields are architectural invariants. A
  future versioned save-format document should own serialized runtime fields.

### 15. Player-visible history has an implicit recording policy

- **Classification:** Granularity gap
- **Current behavior:** Successful Stance changes, Event triggers, Situation
  starts/stops, and resolved Dilemmas create history entries. Dilemma selection
  alone does not. Entries embed presentation-ready English and, for Stances and
  Situations, assume percentage formatting.
- **Evidence:** `src/simulation/engine/playerActions.ts:86-101`,
  `src/simulation/engine/incidents.ts:146-166`, and
  `src/simulation/engine/evaluatePersistentState.ts:137-156`.
- **Documentation gap:** History is optional runtime state in the design, but
  inclusion events, timing, payload meaning, localization boundary, and
  retention requirements are not specified.
- **Owner:** `GAME_DESIGN.md` for which occurrences are player-visible;
  `ARCHITECTURE.md` for structured data versus presentation-ready strings.

### 16. Command and transition result contracts are only examples in prose

- **Classification:** Granularity gap
- **Current behavior:** The public command union contains only `set-stance` and
  `resolve-dilemma`. Commands return `{ accepted, state, message }`; turns return
  `{ advanced, state, message, trace }`; rejected commands return the exact
  original state object.
- **Evidence:** `src/simulation/domain/commands.ts:3-14`,
  `src/simulation/domain/results.ts:3-25`, and
  `src/simulation/engine/playerActions.ts:11-13`.
- **Documentation gap:** `ARCHITECTURE.md` sketches these calls but does not
  define the current public command set, result discriminators, identity
  guarantee on rejection, or message contract.
- **Owner:** `ARCHITECTURE.md` if consumers may rely on these details; otherwise
  the TypeScript public API remains the source of truth and the documents should
  explicitly say so.

### 17. Calculation traces have a defined but undocumented shape

- **Classification:** Omission
- **Current behavior:** Every evaluated persistent non-Stance target emits
  baseline, total Effects, total Grudges, and final result. Inactive ordinary
  targets emit no trace. The session retains only the most recent turn's trace,
  and the current UI does not render it.
- **Evidence:** `src/simulation/domain/results.ts:3-10`,
  `src/simulation/engine/evaluatePersistentState.ts:121-166`, and
  `src/app/useGameSession.ts:69-81`.
- **Documentation gap:** `ARCHITECTURE.md` mentions traces only as returned and
  noncanonical data; it does not define their purpose, coverage, or lifetime.
- **Owner:** `ARCHITECTURE.md`.

### 18. Validation adds two representation rules not stated precisely

- **Classification:** Omission / granularity gap
- **Current behavior:** A discrete Stance must have at least two states, and
  Event and Dilemma IDs share one collision namespace.
- **Evidence:** `src/simulation/engine/validateScenario.ts:40-43` and
  `src/simulation/engine/validateScenario.ts:69-73`.
- **Documentation gap:** `DATA_FORMAT.md` requires unique, in-domain discrete
  values but does not set a minimum count. It requires IDs to be unique in their
  “applicable namespaces” without explicitly saying Events and Dilemmas share
  the incident namespace.
- **Owner:** `DATA_FORMAT.md`, after confirming that the implementation reflects
  intended content rules rather than an accidental restriction.

### 19. Validation and initialization expose concrete failure protocols

- **Classification:** Granularity gap
- **Current behavior:** `validateScenario` returns all discovered errors as a
  flat `readonly string[]`. `initializeScenario` always invokes it and throws one
  newline-joined `Error` when any diagnostics exist.
- **Evidence:** `src/simulation/engine/validateScenario.ts:3-10`,
  `src/simulation/engine/validateScenario.ts:118`, and
  `src/simulation/engine/initialize.ts:18-24`.
- **Documentation gap:** The loading contract requires actionable diagnostics
  but does not define aggregation, diagnostic shape, or whether initialization
  validates and throws versus accepting only trusted definitions.
- **Owner:** `ARCHITECTURE.md` for boundary behavior; diagnostic representation
  belongs with the loading/validation API.

### 20. Randomness has two undocumented execution policies

- **Classification:** Omission plus known architectural mismatch
- **Current behavior:** `advanceTurn` permits omission of its RNG and then uses
  `Math.random`. The browser instead creates a deterministic generator seeded
  only from the current turn, recreating it for each turn attempt; resetting and
  replaying the same turn sequence therefore repeats random samples.
- **Evidence:** `src/simulation/engine/incidents.ts:9-17`,
  `src/simulation/engine/advanceTurn.ts:20-24`, and
  `src/app/useGameSession.ts:11-21`.
- **Documentation gap:** `ARCHITECTURE.md` already notes that RNG construction is
  misplaced, but it does not capture the optional engine default, seed policy,
  reproducibility behavior, or ownership of RNG state.
- **Owner:** `GAME_DESIGN.md` for replay/randomness guarantees and
  `ARCHITECTURE.md` for dependency injection and ownership.

### 21. Engine-generated feedback assumes normalized percentages and Authority

- **Classification:** Omission with boundary implications
- **Current behavior:** Engine messages and history format Stance and Situation
  values as percentages and name every Stance-cost Resource “Authority,” even
  though domains need not be normalized and costs reference arbitrary Resource
  IDs.
- **Evidence:** `src/simulation/engine/playerActions.ts:60-64`,
  `src/simulation/engine/playerActions.ts:86-99`, and
  `src/simulation/engine/evaluatePersistentState.ts:140-155`.
- **Documentation gap:** `ARCHITECTURE.md` allows result messages but does not
  decide whether presentation-ready wording and formatting belong in the engine
  or in UI projections. Its Scenario-specific-assumption warning mentions
  reusable UI, not the engine.
- **Owner:** `ARCHITECTURE.md`.

## Presentation behavior currently left implementation-local

These behaviors are real and observable, but the four documents intentionally
leave layout and styling as presentation concerns. They should not be added to
the authoritative mechanics or data contract unless they are promoted to
stable product requirements:

- The graph uses fixed type columns, authored declaration order for rows, fixed
  spacing, and no Resource column (`src/ui/graph/projectToReactFlow.ts:13-45`).
- Graph edges omit `_default_` Effects and Effects with a hidden endpoint. Edge
  color, width, and animation encode the sign and magnitude of the latest
  contribution (`src/ui/graph/projectToReactFlow.ts:57-85`).
- Graph nodes always display values as clamped `0..100` percentages even though
  simulation domains need not be normalized
  (`src/ui/graph/SimulationNode.tsx:4-20`).
- An omitted continuous Stance step becomes `0.01` in the browser, a UI default
  not defined by `DATA_FORMAT.md` (`src/ui/panels/StanceControls.tsx:31-39`).
- The Chronicle displays only the latest eight entries, newest first, and is
  hidden below the desktop breakpoint (`src/App.tsx:135-145` and
  `src/App.css:536-545`).
- The pending Dilemma is a blocking modal with no dismiss action
  (`src/ui/panels/DilemmaPanel.tsx:8-33`). This matches turn blocking but adds a
  specific interaction policy.

If a UI specification is introduced, it would be a better owner for these
decisions than `ARCHITECTURE.md`.

## Stale statement in the current documents

- `ARCHITECTURE.md` says initialization currently recalculates nodes
  immediately. The current initializer instead preserves authored values and
  only seeds Effect histories (`src/simulation/engine/initialize.ts:26-49`).
  The architecture assessment should be updated independently of any decision
  about `lastContribution` at turn zero.

## Reviewed but not counted as missing documentation

- The canonical Scenario-format migration is already itemized in
  `DATA_FORMAT.md`.
- Multiple-incident traversal, direct example-Scenario wiring, misplaced RNG
  construction, fixed-year/one-Resource UI assumptions, broad barrel exports,
  absent persistence, and the engine-test ESM problem are already recorded in
  `ARCHITECTURE.md`.
- Synchronous snapshots, Situation hysteresis, Inertia averaging, Grudge
  contribute-before-decay behavior, pending-Dilemma blocking, static
  prerequisites, and consequence kinds are already described at sufficient
  behavioral granularity.
- Example Scenario balance values, copy, and content topology belong in authored
  Scenario content rather than the four repository-wide documents.
- CSS measurements, colors, fonts, and responsive breakpoints are ordinary
  implementation details unless the project adopts a stable UI specification.

## Implementation contradictions excluded from promotion

The following are implementation-versus-document discrepancies, not missing
design to be copied from code:

- A legal Stance change does not activate an inactive Stance because the current
  assignment preserves `false` (`src/simulation/engine/playerActions.ts:79-84`).
- Initialization seeds Inertia histories but records every Effect's
  `lastContribution` as zero, despite the design saying a stable source begins
  at its steady contribution (`src/simulation/engine/initialize.ts:39-49`).
- The current incident traversal can resolve all eligible Events and then the
  first eligible Dilemma, contrary to the one-incident invariant. This conflict
  is already documented in `ARCHITECTURE.md`.
- The implementation still consumes the MVP Scenario representation rather than
  the canonical versioned representation. This migration is already documented
  in `DATA_FORMAT.md`.

These items require implementation correction or an explicit authoritative
design change; they are not documentation omissions.

## Suggested review order

1. Resolve the deferred mechanics already encoded by findings 1, 3, 4, 10, and
   13 without treating current behavior as authoritative by default.
2. Specify participation and temporal boundaries in findings 5-9 and 11-12.
3. Decide which runtime/API guarantees in findings 14-21 are stable enough to
   document rather than leaving them as replaceable implementation details.
4. Keep presentation-only behavior out of the four authoritative documents
   unless a dedicated UI specification or explicit product requirement is
   created.

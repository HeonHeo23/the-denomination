# Architecture Inventory and Decision Record

## Status and scope

This document is an inspection-derived architecture inventory for the current
repository. It consolidates the major patterns and decisions visible in the
four authoritative documents and in the implementation. It is not itself a new
source of truth and does not promote current defects or provisional mechanics
into intended design.

Evidence reviewed:

- all four repository-level source-of-truth documents;
- domain, engine, Scenario, session, projection, and React modules;
- package scripts and TypeScript/Vite configuration;
- engine tests and recent implementation/documentation history;
- current import direction and state-transition paths.

Status labels used below:

- **Established**: documented and substantially represented in code.
- **Partial**: intended architecture exists, but its boundary is incomplete.
- **Implemented only**: code contains a decision that is not yet authoritative.
- **Deferred**: explicitly outside the current MVP or awaiting design.
- **Deviation**: current code does not meet the documented architecture.

## Architectural style

| Pattern or decision                 | Current interpretation                                                                                                            | Status      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Client-side modular monolith        | One Vite/React application contains content, simulation, session orchestration, and presentation modules.                         | Established |
| Layered dependency direction        | Domain contracts sit at the bottom; the simulation API shields application and UI consumers from engine internals.                | Established |
| Functional core, imperative shell   | Pure snapshot-returning engine functions form the core; React state, user interaction, and nondeterministic dependencies sit out. | Partial     |
| Data-driven simulation              | A Scenario supplies nodes, Effects, incidents, prerequisites, and initial conditions rather than hard-coded engine entities.      | Established |
| Immutable snapshot transitions      | Commands and turns return new `SimulationState` snapshots and preserve their inputs.                                              | Established |
| Single-writer session ownership     | One React hook owns the active runtime snapshot and exposes semantic actions to composition.                                      | Established |
| Command-oriented mutation boundary  | UI intent becomes a discriminated simulation command; components do not calculate game transitions.                               | Established |
| Projection-oriented read boundary   | Canonical Scenario/runtime data is converted into disposable React Flow view data.                                                | Established |
| Stable-ID references                | Definitions, runtime maps, Effects, incidents, and commands connect through IDs rather than object identity or labels.            | Established |
| Explicit runtime dependencies       | Turn advancement accepts an RNG port so nondeterminism can be injected.                                                           | Partial     |
| Validation gateway                  | Scenario validation precedes initialization and should produce trusted definitions.                                               | Partial     |
| Ports-and-adapters extension points | RNG is an active port; persistence and runtime content loading are planned outer adapters.                                        | Partial     |
| No speculative infrastructure       | The repository avoids service containers, entity classes, event buses, repositories, and a general rules framework.               | Established |

The implementation is closest to a **functional core with an imperative React
shell**, inside a small layered modular monolith. It uses command/query
separation in the modest sense that commands produce snapshots while UI
projections derive read models; it is not a distributed CQRS system.

## Module boundaries

| Boundary                     | Current location                                      | Owns                                                                                         | May depend on                                                                   |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Domain contracts             | `src/simulation/domain`                               | Static types, runtime types, semantic commands, transition results                           | Other domain contracts only                                                     |
| Scenario validation/loading  | `src/simulation/engine/validateScenario.ts` currently | Content checks; intended future normalization/loading boundary                               | Domain contracts                                                                |
| Simulation engine            | `src/simulation/engine`                               | Initialization, Effect evaluation, commands, consequences, incidents, and turn orchestration | Domain contracts and engine-internal helpers                                    |
| Simulation facade            | `src/simulation/index.ts`                             | The public import surface for consumers outside the simulation package                       | Selected domain and engine exports                                              |
| Authored Scenario content    | `src/scenarios`                                       | JSON-compatible static playable definitions                                                  | Simulation/domain types only; never UI or runtime state                         |
| Application session          | `src/app`                                             | Active Scenario/state, command and turn orchestration, transient messages/traces, reset      | Simulation public API and injected outer dependencies                           |
| UI projections               | `src/ui/graph/projectToReactFlow.ts`                  | Conversion of canonical state into React Flow nodes and edges                                | Simulation public API and React Flow view types                                 |
| React components/composition | `src/App.tsx`, `src/ui`                               | Rendering, local form drafts, interaction callbacks, and composition                         | Session API, UI projections, simulation public types, React, and React Flow     |
| Persistence adapter          | Not implemented                                       | Versioned save/load and migration outside the engine                                         | Session-facing contracts and canonical runtime data, once explicitly introduced |

### Enforced inward boundary

The simulation domain and engine contain no React, React Flow, DOM, browser,
storage, or application-session imports. This is the most important physical
dependency boundary in the repository.

### Public facade

`src/simulation/index.ts` is a facade over the simulation package. Current
external consumers import through it, including Scenario content, the session
hook, and UI projections/components. The facade currently exports every domain
type plus these operations:

```ts
validateScenario(scenario) -> readonly string[]
initializeScenario(scenario) -> SimulationState
executeCommand(scenario, state, command) -> CommandResult
advanceTurn(scenario, state, random?) -> TurnResult
```

The facade is architecturally useful, but its wildcard type exports make it
broader than the intended stable boundary. The existing architecture document
already identifies this as a growth risk.

## State and data ownership

### Static authored definitions

- `ScenarioDefinition` is the only top-level playable content abstraction.
- Definitions are modeled as deeply `readonly` TypeScript structures and are
  treated as immutable by convention; they are not frozen at runtime.
- Scenario content contains IDs and declarative tagged objects, not callbacks,
  classes, React values, or runtime object references.
- The current example still uses the MVP representation. The intended canonical
  versioned representation and normalization rules live in `DATA_FORMAT.md`.

### Canonical runtime snapshot

`SimulationState` is separate from Scenario content and contains:

- Scenario identity and current turn/year;
- ID-keyed node and Effect runtime maps;
- mutable-in-time node values, runtime baselines, and activation flags;
- per-Effect source history and latest contribution;
- active Grudges and creation metadata;
- incident trigger counts and last-trigger turns;
- an optional pending Dilemma;
- player-visible history.

Snapshots are immutable by API contract. Transitions shallow-copy affected
collections and replace changed records, structurally sharing untouched data.
No canonical state is held inside React Flow nodes or component-local state.

### Session and transient state

`useGameSession` is the sole browser-session owner. Alongside the canonical
snapshot it stores the latest human-readable result message and the latest
calculation trace. Those values are presentation/session concerns and are not
written back into Scenario definitions or React Flow data.

### Disposable view data

The graph adapter creates React Flow node positions, edge styles, labels,
animation flags, and selection/drag-compatible objects from Scenario and
runtime state. This projection can be regenerated and is never passed back to
the simulation as canonical state.

## Transition and data flows

### Scenario initialization

Intended flow:

```text
Scenario source -> parse/accept -> validate -> normalize
                -> trusted immutable definition -> initialize runtime snapshot
```

Current flow:

```text
compiled example Scenario -> useGameSession -> initializeScenario
                          -> validateScenario -> runtime snapshot
```

The validator is present, and initialization refuses reported errors, but a
dedicated loading/normalization boundary does not yet exist.

### Player command

```text
component callback
  -> session functional state update
  -> executeCommand(Scenario, prior snapshot, semantic command)
  -> accepted new snapshot or rejected original snapshot
  -> session stores result message
  -> React rerenders from the selected snapshot
```

Only two command variants currently cross this boundary: setting a Stance and
resolving a pending Dilemma. Cost checks, prerequisite checks, consequence
application, and history creation remain inside the simulation package.

### Turn advancement

```text
Advance action
  -> session constructs RNG
  -> advanceTurn(Scenario, prior snapshot, RNG)
  -> pending-Dilemma guard
  -> turn orchestration in one engine module
  -> next snapshot + calculation trace + message
  -> session replaces state and transient feedback
```

The orchestrator intentionally localizes unresolved within-turn ordering. The
current concrete order is implementation behavior, not an authoritative design
decision; `TEMP.md` records the detailed semantic gaps.

### Rendering

```text
Scenario + SimulationState
  -> ordinary React panels for Stances, Resources, Situations, history, Dilemma
  -> graph projection for visible nodes and Effects
  -> React Flow rendering and interaction state
```

UI components dispatch semantic callbacks. Dragging, selecting, or laying out
graph elements does not modify simulation state.

### Reset

Reset discards the active snapshot, revalidates/reinitializes the same Scenario,
clears the latest trace, and replaces transient feedback. There is no persisted
or cross-session state.

## Core architectural decisions

### Pure, synchronous simulation

- Persistent evaluation reads one prior snapshot for every target.
- Writes are deferred until Effect contributions have been sampled.
- Engine functions create replacement snapshots instead of mutating inputs.
- Equal Scenario/state/dependency inputs are intended to produce equal outputs.
- There is no iterative solver, background process, clock, worker, or async
  engine API.

### Declarative polymorphism

The model uses discriminated unions rather than class hierarchies:

- five node definition variants;
- continuous and discrete Stance controls;
- constant, linear, power, and product Effect responses;
- Event and Dilemma incidents;
- Grudge, Resource, and activation consequences;
- semantic command variants.

This keeps content serializable, makes switch exhaustiveness available to
TypeScript, and avoids executable behavior inside authored content.

### ID-indexed canonical state

Authored arrays preserve declaration order and are convenient for content.
Runtime nodes, Effects, and incidents are normalized into ID-keyed records for
lookup. Stable IDs bridge static definitions, runtime state, commands, history,
and projections.

### Explicit results instead of engine callbacks

Commands and turns return state plus status/message data. Turn results also
carry calculation traces. The engine does not call into application or UI code,
and presentation does not register mechanics callbacks with the engine.

### Dependency injection for nondeterminism

`RandomSource` is a narrow port with `next(): number`. Tests inject a fixed
source, while the browser currently creates a deterministic per-turn generator.
The engine also has a `Math.random` default, which weakens the intended rule that
runtime nondeterminism be explicitly injected.

### Framework containment

React owns composition and local interaction state. React Flow imports are
confined to graph projection/components. Neither framework appears in domain or
engine contracts, keeping the simulation usable from tests or another client.

### Validation before trusted use

Authored references and type-specific constraints are checked before runtime
state is created. Validation aggregates errors instead of failing at the first
one. The current validator accepts an already typed MVP object and returns flat
strings; it is not yet the unknown-input parser, canonical normalizer, or
content-path diagnostic boundary required by the intended architecture.

### Persistence remains an outer adapter

No persistence implementation exists. The intended adapter belongs behind the
session layer and must version Scenario compatibility and runtime data without
serializing React or React Flow state. Persistence must not be added to the
engine or Scenario definition.

## Presentation architecture

- `App.tsx` is the composition root for the current single Scenario.
- `useGameSession` exposes narrow actions rather than its React state setter.
- Stance controls keep draft form state locally and dispatch only on Apply.
- The pending-Dilemma panel emits a choice ID; consequence logic remains in the
  engine.
- Graph projection combines static labels/visibility with runtime
  values/activation/contributions.
- React Flow positions and edge appearance are replaceable view policy.
- Result messages use an ARIA live region, and the Dilemma is rendered as a
  modal dialog.

The current UI and some engine-generated strings assume `0..1` percentages, an
annual turn, the example Scenario, and an Authority Resource. These assumptions
are implementation shortcuts, not reusable architectural contracts.

## Quality and verification architecture

- TypeScript strictness, no-unused checks, and no-fallthrough checks are enabled.
- Application and Node/Vite configuration use separate project references.
- `npm run check` performs source formatting, linting, TypeScript compilation,
  and a production Vite build.
- Engine tests compile independently of React and use injected deterministic
  randomness.
- The engine test is a direct Node assertion script rather than a test-framework
  suite.
- `npm run check` does not invoke `npm run test:engine`.
- The engine test currently compiles but cannot execute because emitted
  extensionless ESM imports do not resolve under the active Node configuration.

This arrangement protects the framework boundary at compile time, but the main
validation command can pass while behavioral engine tests do not run.

## Major deviations and migration boundaries

| Area                       | Intended boundary                                                                  | Current state                                                                                             | Status           |
| -------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------- |
| Scenario representation    | Versioned canonical format from `DATA_FORMAT.md`                                   | Engine and example consume the older MVP field names                                                      | Deviation        |
| Loading                    | Parse/accept, validate, normalize, then initialize trusted content                 | Compiled content is passed directly to initialization, which invokes a partial validator                  | Partial          |
| Scenario selection         | Session owns the selected validated Scenario                                       | `App.tsx` directly imports and repeatedly references one example                                          | Deviation        |
| RNG ownership              | Application boundary injects explicit runtime dependencies                         | Generator construction is embedded in the React hook; engine also offers a global-random default          | Deviation        |
| Incident selection         | Candidate calculation separate from a still-TBD single-incident selection policy   | Engine applies every eligible Event sequentially, then selects the first eligible Dilemma                 | Deviation        |
| Runtime baseline semantics | Await authoritative Resource/baseline rules                                        | Runtime `baseValue` is mutable and direct transactions update it                                          | Implemented only |
| Public simulation facade   | Narrow, intentional stable exports                                                 | Wildcard exports expose all domain and runtime types                                                      | Partial          |
| UI generality              | Reusable components avoid Scenario-specific time, Resource, and domain assumptions | Composition and reusable components contain annual, Authority, first-Resource, and percentage assumptions | Deviation        |
| Persistence                | Versioned adapter behind session when required                                     | Not implemented, as permitted for the MVP                                                                 | Deferred         |
| Engine-test execution      | Browser-free executable engine checks                                              | Compilation succeeds; Node ESM resolution prevents execution                                              | Deviation        |

`ARCHITECTURE.md` also contains one stale assessment: it says initialization
recalculates nodes immediately, while current initialization preserves authored
turn-zero values and seeds only Effect histories.

## Explicit non-goals and absent infrastructure

The current architecture deliberately has no:

- server, database, remote API, authentication, or multiplayer boundary;
- persistence implementation or save migration system;
- runtime content-file loader or remote Scenario registry;
- dependency-injection container or service locator;
- entity classes, ORM, event bus, or repository abstraction;
- general-purpose expression parser or executable content callbacks;
- iterative equilibrium solver;
- global React store separate from the session hook;
- canonical React Flow state.

Adding any of these would require demonstrated need and, where mechanics or
content representation change, an update to the applicable authoritative
document first.

## Decision-preserving change rules

1. Read the applicable source-of-truth documents before changing mechanics,
   boundaries, or content representation.
2. Keep static definitions, canonical runtime snapshots, transition results,
   transient session state, and disposable view data distinct.
3. Route application and UI imports through the simulation facade; keep engine
   internals private to the simulation package.
4. Express player mutations as semantic commands and implement their mechanics
   in pure engine transitions.
5. Inject nondeterminism and future I/O at outer boundaries rather than importing
   browser or storage facilities into the engine.
6. Preserve shared-prior-snapshot evaluation and stable-ID references unless
   authoritative design explicitly changes them.
7. Validate and normalize authored content before initialization; do not make
   the engine support multiple competing Scenario representations.
8. Treat React Flow data as regenerable output and never persist or simulate
   through it.
9. Add engine tests for behavior changes and run both repository checks and the
   independent engine-test command.
10. Keep unresolved mechanics localized and visible instead of encoding the same
    provisional choice across content, engine, session, and UI layers.

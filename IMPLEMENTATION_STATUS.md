# Implementation Status

This document is a non-authoritative implementation inventory. It records the
current state of the codebase and known gaps; it does not redefine game
mechanics, architecture, or the canonical content format.

The authoritative sources remain:

- `GAME_DESIGN.md` for mechanics and simulation semantics;
- `ARCHITECTURE.md` for module responsibilities and dependency boundaries;
- `DATA_FORMAT.md` for Scenario and game-content representation;
- `AGENTS.md` for repository-level working rules.

Statuses used here are:

- **Implemented** — the behavior is present and covered by the current code or
  tests;
- **Partial** — a supported subset exists, but the complete intended behavior
  is not implemented;
- **Deferred** — intentionally postponed by the authoritative design;
- **Unsupported** — represented or reserved by the design/format but rejected
  or unavailable in the current implementation.

## Current implementation

| Area                                   | Status      | Implementation                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scenario loading and trust boundary    | Implemented | `src/simulation/engine/validateScenario.ts`, `loadScenario.ts`                                              | Validates content, references, domains, fields, and cycles; then clones, normalizes, and freezes the definition.                                                                                                                                                                                                                                        |
| Turn-zero initialization               | Implemented | `src/simulation/engine/initialize.ts`                                                                       | Preserves initial values, seeds Effect histories, and snapshots the declared start turn and year.                                                                                                                                                                                                                                                       |
| Runtime activation                     | Implemented | `src/simulation/domain/runtime.ts`, `initialize.ts`, `evaluatePersistentState.ts`                           | `isActive` controls participation; `isForced` prevents ordinary deactivation. Forced nodes are active.                                                                                                                                                                                                                                                  |
| Activation schema migration            | Implemented | `src/simulation/domain/definitions.ts`, `validateScenario.ts`, `src/scenarios/example`                      | Scenarios use `initial.isActive` and `initial.isForced`; legacy activation strings are rejected.                                                                                                                                                                                                                                                        |
| Factions and Movements                 | Implemented | Simulation, Scenario, UI, saves                                                                             | Forced-active Faction nodes, static groups, Scenario-defined metric catalogs, explicit sum constraints, grouped graph/dossiers, and direct node references; campaigns use Situations.                                                                                                                                                          |
| Persistent Effects and inertia         | Implemented | `src/simulation/engine/evaluatePersistentState.ts`                                                          | Uses synchronous snapshots and per-Effect history. Newly activated Situations exert Effects starting next turn.                                                                                                                                                                                                                                         |
| Resource balances                      | Implemented | `src/simulation/engine/advanceTurn.ts`, `evaluatePersistentState.ts`, `playerActions.ts`, `consequences.ts` | Clamped Resources discard overflow and underflow at turn start. Flows, costs, and consequences can move the balance outside bounds until the next turn. Unclamped Resources retain all changes.                                                                                                                                                         |
| Static conditions and requirements     | Partial     | `src/simulation/engine/shared.ts`, `playerActions.ts`, `evaluatePersistentState.ts`                         | Scenario conditions are matched against node requirements for supported checks.                                                                                                                                                                                                                                                                         |
| Stance assessment and execution        | Implemented | `src/simulation/engine/playerActions.ts`                                                                    | Supports Stance changes, enactment, and non-forced repeal, including fixed transition costs.                                                                                                                                                                                                                                                            |
| Application session ownership          | Implemented | `src/app/gameSession.ts`, `useGameSession.ts`                                                               | A reducer owns the active Scenario, runtime snapshot, messages, traces, commands, turn advancement, reset, and validated restoration.                                                                                                                                                                                                                   |
| Scenario catalog and launcher          | Implemented | `src/app/scenarioCatalog.ts`, `src/App.tsx`, `src/ui/landing`, `src/main.tsx`                               | Validates catalog entries and launches or continues a session. The catalog has one bundled Scenario.                                                                                                                                                                                                                                                    |
| Browser persistence                    | Partial     | `src/app/persistence.ts`                                                                                    | A versioned local save stores identity, Scenario/content identity, runtime state, and an optional validated Turn report. Current-slot restoration validates structure, references, and runtime invariants; no legacy-slot handling or ending reevaluation.                                                                                              |
| Domain-aware UI projection             | Partial     | `src/ui/formatValue.ts`, `src/ui/graph`, `src/ui/game`, `src/ui/panels`                                     | Provides domain-aware formatting, graph navigation, Crisis views, node search, dossiers, and Effect analysis. Faction metrics use shared accessible icons and structured labels across these surfaces, reports, and consequences. The graph shows active nodes and briefly retains just-ended nodes. Inactive Stances have a dedicated enactment index. |
| Interface audio                        | Implemented | `src/ui/sound`                                                                                              | UI-only Web Audio cues use an independently saved mute preference and are gesture-initialized, throttled, and cleaned up on unmount.                                                                                                                                                                                                                    |
| Dilemmas                               | Implemented | `src/simulation/engine/dilemmas.ts`, `src/ui/game/DilemmaDialog.tsx`                                        | One qualifying Dilemma queues per turn, selected randomly from all qualifying Dilemmas. Cooldowns, history, UI, and saves are supported. Choices support optional authored images with placeholder fallback. Resolved choices appear in a dedicated Decisions sheet projected from saved history. |
| Events                                 | Implemented | `src/simulation/engine/events.ts`, `advanceTurn.ts`, `src/ui/game/EventDetailDialog.tsx`                    | All qualifying Events resolve in ID order from the shared incident snapshot; automatic detail dialogs, report and Chronicle reopening, cooldowns, and saves are supported.                                                                                                                                                                              |
| Runtime prerequisites and consequences | Implemented | `prerequisites.ts`, `consequences.ts`                                                                       | Grouped node, turn, incident, and Situation-history predicates with shared validation and consequences.                                                                                                                                                                                                                                                 |
| Normal endings                         | Implemented | `resolveEnding.ts`, `EndingReportDialog.tsx`                                                                | Turn-only completion checks, prerequisite groups, prioritized outcomes, fallback, persistence, and reports.                                                                                                                                                                                                                                             |
| Scenario Game Overs                    | Implemented | `src/simulation/engine/evaluateGameOvers.ts`, `src/ui/game`                                                 | Crises track consecutive qualifying turns, apply warning and recovery consequences, combine terminal causes, block later actions, persist, and appear in reports.                                                                                                                                                                                       |

The bundled Money Resource is unclamped and can carry debt below -100. The existing insolvency
trajectory also qualifies at -30 Money, even without Financial Strain.

Prerequisite titles, descriptions, status, and optional node links share
`src/ui/game/projectPrerequisite.ts`.

The Game Over UI reuses Crisis projections and dossier navigation across
overview, sheet, dossier, and terminal reports. These presentation structures
are not part of simulation state or saves.
Ending reports show actors and selected readings with an illustration placeholder.
Faction and ordinary Effects use React Flow smooth-step edges; hovering a Faction Effect shows its group and metric endpoints.
Choice commands do not resolve endings. Saves with same-turn choice endings
fail validation, as do older saves missing required fields. The bundled Scenario reaches
Expansion in turn 1 (1981).

Saves retain node history, incident state, and Resource balance and flow. Known gaps:
initial `requires` checks, non-`0..1` Effect displays,
negative change costs, and a stale product-preview test.

## Deferred or incomplete areas

The following remain deferred or incomplete:

- runtime-prerequisite consumers beyond Game Overs, normal endings, and static
  `requires` derivation;
- complete within-turn phase ordering;
- injected or seedable runtime dependencies for deterministic replay;
- additional Scenario content beyond the bundled example;
- party affiliation, a possible future concept described in
  [GAME_DESIGN.md](GAME_DESIGN.md#deferred-decisions); no runtime
  or content representation exists;
- additional response-function and contextual-input semantics;
- turn-report expanded layout: expanding “Review all changes” may remove the
  collapsed layout’s bottom spacing; retain appropriate spacing while allowing
  the report body to scroll;
- gradual Stance implementation and the minister-like actors or offices
  intended to influence its pace; the design direction is recorded in
  `GAME_DESIGN.md`, but no target/progress state or such actor system exists;
- incompatible-Stance resolution and specialized governance procedures.

Changes to these areas require updating the appropriate authoritative document
before implementation when they introduce new mechanics or alter intended
semantics.

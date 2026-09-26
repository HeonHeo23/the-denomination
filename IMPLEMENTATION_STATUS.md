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

| Area | Status | Implementation | Notes |
| ---- | ------ | -------------- | ----- |
| Scenario loading and trust boundary | Implemented | `src/simulation/engine/validateScenario.ts`, `loadScenario.ts` | Validates content, references, domains, fields, and cycles; then clones, normalizes, and freezes the definition. |
| Turn-zero initialization | Implemented | `src/simulation/engine/initialize.ts` | Preserves initial values, seeds Effect histories, and snapshots the declared start turn and year. |
| Runtime activation | Implemented | `src/simulation/domain/runtime.ts`, `initialize.ts`, `evaluatePersistentState.ts` | `isActive` controls participation; `isForced` prevents ordinary deactivation. Forced nodes are active. |
| Activation schema migration | Implemented | `src/simulation/domain/definitions.ts`, `validateScenario.ts`, `src/scenarios/example` | Scenarios use `initial.isActive` and `initial.isForced`; legacy activation strings are rejected. |
| Persistent Effects and inertia | Implemented | `src/simulation/engine/evaluatePersistentState.ts` | Uses synchronous snapshots and per-Effect history. Newly activated Situations exert Effects starting next turn. |
| Static conditions and requirements | Partial | `src/simulation/engine/shared.ts`, `playerActions.ts`, `evaluatePersistentState.ts` | Scenario conditions are matched against node requirements for supported checks. |
| Stance assessment and execution | Implemented | `src/simulation/engine/playerActions.ts` | Supports Stance changes, enactment, and non-forced repeal, including fixed transition costs. |
| Application session ownership | Implemented | `src/app/gameSession.ts`, `useGameSession.ts` | A reducer owns the active Scenario, runtime snapshot, messages, traces, commands, turn advancement, reset, and validated restoration. |
| Scenario catalog and launcher | Implemented | `src/app/scenarioCatalog.ts`, `src/App.tsx`, `src/ui/landing`, `src/main.tsx` | Validates catalog entries and launches or continues a session. The catalog has one bundled Scenario. |
| Browser persistence | Partial | `src/app/persistence.ts` | A versioned local save stores identity, Scenario/content identity, runtime state, and an optional validated Turn report. Restoration validates against current content. |
| Domain-aware UI projection | Partial | `src/ui/formatValue.ts`, `src/ui/graph`, `src/ui/game`, `src/ui/panels` | Provides domain-aware formatting, graph navigation, Crisis views, node search, dossiers, and Effect analysis. The graph shows active nodes and briefly retains just-ended nodes. Inactive Stances have a dedicated enactment index. |
| Interface audio | Implemented | `src/ui/sound` | UI-only Web Audio cues use an independently saved mute preference and are gesture-initialized, throttled, and cleaned up on unmount. |
| Events and Dilemmas | Unsupported | `src/simulation/engine/validateScenario.ts`, `loadScenario.ts` | Nonempty incident content is rejected; incident execution is not implemented. |
| Runtime prerequisites and consequences | Implemented | `src/simulation/engine/prerequisites.ts`, `consequences.ts` | Grouped node predicates and immutable Resource, Grudge, and activation consequences support Game Overs. |
| Scenario Game Overs | Implemented | `src/simulation/engine/evaluateGameOvers.ts`, `src/ui/game` | Crises track consecutive qualifying turns, apply warning and recovery consequences, combine terminal causes, block later actions, persist, and appear in reports. |

The Game Over UI reuses Crisis projections and dossier navigation across
overview, sheet, dossier, and terminal reports. These presentation structures
are not part of simulation state or saves.

Version 2 saves retain node history; older saves cannot be restored. Known gaps:
between-turn Stance saves, initial `requires` checks, non-`0..1` Effect displays,
negative change costs, and a stale product-preview test.

## Deferred or incomplete areas

The following remain deferred or incomplete:

- incident selection and complete Event/Dilemma execution;
- normal Ending definitions and resolution; Game Over precedence is established
  for that future phase;
- runtime-prerequisite consumers beyond Game Overs and static `requires` tag
  derivation;
- complete within-turn phase ordering;
- full Resource accumulation and baseline semantics;
- injected or seedable runtime dependencies for deterministic replay;
- additional Scenario content beyond the bundled example;
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

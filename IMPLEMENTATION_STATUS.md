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
| --- | --- | --- | --- |
| Scenario loading and trust boundary | Implemented | `src/simulation/engine/validateScenario.ts`, `loadScenario.ts` | Validates JSON-compatible content, references, domains, type-specific fields, cycles, accessors, and unknown fields; then clones, normalizes, and freezes the definition. |
| Turn-zero initialization | Implemented | `src/simulation/engine/initialize.ts` | Preserves declared initial node values, seeds Effect inertia histories, and creates the initial runtime snapshot at `scenario.start.turn` and optional year. |
| Runtime activation | Implemented | `src/simulation/domain/runtime.ts`, `initialize.ts`, `evaluatePersistentState.ts` | `isActive` controls participation. `isForced` separately prevents ordinary deactivation. Valid forced runtime state is active plus forced. |
| Activation schema migration | Implemented | `src/simulation/domain/definitions.ts`, `validateScenario.ts`, `src/scenarios/example` | Authored Scenario content uses `initial.isActive` and `initial.isForced`; legacy activation strings are rejected. |
| Persistent Effects and inertia | Implemented | `src/simulation/engine/evaluatePersistentState.ts` | Uses the synchronous snapshot model and per-Effect history; newly activated Situation outputs begin on the following turn. |
| Static conditions and requirements | Implemented | `src/simulation/engine/shared.ts`, `playerActions.ts`, `evaluatePersistentState.ts` | Scenario `conditions` are matched against node `requires` for supported eligibility checks. |
| Stance assessment and execution | Implemented | `src/simulation/engine/playerActions.ts` | Shared assessment covers range, discrete states, requirements, no-op changes, costs, available Resources, and `maxChange`; execution reassesses before applying the immutable transaction. |
| Application session ownership | Implemented | `src/app/gameSession.ts`, `useGameSession.ts` | A reducer owns the active validated Scenario, runtime snapshot, messages, traces, reset, commands, turn advancement, and validated snapshot restoration. |
| Scenario catalog and launcher | Implemented | `src/app/scenarioCatalog.ts`, `src/App.tsx`, `src/main.tsx` | The browser validates catalog entries, presents Scenario and identity setup, and launches or continues the selected session. The catalog currently contains one bundled Scenario. |
| Browser persistence | Implemented | `src/app/persistence.ts` | One versioned local save stores display identity, Scenario/content identity, and canonical runtime state. Restoration validates the complete record against current content before use. |
| Domain-aware UI projection | Implemented | `src/ui/formatValue.ts`, `src/ui/graph`, `src/ui/panels` | UI formatting and meters use node domains rather than assuming every value is a percentage. |
| Events and Dilemmas | Unsupported | `src/simulation/engine/validateScenario.ts`, `loadScenario.ts` | The format and design define incident shapes, but nonempty `events` or `dilemmas` content is currently rejected and no incident execution exists. |

## Deferred or incomplete areas

The following remain governed by the authoritative documents and are not
implemented by this status file:

- incident selection and complete Event/Dilemma execution;
- dynamic or state-derived prerequisites;
- complete within-turn phase ordering;
- full Resource accumulation and baseline semantics;
- migrations for future save-format or Scenario-content versions;
- injected or seedable runtime dependencies for deterministic replay;
- additional Scenario content beyond the bundled example;
- additional response-function and contextual-input semantics;
- incompatible-Stance resolution and specialized governance procedures.

Changes to these areas require updating the appropriate authoritative document
before implementation when they introduce new mechanics or alter intended
semantics.

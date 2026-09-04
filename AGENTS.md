# AGENTS.md

## Project

The Denomination is a turn-based causal simulation with a framework-independent
TypeScript engine and a React/React Flow client.

## Sources of Truth

Use repository documentation according to the following ownership:

- `GAME_DESIGN.md` — authoritative for game mechanics and simulation semantics.
- `ARCHITECTURE.md` — authoritative for intended software structure, module responsibilities, and dependency boundaries.
- `DATA_FORMAT.md` — authoritative for intended Scenario and game-content representation.
- `AGENTS.md` — authoritative for repository-level agent instructions.

Before design-sensitive or architecture-sensitive work, read the relevant source-of-truth documents.

If documents conflict:

1. `GAME_DESIGN.md` governs intended game behavior.
2. `ARCHITECTURE.md` governs implementation structure.
3. `DATA_FORMAT.md` governs content representation.
4. Existing code represents the current implementation, but does not override explicit documented semantics.

Report meaningful inconsistencies rather than silently reconciling them.

## Normative Language

Across repository documentation:

- **MUST** and **MUST NOT** identify required constraints.
- **SHOULD** and **SHOULD NOT** identify expected defaults that may be departed
  from only with a documented reason.
- **MAY** identifies permitted but optional behavior.

## Game Design

Implementation MUST preserve the mechanics defined in `GAME_DESIGN.md`.

In particular, treat it as authoritative for:

- simulation semantics;
- node types and behavior;
- Effects and inertia;
- Grudges;
- Events and Dilemmas;
- Scenarios;
- design invariants;
- explicitly deferred mechanics.

Do not introduce new mechanics when `GAME_DESIGN.md` is silent or explicitly defers them.

For design-sensitive changes, identify the relevant `GAME_DESIGN.md` sections before implementation.

## Architecture and Data

Preserve the documented boundaries in `ARCHITECTURE.md` unless the task explicitly requires an architectural change.

Use `DATA_FORMAT.md` when creating or modifying Scenario or game-content data.

Do not redefine game semantics in architecture or data-format code. If implementation needs a semantic change, update the authoritative design first or report the issue.

## Working Rules

- Inspect the relevant existing code before modifying it.
- Keep game mechanics separate from presentation concerns.
- Prefer simple structures over speculative abstractions.
- Do not duplicate concepts already owned by another documented subsystem.
- Add or update tests when behavior changes.
- Run relevant validation before finishing.

## Scope Discipline

Implement only what the current task requires.

Do not add speculative features, unrelated refactors, or deferred systems.

If implementation requires a genuinely unspecified game-design decision:

1. avoid inventing a substantial new mechanic;
2. use the least-assumptive behavior necessary to proceed when safe;
3. report the ambiguity clearly.

If an out-of-scope conflict with the documentation is discovered, report it instead of silently fixing unrelated code.

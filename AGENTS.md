# AGENTS.md

## Sources of Truth

Before designing or implementing game mechanics, read `GAME_DESIGN.md`.

`GAME_DESIGN.md` is authoritative for:

- simulation semantics;
- node types and behavior;
- Effects and inertia;
- Grudges;
- Events and Dilemmas;
- Scenarios;
- design invariants;
- explicitly deferred mechanics.

Implementation decisions MUST preserve the mechanics defined in `GAME_DESIGN.md`.

## Working Rules

- Do not invent new game mechanics when `GAME_DESIGN.md` is silent or explicitly defers them.
- For design-sensitive work, identify the relevant `GAME_DESIGN.md` sections before implementation.
- Keep implementation architecture separate from game-design semantics.
- Prefer simple, extensible structures that directly express the documented mechanics.

## Scope Discipline

Implement only what the current task requires.

Do not add speculative features or unrelated systems.

If implementation requires a genuinely unspecified game-design decision, make the least-assumptive choice necessary and report the ambiguity.

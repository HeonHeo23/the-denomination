# The Denomination

A turn-based causal simulation of a fictional Christian denomination. The current repository contains a deliberately small playable scenario that exercises the core model from `GAME_DESIGN.md`; it is not the full game or final game content.

## Run locally

Vite 8 and Oxlint require Node `20.19+` or `22.12+`.

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm run build
npm run lint
npm run test:engine
```

The engine test uses only TypeScript and Node, so it can also run under the older Node 18 runtime currently present in some development containers.

## Architecture

- `src/simulation/domain` defines immutable Scenario content and mutable runtime snapshots.
- `src/simulation/engine` contains pure initialization, command, turn, Effect, incident, inertia, Situation, and Grudge transitions. It does not import React.
- `src/scenarios` contains static playable configuration.
- `src/app` adapts the engine to the browser session.
- `src/ui/graph` projects canonical simulation state into disposable React Flow nodes and edges.

The MVP uses synchronous snapshot evaluation: each turn calculates every persistent target from the same prior state, its underlying baseline, active Effect contributions, and active Grudges. A Situation that activates during a turn begins exerting outgoing Effects on the following turn. Per-Effect inertia uses a moving average of recent source values, seeded from the scenario's starting state.

`GAME_DESIGN.md` remains authoritative whenever implementation details and game semantics intersect.

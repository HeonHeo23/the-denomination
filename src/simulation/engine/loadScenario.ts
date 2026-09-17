import type { ScenarioDefinition } from "../domain/definitions";
import { validateScenario } from "./validateScenario";

import type { ScenarioLoadResult } from "../domain/results";

/** Own a detached, immutable definition; normalization changes representation only. */
export function loadScenario(input: unknown): ScenarioLoadResult {
  const diagnostics = validateScenario(input);
  if (diagnostics.length) return { ok: false, diagnostics };
  const content = structuredClone(input) as ScenarioDefinition;
  const scenario: ScenarioDefinition = {
    ...content,
    conditions: content.conditions ?? [],
    events: content.events ?? [],
    dilemmas: content.dilemmas ?? [],
    gameOvers: (content.gameOvers ?? []).map((definition) => ({
      ...definition,
      stages: [...definition.stages]
        .sort((left, right) => left.atTurn - right.atTurn)
        .map((stage) => ({
          ...stage,
          consequences: stage.consequences ?? [],
        })),
      recovery: definition.recovery
        ? {
            ...definition.recovery,
            consequences: definition.recovery.consequences ?? [],
          }
        : undefined,
    })),
    nodes: content.nodes.map((node) => ({
      ...node,
      graphVisible: node.graphVisible ?? true,
    })),
    effects: content.effects.map((effect) => ({
      ...effect,
      inertiaTurns: effect.inertiaTurns ?? 1,
    })),
  };
  function freeze(value: object) {
    Object.values(value).forEach((child) => {
      if (child && typeof child === "object") freeze(child);
    });
    Object.freeze(value);
  }
  freeze(scenario);
  return { ok: true, scenario };
}

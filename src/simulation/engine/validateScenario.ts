import type { ScenarioDefinition } from "../domain/definitions";

/**
 * Checks authored Scenario structure and cross-references required by the
 * engine, returning every discovered diagnostic instead of failing fast.
 */
export function validateScenario(
  scenario: ScenarioDefinition,
): readonly string[] {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const effectIds = new Set<string>();

  for (const node of scenario.nodes) {
    if (nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    nodeIds.add(node.id);

    if (node.domain.min >= node.domain.max) {
      errors.push(`${node.id} has an invalid numeric domain`);
    }
    if (
      node.initialValue < node.domain.min ||
      node.initialValue > node.domain.max
    ) {
      errors.push(`${node.id} starts outside its numeric domain`);
    }
    if (
      node.baselineValue !== undefined &&
      (node.baselineValue < node.domain.min ||
        node.baselineValue > node.domain.max)
    ) {
      errors.push(`${node.id} has a baseline outside its numeric domain`);
    }
    if (node.type === "situation") {
      if (node.stopThreshold > node.startThreshold) {
        errors.push(`${node.id} stop threshold exceeds its start threshold`);
      }
    }
    if (node.type === "stance" && node.control.kind === "discrete") {
      if (node.control.states.length < 2) {
        errors.push(`${node.id} needs at least two discrete states`);
      }
    }
  }

  for (const effect of scenario.effects) {
    if (effectIds.has(effect.id))
      errors.push(`Duplicate effect id: ${effect.id}`);
    effectIds.add(effect.id);
    if (effect.source !== "_default_" && !nodeIds.has(effect.source)) {
      errors.push(`${effect.id} references missing source ${effect.source}`);
    }
    if (!nodeIds.has(effect.target)) {
      errors.push(`${effect.id} references missing target ${effect.target}`);
    }
    if (effect.inertiaTurns !== undefined && effect.inertiaTurns < 1) {
      errors.push(`${effect.id} has invalid inertia`);
    }
    if (effect.response.kind === "product") {
      for (const factor of effect.response.factors) {
        if (!nodeIds.has(factor)) {
          errors.push(`${effect.id} references missing factor ${factor}`);
        }
      }
    }
  }

  for (const node of scenario.nodes) {
    if (node.type !== "stance" || !node.cost) continue;
    const resource = scenario.nodes.find(
      ({ id }) => id === node.cost?.resourceId,
    );
    if (resource?.type !== "resource") {
      errors.push(`${node.id} cost does not reference a Resource`);
    }
  }

  return errors;
}

import type {
  NodeDefinition,
  NodeId,
  ScenarioDefinition,
} from '../domain/definitions'

export function indexNodes(
  scenario: ScenarioDefinition,
): Readonly<Record<NodeId, NodeDefinition>> {
  return Object.fromEntries(scenario.nodes.map((node) => [node.id, node]))
}

export function clampValue(value: number, node: NodeDefinition): number {
  if (!node.domain.clamp) return value
  return Math.min(node.domain.max, Math.max(node.domain.min, value))
}

export function isActive(activation: string): boolean {
  return activation === 'active' || activation === 'forced-active'
}


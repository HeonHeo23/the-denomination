import type {
  FactionDefinition,
  FactionGroupDefinition,
  FactionMetric,
  FactionMetricDefinition,
  NodeDefinition,
  ScenarioDefinition,
} from "../../simulation";

export interface FactionNodeContext {
  readonly group: FactionGroupDefinition;
  readonly metric: FactionMetricDefinition;
  readonly node: FactionDefinition;
}
export interface NodeDisplayInfo {
  readonly name: string;
  readonly metric: FactionMetric | undefined;
  readonly metricId: FactionMetric | undefined;
}
interface FactionGroupIndex {
  readonly definitions: ReadonlyMap<string, NodeDefinition>;
  readonly byNode: ReadonlyMap<string, FactionNodeContext>;
  readonly byGroup: ReadonlyMap<string, readonly FactionNodeContext[]>;
}

export interface FactionConstraintParticipantProjection {
  readonly nodeId: string;
  readonly groupName: string;
  readonly metricLabel?: string;
  readonly belongsToCurrentGroup: boolean;
}

export interface FactionConstraintProjection {
  readonly id: string;
  readonly name?: string;
  readonly maxTotal: number;
  readonly participants: readonly FactionConstraintParticipantProjection[];
}

const indexes = new WeakMap<ScenarioDefinition, FactionGroupIndex>();

export function getFactionGroupIndex(
  scenario: ScenarioDefinition,
): FactionGroupIndex {
  const cached = indexes.get(scenario);
  if (cached) return cached;
  const definitions = new Map(scenario.nodes.map((node) => [node.id, node]));
  const byNode = new Map<string, FactionNodeContext>();
  const byGroup = new Map<string, readonly FactionNodeContext[]>();
  for (const group of scenario.factionGroups ?? []) {
    const factionNodeContexts: FactionNodeContext[] = (
      scenario.factionMetrics ?? []
    ).map((metric) => ({
      group,
      metric,
      node: definitions.get(group.metrics[metric.id]) as FactionDefinition,
    }));
    byGroup.set(group.id, factionNodeContexts);
    for (const context of factionNodeContexts)
      byNode.set(context.node.id, context);
  }
  const index = { definitions, byNode, byGroup };
  indexes.set(scenario, index);
  return index;
}
export function findFactionContext(
  scenario: ScenarioDefinition,
  nodeId: string,
) {
  return getFactionGroupIndex(scenario).byNode.get(nodeId);
}
export function getNodeDisplayInfo(
  scenario: ScenarioDefinition,
  nodeId: string,
): NodeDisplayInfo {
  const context = findFactionContext(scenario, nodeId);
  return {
    name:
      context?.group.name ??
      getFactionGroupIndex(scenario).definitions.get(nodeId)?.name ??
      nodeId,
    metric: context?.metric.label,
    metricId: context?.metric.id,
  };
}

/** Project constraints that involve a group's faction nodes. */
export function projectFactionConstraints(
  scenario: ScenarioDefinition,
  groupId: string,
): FactionConstraintProjection[] {
  const groupNodeContexts = getFactionGroupIndex(scenario).byGroup.get(groupId);
  if (!groupNodeContexts) return [];

  const constraintIds = new Set(
    groupNodeContexts.flatMap(({ node }) =>
      node.constraintId ? [node.constraintId] : [],
    ),
  );

  return (scenario.constraints ?? [])
    .filter((constraint) => constraintIds.has(constraint.id))
    .map((constraint) => ({
      id: constraint.id,
      ...(constraint.name === undefined ? {} : { name: constraint.name }),
      maxTotal: constraint.maxTotal,
      participants: scenario.nodes
        .filter(
          (node) =>
            node.type === "faction" && node.constraintId === constraint.id,
        )
        .map((node) => {
          const context = findFactionContext(scenario, node.id);
          const nodedisplayinfo = getNodeDisplayInfo(scenario, node.id);
          return {
            nodeId: node.id,
            groupName: nodedisplayinfo.name,
            ...(nodedisplayinfo.metric
              ? { metricLabel: nodedisplayinfo.metric }
              : {}),
            belongsToCurrentGroup: context?.group.id === groupId,
          };
        }),
    }));
}

/** Adapt names for display while retaining the metric ID used for navigation. */
export function projectNodeForDisplay(
  scenario: ScenarioDefinition,
  node: NodeDefinition,
): NodeDefinition {
  const context = findFactionContext(scenario, node.id);
  return context
    ? {
        ...node,
        name: context.group.name,
        description: context.group.description,
      }
    : node;
}
export function createFactionGraphId(groupId: string) {
  return `faction-group:${groupId}`;
}

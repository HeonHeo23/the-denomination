import { getFactionGroupIndex } from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";

export interface NodeSearchEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly nodeType: string;
  readonly category: string;
  readonly factionCategory?: string;
  readonly factionMetric?: FactionMetricDefinition;
  readonly isActive: boolean;
  readonly isForced: boolean;
  readonly isGraphVisible: boolean;
  readonly isOnBoard: boolean;
  readonly searchText: string;
}

export function projectNodeSearchEntries(
  scenario: ScenarioDefinition,
  state: SimulationState,
): NodeSearchEntry[] {
  const index = getFactionGroupIndex(scenario);
  const ordinary: NodeSearchEntry[] = scenario.nodes
    .filter((node) => node.type !== "faction")
    .map((definition) => {
      const runtime = state.nodes[definition.id];
      const visible = definition.graphVisible !== false;
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        nodeType: definition.type,
        category: definition.category ?? "Other concerns",
        isActive: runtime.isActive,
        isForced: runtime.isForced,
        isGraphVisible: visible,
        isOnBoard: visible && runtime.isActive,
        searchText:
          `${definition.name} ${definition.description} ${definition.category ?? ""} ${definition.type} ${runtime.isActive ? "active" : "inactive"} ${runtime.isForced ? "forced active" : ""}`.toLocaleLowerCase(),
      };
    });
  const factionEntries: NodeSearchEntry[] = [...index.byGroup.values()].flatMap(
    (factionNodeContexts) =>
      factionNodeContexts.map((context) => {
        const first = factionNodeContexts[0];
        return {
          id: context.node.id,
          name: first.group.name,
          description: first.group.description,
          nodeType: "faction",
          category: first.node.category ?? "Factions",
          factionCategory: context.node.factionCategory,
          factionMetric: context.metric,
          isActive: true,
          isForced: true,
          isGraphVisible: true,
          isOnBoard: true,
          searchText:
            `${first.group.name} ${first.group.description} faction ${context.node.factionCategory} ${context.metric.label}`.toLocaleLowerCase(),
        };
      }),
  );
  return [...ordinary, ...factionEntries].sort(
    (left, right) =>
      Number(right.isOnBoard) - Number(left.isOnBoard) ||
      left.name.localeCompare(right.name),
  );
}

export function filterNodeSearchEntries(
  entries: readonly NodeSearchEntry[],
  query: string,
): NodeSearchEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...entries];
  return entries.filter((entry) =>
    terms.every((term) => entry.searchText.includes(term)),
  );
}

/** Lists Stances that can be reviewed for potential enactment. */
export function projectInactiveStanceSearchEntries(
  entries: readonly NodeSearchEntry[],
): NodeSearchEntry[] {
  return entries.filter(
    (entry) => entry.nodeType === "stance" && !entry.isActive,
  );
}

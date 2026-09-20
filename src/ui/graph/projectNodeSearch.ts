import type { ScenarioDefinition, SimulationState } from "../../simulation";

export interface NodeSearchEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly nodeType: string;
  readonly category: string;
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
  return scenario.nodes
    .map((definition): NodeSearchEntry => {
      const runtime = state.nodes[definition.id];
      const category = definition.category ?? "Other concerns";
      const isGraphVisible = definition.graphVisible !== false;
      const isOnBoard = isGraphVisible && runtime.isActive;
      const statusTerms = [
        runtime.isActive ? "active" : "inactive",
        runtime.isForced ? "forced active" : "",
        isOnBoard ? "on board" : "off board",
      ];

      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        nodeType: definition.type,
        category,
        isActive: runtime.isActive,
        isForced: runtime.isForced,
        isGraphVisible,
        isOnBoard,
        searchText: [
          definition.name,
          definition.description,
          definition.type,
          category,
          ...statusTerms,
        ]
          .join(" ")
          .toLocaleLowerCase(),
      };
    })
    .sort(
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

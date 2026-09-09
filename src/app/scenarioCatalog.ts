import { loadScenario, type ScenarioDefinition } from "../simulation";

export interface ScenarioCatalogEntry {
  readonly contentVersion: number;
  readonly content: unknown;
}

export interface LoadedScenarioCatalogEntry {
  readonly contentVersion: number;
  readonly scenario: ScenarioDefinition;
}

export interface ScenarioCatalogResult {
  readonly entries: readonly LoadedScenarioCatalogEntry[];
  readonly diagnostics: readonly string[];
}

/** Validate bundled or runtime content before exposing it to the launcher. */
export function loadScenarioCatalog(
  catalog: readonly ScenarioCatalogEntry[],
): ScenarioCatalogResult {
  const entries: LoadedScenarioCatalogEntry[] = [];
  const diagnostics: string[] = [];
  const ids = new Set<string>();

  catalog.forEach((entry, index) => {
    if (!Number.isInteger(entry.contentVersion) || entry.contentVersion < 1) {
      diagnostics.push(
        `Scenario catalog entry ${index}: contentVersion must be a positive integer.`,
      );
      return;
    }
    const loaded = loadScenario(entry.content);
    if (!loaded.ok) {
      diagnostics.push(
        ...loaded.diagnostics.map(
          (diagnostic) => `Scenario catalog entry ${index}: ${diagnostic}`,
        ),
      );
      return;
    }
    if (ids.has(loaded.scenario.id)) {
      diagnostics.push(
        `Scenario catalog entry ${index}: duplicate Scenario id ${loaded.scenario.id}.`,
      );
      return;
    }
    ids.add(loaded.scenario.id);
    entries.push({
      contentVersion: entry.contentVersion,
      scenario: loaded.scenario,
    });
  });

  return { entries, diagnostics };
}

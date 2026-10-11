/**
 * Projects runtime prerequisite checks into readable views for the UI.
 * Recorded group matches remain separate from current prerequisite readings.
 */
import { getNodeDisplayInfo } from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  PrerequisiteDefinition,
  PrerequisiteGroupDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { isPrerequisiteMet } from "../../simulation";
import { formatValue } from "../formatValue";

export interface PrerequisiteView {
  readonly title: string;
  readonly description: string;
  readonly isMet: boolean;
  readonly nodeId?: string;
  readonly metric?: FactionMetricDefinition;
}

/** Describe any runtime prerequisite using the shared engine evaluation. */
export function projectPrerequisite(
  prerequisite: PrerequisiteDefinition,
  scenario: ScenarioDefinition,
  state: SimulationState,
): PrerequisiteView {
  const isMet = isPrerequisiteMet(prerequisite, state);
  if (prerequisite.kind === "turn") {
    return {
      isMet,
      title: "Scenario date",
      description: `Turn ${state.turn}; required turn ${prerequisite.atTurn} or later.`,
    };
  }
  if (prerequisite.kind === "event") {
    const event = scenario.events!.find(
      ({ id }) => id === prerequisite.eventId,
    )!;
    return {
      isMet,
      title: event.title,
      description: `${event.title} has ${isMet ? "fired" : "not fired"}.`,
    };
  }
  if (prerequisite.kind === "dilemma-choice") {
    const dilemma = scenario.dilemmas!.find(
      ({ id }) => id === prerequisite.dilemmaId,
    )!;
    const progress = state.dilemmas[prerequisite.dilemmaId];
    const choice = dilemma.choices.find(
      ({ id }) => id === progress.lastResolvedChoiceId,
    );
    const required = dilemma.choices.find(
      ({ id }) => id === prerequisite.choiceId,
    );
    return {
      isMet,
      title: dilemma.title,
      description: `${choice ? `Last resolved with ${choice.label}.` : "Not yet resolved."}${required ? ` Required choice: ${required.label}.` : ""}`,
    };
  }
  const definition = scenario.nodes.find(
    ({ id }) => id === prerequisite.nodeId,
  )!;
  const runtime = state.nodes[prerequisite.nodeId];
  const nodedisplayinfo = getNodeDisplayInfo(scenario, definition.id);
  const title = nodedisplayinfo.name;
  const base = {
    isMet,
    nodeId: definition.id,
    title,
    ...(nodedisplayinfo.metric ? { metric: nodedisplayinfo.metric } : {}),
  };
  if (prerequisite.kind === "node-activation") {
    return {
      ...base,
      description: `${runtime.isActive ? "Active" : "Inactive"}; required ${prerequisite.active ? "active" : "inactive"}.`,
    };
  }
  if (prerequisite.kind === "situation-resolved") {
    return {
      ...base,
      description: `${isMet ? "Was active and is now resolved" : "Has not resolved after being active"}.`,
    };
  }
  return {
    ...base,
    description: `Current value: ${formatValue(runtime.value, definition.domain)} ${prerequisite.comparison === "at-most" ? "≤" : "≥"} ${formatValue(prerequisite.value, definition.domain)}.`,
  };
}

export interface PrerequisiteGroupView {
  readonly group: PrerequisiteGroupDefinition;
  readonly matched: boolean;
  readonly prerequisites: readonly PrerequisiteView[];
}

/** Recorded group matches remain independent of current readings. */
export function projectPrerequisiteGroups(
  groups: readonly PrerequisiteGroupDefinition[],
  matchedGroupIds: readonly string[],
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly PrerequisiteGroupView[] {
  const matchedIds = new Set(matchedGroupIds);
  return groups.map((group) => ({
    group,
    matched: matchedIds.has(group.id),
    prerequisites: group.allOf.map((prerequisite) =>
      projectPrerequisite(prerequisite, scenario, state),
    ),
  }));
}

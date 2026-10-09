import { getNodeDisplayInfo } from "../projections/projectFactionGroups";
import type {
  FactionMetricDefinition,
  PrerequisiteDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { prerequisiteMet } from "../../simulation";
import { formatValue } from "../formatValue";

export interface PrerequisiteView {
  readonly title: string;
  readonly description: string;
  readonly met: boolean;
  readonly nodeId?: string;
  readonly metric?: FactionMetricDefinition;
}

/** Describe any runtime prerequisite using the shared engine evaluation. */
export function projectPrerequisite(
  prerequisite: PrerequisiteDefinition,
  scenario: ScenarioDefinition,
  state: SimulationState,
): PrerequisiteView {
  const met = prerequisiteMet(prerequisite, state);
  if (prerequisite.kind === "turn") {
    return {
      met,
      title: "Scenario date",
      description: `Turn ${state.turn}; required turn ${prerequisite.atTurn} or later.`,
    };
  }
  if (prerequisite.kind === "event") {
    const event = scenario.events!.find(
      ({ id }) => id === prerequisite.eventId,
    )!;
    return {
      met,
      title: event.title,
      description: `${event.title} has ${met ? "fired" : "not fired"}.`,
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
      met,
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
    met,
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
      description: `${met ? "Was active and is now resolved" : "Has not resolved after being active"}.`,
    };
  }
  return {
    ...base,
    description: `Current value: ${formatValue(runtime.value, definition.domain)} ${prerequisite.comparison === "at-most" ? "≤" : "≥"} ${formatValue(prerequisite.value, definition.domain)}.`,
  };
}

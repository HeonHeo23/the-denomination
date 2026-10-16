import type {
  CompletionDefinition,
  EndingDefinition,
  PrerequisiteGroupDefinition,
  ScenarioDefinition,
} from "../../src/simulation";

/** Keep unrelated mechanics tests playable past the bundled scenario's ending. */
export const ongoingCompletion: CompletionDefinition = {
  prerequisiteGroups: [
    {
      id: "review",
      allOf: [{ kind: "turn", atTurn: 1000 }],
      title: "Review",
      description: "Final review",
    },
  ],
  endings: [],
  fallbackEnding: {
    id: "fallback",
    title: "Fallback",
    description: "Completed.",
  },
  reportNodeIds: [],
};

export const date = (
  atTurn = 1,
): CompletionDefinition["prerequisiteGroups"][number] => ({
  id: "review",
  title: "Review",
  description: "The institutional review.",
  allOf: [{ kind: "turn", atTurn }],
});
export const group = (
  id = "healthy",
  value = 0.6,
  nodeId = "health",
): PrerequisiteGroupDefinition => ({
  id,
  title: id,
  allOf: [{ kind: "node-value", nodeId, comparison: "at-least", value }],
});
export const ending = (
  id: string,
  priority: number,
  prerequisiteGroups = [group()],
): EndingDefinition => ({
  id,
  title: id,
  description: `${id} institutional narrative.`,
  priority,
  prerequisiteGroups,
});

export const endingScenario = (): ScenarioDefinition => ({
  schemaVersion: 3,
  id: "ending-test",
  title: "Ending test",
  description: "Institutional ending tests.",
  start: { turn: 0, year: 1980 },
  historicalActors: [
    {
      id: "delegates",
      name: "Delegates",
      role: "Assembly",
      description: "Represent the institution.",
    },
  ],
  completion: {
    prerequisiteGroups: [date()],
    endings: [ending("revival", 10)],
    fallbackEnding: {
      id: "unresolved",
      title: "Unresolved",
      description: "The institution retains unresolved tensions.",
    },
    reportNodeIds: ["health", "reserve"],
  },
  nodes: [
    {
      id: "policy",
      type: "stance",
      name: "Policy",
      description: "A policy.",
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.5, isActive: true, isForced: false },
      control: { kind: "continuous" },
    },
    {
      id: "health",
      type: "indicator",
      name: "Health",
      description: "Institutional health.",
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.6, isActive: true, isForced: true },
      baseline: 0.6,
    },
    {
      id: "reserve",
      type: "resource",
      name: "Reserve",
      description: "Reserves.",
      domain: { min: 0, max: 10, clamp: true },
      initial: { value: 2, isActive: true, isForced: true },
    },
    {
      id: "crisis",
      type: "situation",
      name: "Crisis",
      description: "Institutional tension.",
      domain: { min: 0, max: 1, clamp: true },
      initial: { value: 0.2, isActive: false, isForced: false },
      baseline: 0.2,
      startThreshold: 0.7,
      stopThreshold: 0.3,
    },
  ],
  effects: [],
});

export const assemblyScenario = (
  scenario: ScenarioDefinition = endingScenario(),
): ScenarioDefinition => {
  return {
    ...scenario,
    events: [],
    dilemmas: [
      {
        id: "assembly",
        kind: "dilemma",
        title: "Assembly",
        description: "Choose succession.",
        influences: [],
        threshold: 0,
        cooldownTurns: 1,
        choices: [
          {
            id: "accept",
            label: "Accept",
            description: "Authorize succession.",
            consequences: [{ kind: "resource", target: "reserve", amount: 4 }],
          },
          {
            id: "decline",
            label: "Decline",
            description: "Continue deliberation.",
            consequences: [],
          },
        ],
      },
    ],
  };
};

import type { CompletionDefinition } from "../../src/simulation";

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
    narrative: "Completed.",
  },
  reportNodeIds: [],
};

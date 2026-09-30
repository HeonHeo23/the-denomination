import type { ScenarioDefinition, SimulationState } from "../../simulation";

export interface DilemmaDecisionView {
  readonly id: string;
  readonly turn: number;
  readonly year?: number;
  readonly title: string;
  readonly choiceLabel: string;
  readonly choiceDescription: string;
}

/** Read resolved choices from the canonical, saved occurrence history. */
export function projectDilemmaDecisions(
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly DilemmaDecisionView[] {
  return state.history
    .filter((entry) => entry.kind === "dilemma")
    .map((entry) => {
      const definition = (scenario.dilemmas ?? []).find((dilemma) =>
        entry.id.startsWith(`${dilemma.id}:choice:`),
      );
      const choice = definition?.choices.find(
        ({ label, description }) => entry.detail === `${label}: ${description}`,
      );
      return {
        id: entry.id,
        turn: entry.turn,
        year:
          scenario.start.year === undefined
            ? undefined
            : scenario.start.year + entry.turn - scenario.start.turn,
        title: entry.title,
        choiceLabel: choice?.label ?? entry.detail,
        choiceDescription: choice?.description ?? "",
      };
    })
    .reverse();
}

import type { PrerequisiteGroupView } from "./projectPrerequisite";
import type { Contribution, ContributionGroup } from "./projectContributions";

/** Identifies a crisis, completion condition, or ending. */
export type OutcomeCondition = {
  readonly kind: "crisis" | "completion" | "ending";
  /** GameOverDefinition.id | PrerequisiteGroupDefinition.id | EndingDefinition.id */
  readonly id: string;
};

interface ConditionSummary {
  readonly id: string;
  readonly title: string;
}

export interface CrisisView extends ConditionSummary {
  readonly kind: "crisis";
  readonly status: "warning" | "recovered" | "terminal";
  readonly consecutiveTurns: number;
  readonly terminalTurn: number;
  readonly turnsRemaining: number;
  readonly progressPercent: number;
}

export interface CompletionSummaryView extends ConditionSummary {
  readonly kind: "completion";
  readonly status: "met" | "unmet";
}

export interface EndingSummaryView extends ConditionSummary {
  readonly kind: "ending";
  readonly status: "met" | "unmet";
  readonly priority: number;
}

export type OutcomeConditionSummaryView =
  CrisisView | CompletionSummaryView | EndingSummaryView;

export interface CrisisTimelineView {
  readonly stageLabel: string;
  readonly stageDescription?: string;
  readonly progressLabel: string;
  readonly terminalTurn: number;
  readonly progressCopy: {
    readonly primary: string;
    readonly secondary: string;
  };
  readonly milestones: readonly {
    readonly id: string;
    readonly turn: number;
    readonly positionPercent: number;
    readonly kind: "stage" | "terminal";
    readonly title: string;
  }[];
}

export interface ConditionAnalysisView {
  readonly description: string;
  /** Group matches describe their evaluation phase; readings describe this snapshot. */
  readonly matchSource: "current" | "crisis-evaluation" | "outcome";
  readonly allGroups: readonly PrerequisiteGroupView[];
  readonly matchedGroups: readonly PrerequisiteGroupView[];
  readonly contributions: readonly Contribution[];
  readonly contributionGroups: readonly (ContributionGroup & {
    readonly currentReading?: string;
  })[];
  readonly biggestContribution?: Contribution;
}

export type OutcomeConditionDetailView = ConditionAnalysisView &
  (
    | (CrisisView & { readonly timeline: CrisisTimelineView })
    | CompletionSummaryView
    | EndingSummaryView
  );

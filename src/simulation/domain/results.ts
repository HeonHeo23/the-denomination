import type { ScenarioDefinition } from "./definitions";
import type { SimulationState } from "./runtime";

/** Breakdown of the terms used to calculate one persistent target. */
export interface CalculationTrace {
  readonly targetId: string;
  readonly baseline: number;
  readonly effectTotal: number;
  readonly grudgeTotal: number;
  readonly result: number;
}

/** Outcome of applying a player command to a runtime snapshot. */
export interface CommandResult {
  readonly accepted: boolean;
  readonly state: SimulationState;
  readonly message: string;
}

/** Outcome of advancing the simulation by one turn. */
export interface TurnResult {
  readonly state: SimulationState;
  readonly message: string;
  readonly trace: readonly CalculationTrace[];
}

/** Outcome of validating and normalizing supported Scenario content. */
export type ScenarioLoadResult =
  | { readonly ok: true; readonly scenario: ScenarioDefinition }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

/** Read-only preview of a Stance command against a particular snapshot. */
export interface StanceChangeAssessment {
  readonly legal: boolean;
  readonly cost: number;
  readonly message: string;
}

/** Read-only preview of an enactment or repeal command. */
export interface StanceTransitionAssessment {
  readonly legal: boolean;
  readonly cost: number;
  readonly message: string;
}

/** Direct Effect values projected after a Stance fills each output's Inertia window. */
export interface StanceEffectPreview {
  readonly effectId: string;
  readonly contribution: number;
  /** Whether the proposed contribution comes from a legal command candidate. */
  readonly kind: "settled" | "estimate";
}

import type { ScenarioDefinition } from "./definitions";
import type { SimulationState } from "./runtime";

/** Breakdown of the terms used to calculate one persistent target. */
export interface CalculationTrace {
  readonly targetId: string;
  readonly constraintAdjustment?: number;
  readonly baseline?: number;
  readonly effectTotal: number;
  readonly grudgeTotal: number;
  readonly netFlow?: number;
  readonly result: number;
}

/** Outcome of applying a player command to a runtime snapshot. */
export interface CommandResult {
  readonly isAccepted: boolean;
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

/** Shared read-only result of assessing a Stance action. */
export interface StanceAssessment {
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

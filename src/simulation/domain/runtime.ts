import type { EffectId, NodeId } from "./definitions";

/** Mutable-in-time values for one persistent node in a snapshot. */
export interface NodeRuntimeState {
  readonly value: number;
  readonly baseValue: number;
  readonly isActive: boolean;
  readonly isForced: boolean;
}

/** Per-Effect history needed to calculate inertia and expose contributions. */
export interface EffectRuntimeState {
  readonly sourceHistory: readonly number[];
  readonly lastContribution: number;
}

/** A temporary contribution that decays after each applied turn. */
export interface GrudgeRuntimeState {
  readonly id: string;
  readonly label: string;
  readonly target: NodeId;
  readonly magnitude: number;
  readonly decay: number;
  readonly createdTurn: number;
}

/** Player-visible record of a meaningful simulation occurrence. */
export interface HistoryEntry {
  readonly id: string;
  readonly turn: number;
  readonly kind: "stance" | "situation";
  readonly title: string;
  readonly detail: string;
}

/** Immutable canonical runtime snapshot for one Scenario session. */
export interface SimulationState {
  readonly scenarioId: string;
  readonly turn: number;
  readonly year?: number;
  readonly nodes: Readonly<Record<NodeId, NodeRuntimeState>>;
  readonly effects: Readonly<Record<EffectId, EffectRuntimeState>>;
  readonly grudges: readonly GrudgeRuntimeState[];
  readonly history: readonly HistoryEntry[];
}

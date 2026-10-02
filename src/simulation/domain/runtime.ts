import type { EffectId, NodeId } from "./definitions";

/** Mutable-in-time values for one persistent node in a snapshot. */
export interface NodeRuntimeState {
  readonly value: number;
  /** Non-Resource baseline; absent for Resources. */
  readonly baseValue?: number;
  /** Resource flow projected at turn zero or applied on the latest turn. */
  readonly netFlow?: number;
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
  readonly kind:
    | "stance"
    | "situation"
    | "crisis"
    | "consequence"
    | "game-over"
    | "ending"
    | "dilemma"
    | "event";
  readonly title: string;
  readonly detail: string;
}

/** Completed-turn readings for every Scenario node, including Stances. */
export interface NodeValueHistoryPoint {
  readonly turn: number;
  readonly values: Readonly<
    Record<NodeId, { readonly value: number; readonly isActive: boolean }>
  >;
}

export interface GameOverProgressRuntimeState {
  readonly episode: number;
  readonly consecutiveTurns: number;
  readonly matchedPrerequisiteGroupIds: readonly string[];
}

export interface GameOverOutcomeCause {
  readonly gameOverId: string;
  readonly matchedPrerequisiteGroupIds: readonly string[];
}

export interface GameOverOutcome {
  readonly kind: "game-over";
  readonly turn: number;
  readonly causes: readonly GameOverOutcomeCause[];
}

export interface EndingOutcome {
  readonly kind: "ending";
  readonly turn: number;
  readonly endingId: string;
  readonly matchedTriggerIds: readonly string[];
  readonly matchedPrerequisiteGroupIds: readonly string[];
  readonly usedFallback: boolean;
}

export interface DilemmaRuntimeState {
  readonly lastResolvedTurn: number | null;
  readonly lastResolvedChoiceId: string | null;
  readonly lastTriggerTurn: number | null;
  readonly triggerCount: number;
}

export interface EventRuntimeState {
  readonly lastTriggerTurn: number | null;
  readonly triggerCount: number;
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
  readonly nodeValueHistory: readonly NodeValueHistoryPoint[];
  readonly dilemmas: Readonly<Record<string, DilemmaRuntimeState>>;
  readonly events: Readonly<Record<string, EventRuntimeState>>;
  readonly pendingDilemmaIds: readonly string[];
  readonly gameOverProgress: Readonly<
    Record<string, GameOverProgressRuntimeState>
  >;
  readonly outcome: GameOverOutcome | EndingOutcome | null;
}

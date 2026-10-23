import type { EffectId, NodeId } from "./definitions";

/** Mutable-in-time values for one persistent node in a snapshot. */
export interface NodeRuntimeState {
  readonly value: number;
  readonly baseValue?: number;
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

interface HistoryEntryBase {
  readonly id: string;
  readonly turn: number;
  readonly title: string;
  readonly detail: string;
}

/** A recorded history entry with explicit references to its source definitions. */
export type HistoryEntry = HistoryEntryBase &
  (
    | ({ readonly definitionId: string } & (
        | {
            readonly kind: "stance";
            readonly action: "change" | "enact" | "repeal";
          }
        | {
            readonly kind: "situation";
            readonly transition: "start" | "stop";
          }
        | {
            readonly kind: "event";
            readonly triggerCount: number;
          }
        | {
            readonly kind: "dilemma";
            readonly choiceId: string;
          }
        | ({ readonly kind: "crisis" } & (
            | { readonly transition: "stage"; readonly stageId: string }
            | { readonly transition: "recovery" }
          ))
        | {
            readonly kind: "game-over";
            readonly episode: number;
          }
        | { readonly kind: "ending" }
      ))
    | {
        readonly kind: "consequence";
        readonly sourceHistoryId: string;
        readonly consequenceIndex: number;
      }
  );

/** A node's recorded value and activation state at one turn. */
export interface NodeHistoryState {
  readonly value: number;
  readonly isActive: boolean;
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
  /** Historical node states, keyed by turn and then node ID. */
  readonly nodeValueHistory: Readonly<
    Record<number, Readonly<Record<NodeId, NodeHistoryState>>>
  >;
  readonly dilemmas: Readonly<Record<string, DilemmaRuntimeState>>;
  readonly events: Readonly<Record<string, EventRuntimeState>>;
  readonly pendingDilemmaIds: readonly string[];
  readonly gameOverProgress: Readonly<
    Record<string, GameOverProgressRuntimeState>
  >;
  readonly outcome: GameOverOutcome | EndingOutcome | null;
}

import type { NodeId } from "./definitions";

/** A player intent accepted by the simulation command boundary. */
export type SimulationCommand =
  | {
      readonly type: "set-stance";
      readonly stanceId: NodeId;
      readonly value: number;
    }
  | {
      readonly type: "resolve-dilemma";
      readonly dilemmaId: string;
      readonly choiceId: string;
    };

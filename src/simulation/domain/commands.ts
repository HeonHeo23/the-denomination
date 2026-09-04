import type { NodeId } from "./definitions";

/** A player intent accepted by the simulation command boundary. */
export interface SimulationCommand {
  readonly type: "set-stance";
  readonly stanceId: NodeId;
  readonly value: number;
}

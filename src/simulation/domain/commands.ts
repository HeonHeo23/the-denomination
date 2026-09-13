import type { NodeId } from "./definitions";

/** A player intent accepted by the simulation command boundary. */
export interface SetStanceCommand {
  readonly type: "set-stance";
  readonly stanceId: NodeId;
  readonly value: number;
}

export interface EnactStanceCommand {
  readonly type: "enact-stance";
  readonly stanceId: NodeId;
  readonly value: number;
}

export interface RepealStanceCommand {
  readonly type: "repeal-stance";
  readonly stanceId: NodeId;
}

/** A player intent accepted by the simulation command boundary. */
export type SimulationCommand =
  SetStanceCommand | EnactStanceCommand | RepealStanceCommand;

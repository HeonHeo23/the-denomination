import type { TurnReport } from "./panels/projectTurnReport";

export type InstitutionEra = "humble" | "growing" | "established";

export function institutionEra(turn: number): InstitutionEra {
  if (turn <= 4) return "humble";
  if (turn <= 11) return "growing";
  return "established";
}

/** A presentational flourish, derived only from a completed turn. */
export function isEtherealTurn(report: TurnReport): boolean {
  return (
    report.situationTransitions.length > 0 ||
    report.crisisTransitions.length > 0 ||
    report.changes.some((change) => change.relativeMagnitude >= 0.08)
  );
}

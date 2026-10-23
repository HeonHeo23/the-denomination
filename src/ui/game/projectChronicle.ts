import type {
  ConsequenceDefinition,
  HistoryEntry,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import { resolveHistoryRecords } from "./resolveHistoryRecords";

export type ChronicleTarget =
  | { readonly kind: "node"; readonly id: string }
  | { readonly kind: "crisis"; readonly id: string }
  | { readonly kind: "event"; readonly id: string }
  | { readonly kind: "dilemma"; readonly id: string }
  | { readonly kind: "report" };

export interface ResolvedHistoryRecord {
  readonly entry: HistoryEntry;
  readonly typeId?: ChronicleTypeId;
  readonly displayTitle: string;
  readonly target?: ChronicleTarget;
  readonly sourceHistoryId?: string;
  readonly targetName?: string;
  readonly applied?: ConsequenceDefinition;
  readonly decision?: {
    readonly choiceId?: string;
    readonly choiceLabel: string;
    readonly choiceDescription: string;
  };
}

export interface ChronicleRecord extends ResolvedHistoryRecord {
  readonly changes: readonly ResolvedHistoryRecord[];
}

export interface ChronicleGroup {
  readonly turn: number;
  readonly dateLabel: string;
  readonly records: readonly ChronicleRecord[];
}

/** UI taxonomy; simulation records contain facts rather than badge wording. */
export const chronicleTypes = {
  "stance-change": {
    label: "Stance Changed",
    iconKey: "stance",
    category: "stance",
  },
  "stance-enact": {
    label: "Stance Enacted",
    iconKey: "stance",
    category: "stance",
  },
  "stance-repeal": {
    label: "Stance Repealed",
    iconKey: "stance",
    category: "stance",
  },
  "situation-began": {
    label: "Situation Began",
    iconKey: "situation",
    category: "situation",
  },
  "situation-ended": {
    label: "Situation Ended",
    iconKey: "situation",
    category: "situation",
  },
  event: { label: "Event", iconKey: "event" },
  dilemma: { label: "Dilemma", iconKey: "dilemma" },
  "crisis-stage": { label: "Crisis", iconKey: "crisis", category: "crisis" },
  "crisis-recovery": {
    label: "Crisis Recovered",
    iconKey: "crisis",
    category: "crisis",
  },
  "change-resource": { label: "Resource", iconKey: "consequence" },
  "change-grudge": { label: "Grudge", iconKey: "consequence" },
  "change-activated": { label: "Activation", iconKey: "consequence" },
  "change-deactivated": { label: "Deactivation", iconKey: "consequence" },
  "game-over": { label: "Game Over", iconKey: "game-over" },
  ending: { label: "Ending", iconKey: "ending" },
} as const satisfies Record<
  string,
  { label: string; iconKey: HistoryEntry["kind"]; category?: string }
>;

export type ChronicleTypeId = keyof typeof chronicleTypes;
export const chronicleHierarchy = [
  {
    id: "category-stance",
    label: "Stance",
    children: ["stance-change", "stance-enact", "stance-repeal"],
  },
  {
    id: "category-situation",
    label: "Situation",
    children: ["situation-began", "situation-ended"],
  },
  "event",
  "dilemma",
  {
    id: "category-crisis",
    label: "Crisis",
    children: ["crisis-stage", "crisis-recovery"],
  },
  "change-resource",
  "change-grudge",
  "change-activated",
  "change-deactivated",
  "game-over",
  "ending",
] as const satisfies readonly (
  | ChronicleTypeId
  | { id: string; label: string; children: readonly ChronicleTypeId[] }
)[];

/** Group only the presentation; flat canonical history keeps its recorded order. */
export const projectChronicle = (
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly ChronicleGroup[] => {
  const resolved = resolveHistoryRecords(scenario, state);
  const byId = new Map(resolved.map((record) => [record.entry.id, record]));
  const children = new Map<string, ResolvedHistoryRecord[]>();
  const attached = new Set<string>();
  for (const record of resolved) {
    const source = record.sourceHistoryId
      ? byId.get(record.sourceHistoryId)
      : undefined;
    if (
      !source ||
      !["event", "dilemma", "crisis"].includes(source.entry.kind) ||
      source.entry.turn !== record.entry.turn
    )
      continue;
    children.set(source.entry.id, [
      ...(children.get(source.entry.id) ?? []),
      record,
    ]);
    attached.add(record.entry.id);
  }
  const groups = new Map<number, ChronicleRecord[]>();
  for (const record of [...resolved].reverse()) {
    if (attached.has(record.entry.id)) continue;
    const records = groups.get(record.entry.turn) ?? [];
    records.push({ ...record, changes: children.get(record.entry.id) ?? [] });
    groups.set(record.entry.turn, records);
  }
  return [...groups]
    .sort(([a], [b]) => b - a)
    .map(([turn, records]) => ({
      turn,
      records,
      dateLabel:
        scenario.start.year === undefined
          ? `Turn ${turn}`
          : `Year ${scenario.start.year + turn - scenario.start.turn}`,
    }));
};

import type {
  ConsequenceDefinition,
  DilemmaDefinition,
  HistoryEntry,
  ScenarioDefinition,
  SimulationState,
} from "../../simulation";
import type {
  ChronicleTarget,
  ChronicleTypeId,
  ResolvedHistoryRecord,
} from "./projectChronicle";

const changeType = (change: ConsequenceDefinition): ChronicleTypeId =>
  change.kind === "resource"
    ? "change-resource"
    : change.kind === "grudge"
      ? "change-grudge"
      : change.active
        ? "change-activated"
        : "change-deactivated";

export const findRecordedDilemma = (
  scenario: ScenarioDefinition,
  entry: HistoryEntry,
): DilemmaDefinition | undefined =>
  entry.kind === "dilemma"
    ? scenario.dilemmas?.find(({ id }) => id === entry.definitionId)
    : undefined;

/** Resolve Chronicle and dialog fields without changing canonical history. */
export const resolveHistoryRecords = (
  scenario: ScenarioDefinition,
  state: SimulationState,
): readonly ResolvedHistoryRecord[] => {
  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const history = new Map(state.history.map((entry) => [entry.id, entry]));

  // Navigation is available only while the destination exists.
  const getNodeTarget = (id: string): ChronicleTarget | undefined =>
    nodes.has(id) && state.nodes[id] ? { kind: "node", id } : undefined;
  const getCrisisTarget = (id: string): ChronicleTarget | undefined =>
    scenario.gameOvers?.some((d) => d.id === id)
      ? { kind: "crisis", id }
      : undefined;
  const getTerminalTarget = (
    entry: HistoryEntry,
    definitionId: string,
    episode?: number,
  ): ChronicleTarget | undefined => {
    const outcome = state.outcome;
    if (!outcome || outcome.turn !== entry.turn || outcome.kind !== entry.kind)
      return undefined;
    if (outcome.kind === "ending" && outcome.endingId === definitionId)
      return { kind: "report" };
    if (
      outcome.kind === "game-over" &&
      outcome.causes.some((cause) => cause.gameOverId === definitionId) &&
      state.gameOverProgress[definitionId]?.episode === episode
    )
      return { kind: "report" };
    return undefined;
  };

  // A parent record selects the authored consequence array, including its choice or stage.
  const getConsequences = (
    parent: HistoryEntry,
  ): readonly ConsequenceDefinition[] | undefined => {
    switch (parent.kind) {
      case "event":
        return scenario.events?.find(({ id }) => id === parent.definitionId)
          ?.consequences;
      case "dilemma":
        return findRecordedDilemma(scenario, parent)?.choices.find(
          ({ id }) => id === parent.choiceId,
        )?.consequences;
      case "crisis": {
        const definition = scenario.gameOvers?.find(
          ({ id }) => id === parent.definitionId,
        );
        return parent.transition === "recovery"
          ? definition?.recovery?.consequences
          : definition?.stages.find(({ id }) => id === parent.stageId)
              ?.consequences;
      }
      default:
        return undefined;
    }
  };

  // Preserve every entry; unavailable references fall back to its saved text.
  return state.history.map((entry): ResolvedHistoryRecord => {
    const record = { entry, displayTitle: entry.title };
    switch (entry.kind) {
      case "stance": {
        const node = nodes.get(entry.definitionId);
        if (node?.type !== "stance") return record;
        const verb = {
          change: "changed",
          enact: "enacted",
          repeal: "repealed",
        }[entry.action];
        return {
          ...record,
          typeId: `stance-${entry.action}`,
          displayTitle:
            entry.title === `${node.name} ${verb}` ? node.name : entry.title,
          target: getNodeTarget(node.id),
        };
      }
      case "situation": {
        const node = nodes.get(entry.definitionId);
        if (node?.type !== "situation") return record;
        const verb = entry.transition === "start" ? "began" : "ended";
        return {
          ...record,
          typeId: `situation-${verb}`,
          displayTitle:
            entry.title === `${node.name} ${verb}` ? node.name : entry.title,
          target: getNodeTarget(node.id),
        };
      }
      case "event":
        return scenario.events?.some(({ id }) => id === entry.definitionId)
          ? {
              ...record,
              typeId: "event",
              target: { kind: "event", id: entry.id },
            }
          : record;
      case "dilemma": {
        const definition = findRecordedDilemma(scenario, entry);
        const choice = definition?.choices.find(
          ({ id }) => id === entry.choiceId,
        );
        return {
          ...record,
          typeId: definition ? "dilemma" : undefined,
          target: definition ? { kind: "dilemma", id: entry.id } : undefined,
          decision: {
            choiceId: choice?.id,
            choiceLabel: choice?.label ?? entry.detail,
            choiceDescription: choice?.description ?? "",
          },
        };
      }
      case "crisis": {
        const definition = scenario.gameOvers?.find(
          ({ id }) => id === entry.definitionId,
        );
        const source =
          entry.transition === "recovery"
            ? definition?.recovery
            : definition?.stages.find(({ id }) => id === entry.stageId);
        return source
          ? {
              ...record,
              typeId:
                entry.transition === "recovery"
                  ? "crisis-recovery"
                  : "crisis-stage",
              target: getCrisisTarget(entry.definitionId),
            }
          : record;
      }
      case "ending":
        return [
          ...scenario.completion.endings,
          scenario.completion.fallbackEnding,
        ].some(({ id }) => id === entry.definitionId)
          ? {
              ...record,
              typeId: "ending",
              target: getTerminalTarget(entry, entry.definitionId),
            }
          : record;
      case "game-over":
        return scenario.gameOvers?.some(({ id }) => id === entry.definitionId)
          ? {
              ...record,
              typeId: "game-over",
              target: getTerminalTarget(
                entry,
                entry.definitionId,
                entry.episode,
              ),
            }
          : record;
      case "consequence": {
        const parent = history.get(entry.sourceHistoryId);
        if (
          !parent ||
          parent.turn !== entry.turn ||
          !Number.isInteger(entry.consequenceIndex) ||
          entry.consequenceIndex < 0
        )
          return record;
        const applied = getConsequences(parent)?.[entry.consequenceIndex];
        if (!applied) return record;
        const targetName = nodes.get(applied.target)?.name ?? applied.target;
        return {
          ...record,
          typeId: changeType(applied),
          displayTitle: applied.kind === "grudge" ? applied.label : targetName,
          applied,
          targetName,
          sourceHistoryId: parent.id,
          target: getNodeTarget(applied.target),
        };
      }
    }
  });
};

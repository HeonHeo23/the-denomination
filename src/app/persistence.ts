import type { ScenarioDefinition, SimulationState } from "../simulation";
import type { LoadedScenarioCatalogEntry } from "./scenarioCatalog";

export const SAVE_STORAGE_KEY = "the-denomination.save.v4";

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SavedTurnReportChange {
  readonly nodeId: string;
  readonly previousValue: number;
  readonly value: number;
  readonly delta: number;
  readonly relativeMagnitude: number;
  readonly wasActive: boolean;
  readonly isActive: boolean;
}

export interface SavedTurnReport {
  readonly turn: number;
  readonly year?: number;
  readonly changes: readonly SavedTurnReportChange[];
  readonly changedEffectIds: readonly string[];
  readonly situationTransitions: readonly {
    readonly nodeId: string;
    readonly kind: "began" | "ended";
  }[];
  readonly grudges: readonly {
    readonly id: string;
    readonly label: string;
    readonly targetId: string;
    readonly magnitude: number;
  }[];
  readonly crisisTransitions: readonly {
    readonly kind: "stage" | "recovered";
    readonly gameOverId: string;
    readonly stageAtTurn?: number;
    readonly consecutiveTurns: number;
    readonly turnsRemaining: number;
  }[];
  readonly eventIds: readonly string[];
}

export interface SavedGame {
  readonly version: 4;
  readonly scenarioId: string;
  readonly scenarioContentVersion: number;
  readonly playerName: string;
  readonly denominationName: string;
  readonly state: SimulationState;
  readonly turnReport?: SavedTurnReport;
}

type ObjectValue = Record<string, unknown>;

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const integer = (value: unknown, min = 0, max = Infinity): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

function uniqueReferences(
  value: unknown,
  ids: ReadonlySet<string>,
): value is string[] {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every((id) => typeof id === "string" && ids.has(id))
  );
}

/** Constraints have no runtime state; validate their derived numeric totals. */
function isValidConstraintTotals(
  nodes: ObjectValue,
  scenario: ScenarioDefinition,
): boolean {
  return (scenario.constraints ?? []).every((constraint) => {
    const total = scenario.nodes
      .filter(
        (node) =>
          node.type === "faction" && node.constraintId === constraint.id,
      )
      .reduce(
        (sum, node) => sum + ((nodes[node.id] as ObjectValue).value as number),
        0,
      );
    return Number.isFinite(total) && total <= constraint.maxTotal + 1e-12;
  });
}

function isValidNodeState(
  value: unknown,
  definition: ScenarioDefinition["nodes"][number],
): boolean {
  if (
    !exactObject(
      value,
      definition.type === "resource"
        ? ["value", "netFlow", "isActive", "isForced"]
        : ["value", "baseValue", "isActive", "isForced"],
    ) ||
    !finite(value.value) ||
    (definition.type !== "resource" && !finite(value.baseValue)) ||
    typeof value.isActive !== "boolean" ||
    typeof value.isForced !== "boolean" ||
    value.isForced !== definition.initial.isForced ||
    (value.isForced && !value.isActive)
  )
    return false;
  if (definition.type === "resource" && !finite(value.netFlow)) return false;
  if (
    definition.type === "faction" &&
    (value.isActive !== true || value.isForced !== true)
  )
    return false;
  if (definition.type === "resource" || !definition.domain.clamp) return true;
  return [value.value, value.baseValue].every(
    (number) =>
      finite(number) &&
      number >= definition.domain.min &&
      number <= definition.domain.max,
  );
}

function isValidEffectState(
  value: unknown,
  expectedHistoryLength: number,
): boolean {
  return (
    exactObject(value, ["sourceHistory", "lastContribution"]) &&
    Array.isArray(value.sourceHistory) &&
    value.sourceHistory.length === expectedHistoryLength &&
    value.sourceHistory.every(finite) &&
    finite(value.lastContribution)
  );
}

function isValidRuntimeState(
  value: unknown,
  scenario: ScenarioDefinition,
): value is SimulationState {
  if (
    !exactObject(
      value,
      [
        "scenarioId",
        "turn",
        "nodes",
        "effects",
        "grudges",
        "history",
        "nodeValueHistory",
        "dilemmas",
        "events",
        "pendingDilemmaIds",
        "gameOverProgress",
        "outcome",
      ],
      ["year"],
    ) ||
    value.scenarioId !== scenario.id ||
    !integer(value.turn, scenario.start.turn) ||
    !exactObject(
      value.nodes,
      scenario.nodes.map(({ id }) => id),
    ) ||
    !exactObject(
      value.effects,
      scenario.effects.map(({ id }) => id),
    ) ||
    !Array.isArray(value.grudges) ||
    !Array.isArray(value.history) ||
    !value.nodeValueHistory ||
    !exactObject(
      value.dilemmas,
      (scenario.dilemmas ?? []).map(({ id }) => id),
    ) ||
    !exactObject(
      value.events,
      (scenario.events ?? []).map(({ id }) => id),
    ) ||
    !Array.isArray(value.pendingDilemmaIds) ||
    !exactObject(
      value.gameOverProgress,
      (scenario.gameOvers ?? []).map(({ id }) => id),
    )
  )
    return false;

  const expectedYear =
    scenario.start.year === undefined
      ? undefined
      : scenario.start.year + (value.turn - scenario.start.turn);
  if (value.year !== expectedYear) return false;

  const nodes = value.nodes as ObjectValue;
  const effects = value.effects as ObjectValue;
  const gameOverProgress = value.gameOverProgress as ObjectValue;
  const dilemmaProgress = value.dilemmas as ObjectValue;
  const eventProgress = value.events as ObjectValue;

  for (const definition of scenario.events ?? []) {
    const progress = eventProgress[definition.id];
    if (
      !exactObject(progress, ["lastTriggerTurn", "triggerCount"]) ||
      !integer(progress.triggerCount) ||
      (progress.lastTriggerTurn === null) !== (progress.triggerCount === 0) ||
      (progress.lastTriggerTurn !== null &&
        !integer(progress.lastTriggerTurn, scenario.start.turn + 1, value.turn))
    )
      return false;
  }

  const pendingIds = new Set<string>();
  for (const pendingId of value.pendingDilemmaIds) {
    if (
      typeof pendingId !== "string" ||
      pendingIds.has(pendingId) ||
      !(scenario.dilemmas ?? []).some(({ id }) => id === pendingId) ||
      value.outcome !== null
    )
      return false;
    pendingIds.add(pendingId);
  }
  for (const definition of scenario.dilemmas ?? []) {
    const progress = dilemmaProgress[definition.id];
    if (
      !exactObject(progress, [
        "lastTriggerTurn",
        "triggerCount",
        "lastResolvedTurn",
        "lastResolvedChoiceId",
      ]) ||
      !integer(progress.triggerCount) ||
      (progress.lastTriggerTurn === null) !== (progress.triggerCount === 0) ||
      (progress.lastTriggerTurn !== null &&
        !integer(
          progress.lastTriggerTurn,
          scenario.start.turn + 1,
          value.turn,
        )) ||
      (pendingIds.has(definition.id) && progress.lastTriggerTurn !== value.turn)
    )
      return false;
    if (
      (progress.lastResolvedTurn === null) !==
        (progress.lastResolvedChoiceId === null) ||
      (progress.lastResolvedTurn !== null &&
        (!integer(
          progress.lastResolvedTurn,
          scenario.start.turn + 1,
          value.turn,
        ) ||
          !finite(progress.lastTriggerTurn) ||
          progress.lastResolvedTurn > progress.lastTriggerTurn ||
          !definition.choices.some(
            ({ id }) => id === progress.lastResolvedChoiceId,
          ))) ||
      (!pendingIds.has(definition.id) &&
        progress.lastTriggerTurn !== progress.lastResolvedTurn) ||
      (pendingIds.has(definition.id) &&
        progress.lastResolvedTurn === progress.lastTriggerTurn)
    )
      return false;
  }

  if (
    !scenario.nodes.every((node) => isValidNodeState(nodes[node.id], node)) ||
    !scenario.effects.every((effect) =>
      isValidEffectState(effects[effect.id], effect.inertiaTurns ?? 1),
    )
  )
    return false;

  if (!isValidConstraintTotals(nodes, scenario)) return false;
  const trackedNodes = scenario.nodes;
  const historyLength = value.turn - scenario.start.turn + 1;
  const nodeValueHistory = value.nodeValueHistory;
  if (
    !nodeValueHistory ||
    typeof nodeValueHistory !== "object" ||
    Array.isArray(nodeValueHistory) ||
    Object.keys(nodeValueHistory).length !== historyLength
  )
    return false;
  const historyByTurn = nodeValueHistory as ObjectValue;
  // Commands update the current turn's readings, including the starting turn.
  // Validate runtime history rather than requiring authored initial values.
  for (let index = 0; index < historyLength; index += 1) {
    const turnKey = String(scenario.start.turn + index);
    if (!Object.hasOwn(historyByTurn, turnKey)) return false;
    const readings = historyByTurn[turnKey];
    if (
      !exactObject(
        readings,
        trackedNodes.map((node) => node.id),
      )
    )
      return false;
    for (const node of trackedNodes) {
      const reading = readings[node.id];
      if (
        !exactObject(reading, ["value", "isActive"]) ||
        !finite(reading.value) ||
        (node.type === "faction" && reading.isActive !== true) ||
        typeof reading.isActive !== "boolean" ||
        (node.type !== "resource" &&
          node.domain.clamp &&
          (reading.value < node.domain.min ||
            reading.value > node.domain.max)) ||
        (index === historyLength - 1 &&
          (reading.value !== (nodes[node.id] as ObjectValue).value ||
            reading.isActive !== (nodes[node.id] as ObjectValue).isActive))
      )
        return false;
    }
    if (!isValidConstraintTotals(readings, scenario)) return false;
  }

  const gameOvers = new Map(
    (scenario.gameOvers ?? []).map((definition) => [definition.id, definition]),
  );
  for (const definition of gameOvers.values()) {
    const progress = gameOverProgress[definition.id];
    if (
      !exactObject(progress, [
        "episode",
        "consecutiveTurns",
        "matchedPrerequisiteGroupIds",
      ]) ||
      !integer(progress.episode) ||
      !integer(progress.consecutiveTurns, 0, definition.terminalAfterTurns)
    )
      return false;
    const groupIds = new Set(definition.prerequisiteGroups.map(({ id }) => id));
    if (
      !uniqueReferences(progress.matchedPrerequisiteGroupIds, groupIds) ||
      (progress.consecutiveTurns === 0) !==
        (progress.matchedPrerequisiteGroupIds.length === 0) ||
      (progress.consecutiveTurns > 0 && progress.episode === 0)
    )
      return false;
  }

  const terminalIds = new Set(
    [...gameOvers.values()]
      .filter(
        ({ id, terminalAfterTurns }) =>
          (gameOverProgress[id] as ObjectValue).consecutiveTurns ===
          terminalAfterTurns,
      )
      .map(({ id }) => id),
  );

  if (
    value.outcome !== null &&
    typeof value.outcome === "object" &&
    (value.outcome as ObjectValue).kind === "ending"
  ) {
    if (
      !exactObject(value.outcome, [
        "kind",
        "turn",
        "endingId",
        "matchedTriggerIds",
        "matchedPrerequisiteGroupIds",
        "usedFallback",
      ]) ||
      value.outcome.turn !== value.turn ||
      typeof value.outcome.endingId !== "string" ||
      typeof value.outcome.usedFallback !== "boolean" ||
      Object.values(value.dilemmas as ObjectValue).some(
        (progress) => (progress as ObjectValue).lastResolvedTurn === value.turn,
      ) ||
      terminalIds.size > 0
    )
      return false;
    const outcome = value.outcome;
    const conditional = scenario.completion.endings.find(
      ({ id }) => id === outcome.endingId,
    );
    const ending = outcome.usedFallback
      ? scenario.completion.fallbackEnding
      : conditional;
    const triggerIds = new Set(
      scenario.completion.prerequisiteGroups.map(({ id }) => id),
    );
    const groupIds = new Set(
      outcome.usedFallback
        ? []
        : (conditional?.prerequisiteGroups.map(({ id }) => id) ?? []),
    );
    if (
      !ending ||
      ending.id !== outcome.endingId ||
      value.turn <= scenario.start.turn ||
      !uniqueReferences(outcome.matchedTriggerIds, triggerIds) ||
      outcome.matchedTriggerIds.length === 0 ||
      !uniqueReferences(outcome.matchedPrerequisiteGroupIds, groupIds) ||
      (outcome.usedFallback
        ? outcome.matchedPrerequisiteGroupIds.length !== 0
        : outcome.matchedPrerequisiteGroupIds.length === 0)
    )
      return false;
  } else if (value.outcome !== null) {
    if (
      !exactObject(value.outcome, ["kind", "turn", "causes"]) ||
      value.outcome.kind !== "game-over" ||
      value.outcome.turn !== value.turn ||
      !Array.isArray(value.outcome.causes) ||
      value.outcome.causes.length === 0
    )
      return false;
    const causeIds = new Set<string>();
    for (const cause of value.outcome.causes) {
      if (
        !exactObject(cause, ["gameOverId", "matchedPrerequisiteGroupIds"]) ||
        typeof cause.gameOverId !== "string" ||
        causeIds.has(cause.gameOverId) ||
        !Array.isArray(cause.matchedPrerequisiteGroupIds)
      )
        return false;
      const definition = gameOvers.get(cause.gameOverId);
      const groupIds = new Set(
        definition?.prerequisiteGroups.map(({ id }) => id) ?? [],
      );
      if (
        !definition ||
        !terminalIds.has(cause.gameOverId) ||
        cause.matchedPrerequisiteGroupIds.length === 0 ||
        !uniqueReferences(cause.matchedPrerequisiteGroupIds, groupIds) ||
        cause.matchedPrerequisiteGroupIds.join("\u0000") !==
          (
            (gameOverProgress[cause.gameOverId] as ObjectValue)
              .matchedPrerequisiteGroupIds as unknown[]
          ).join("\u0000")
      )
        return false;
      causeIds.add(cause.gameOverId);
    }
    if (causeIds.size !== terminalIds.size) return false;
  } else if (terminalIds.size) return false;

  const nodeIds = new Set(scenario.nodes.map(({ id }) => id));
  const grudgeIds = new Set<string>();
  for (const grudge of value.grudges) {
    if (
      !exactObject(grudge, [
        "id",
        "label",
        "target",
        "magnitude",
        "decay",
        "createdTurn",
      ]) ||
      !nonempty(grudge.id) ||
      grudgeIds.has(grudge.id) ||
      !nonempty(grudge.label) ||
      typeof grudge.target !== "string" ||
      !nodeIds.has(grudge.target) ||
      !finite(grudge.magnitude) ||
      !finite(grudge.decay) ||
      grudge.decay <= 0 ||
      grudge.decay > 1 ||
      !integer(grudge.createdTurn, scenario.start.turn, value.turn)
    )
      return false;
    grudgeIds.add(grudge.id);
  }

  const historyIds = new Set<string>();
  for (const entry of value.history) {
    if (
      !exactObject(entry, ["id", "turn", "kind", "title", "detail"]) ||
      !nonempty(entry.id) ||
      historyIds.has(entry.id) ||
      !integer(entry.turn, scenario.start.turn, value.turn) ||
      ![
        "stance",
        "situation",
        "crisis",
        "consequence",
        "game-over",
        "ending",
        "dilemma",
        "event",
      ].includes(String(entry.kind)) ||
      !nonempty(entry.title) ||
      typeof entry.detail !== "string"
    )
      return false;
    historyIds.add(entry.id);
  }
  const endingEntries = value.history.filter(
    (entry) => (entry as ObjectValue).kind === "ending",
  ) as ObjectValue[];
  const outcome = value.outcome as ObjectValue | null;
  if (outcome?.kind === "ending") {
    if (
      endingEntries.length !== 1 ||
      endingEntries[0].id !== `${outcome.endingId}:ending:${value.turn}` ||
      endingEntries[0].turn !== value.turn
    )
      return false;
  } else if (endingEntries.length) return false;
  return true;
}

function isValidTurnReport(
  value: unknown,
  scenario: ScenarioDefinition,
  state: SimulationState,
): value is SavedTurnReport {
  if (
    !exactObject(
      value,
      [
        "turn",
        "changes",
        "changedEffectIds",
        "situationTransitions",
        "grudges",
        "crisisTransitions",
        "eventIds",
      ],
      ["year"],
    ) ||
    !integer(value.turn) ||
    value.turn !== state.turn ||
    value.year !== state.year ||
    !Array.isArray(value.changes) ||
    !Array.isArray(value.changedEffectIds) ||
    !Array.isArray(value.situationTransitions) ||
    !Array.isArray(value.grudges) ||
    !Array.isArray(value.crisisTransitions) ||
    !Array.isArray(value.eventIds)
  )
    return false;

  const nodes = new Map(scenario.nodes.map((node) => [node.id, node]));
  const effectIds = new Set(scenario.effects.map((effect) => effect.id));
  const gameOvers = new Map(
    (scenario.gameOvers ?? []).map((definition) => [definition.id, definition]),
  );
  const eventIds = new Set((scenario.events ?? []).map(({ id }) => id));
  if (
    (value.eventIds as unknown[]).some(
      (id) => typeof id !== "string" || !eventIds.has(id),
    ) ||
    new Set(value.eventIds as unknown[]).size !==
      (value.eventIds as unknown[]).length
  )
    return false;

  const changeIds = new Set<string>();
  for (const change of value.changes) {
    if (!change || typeof change !== "object" || Array.isArray(change))
      return false;
    if (
      !exactObject(change, [
        "nodeId",
        "previousValue",
        "value",
        "delta",
        "relativeMagnitude",
        "wasActive",
        "isActive",
      ]) ||
      typeof change.nodeId !== "string" ||
      !nodes.has(change.nodeId) ||
      changeIds.has(change.nodeId) ||
      !finite(change.previousValue) ||
      !finite(change.value) ||
      !finite(change.delta) ||
      !finite(change.relativeMagnitude) ||
      typeof change.wasActive !== "boolean" ||
      typeof change.isActive !== "boolean"
    )
      return false;
    const domain = nodes.get(change.nodeId)!.domain;
    if (
      domain.clamp &&
      nodes.get(change.nodeId)!.type === "faction" &&
      [change.previousValue, change.value].some(
        (v) => v < domain.min || v > domain.max,
      )
    )
      return false;
    if (
      nodes.get(change.nodeId)!.type === "faction" &&
      (!change.wasActive || !change.isActive)
    )
      return false;
    changeIds.add(change.nodeId);
  }

  if (!uniqueReferences(value.changedEffectIds, effectIds)) return false;

  const situationIds = new Set<string>();
  for (const transition of value.situationTransitions) {
    if (
      !exactObject(transition, ["nodeId", "kind"]) ||
      typeof transition.nodeId !== "string" ||
      situationIds.has(transition.nodeId) ||
      nodes.get(transition.nodeId)?.type !== "situation" ||
      (transition.kind !== "began" && transition.kind !== "ended")
    )
      return false;
    situationIds.add(transition.nodeId);
  }

  const grudgeIds = new Set<string>();
  for (const grudge of value.grudges) {
    if (
      !exactObject(grudge, ["id", "label", "targetId", "magnitude"]) ||
      !nonempty(grudge.id) ||
      grudgeIds.has(grudge.id) ||
      !nonempty(grudge.label) ||
      typeof grudge.targetId !== "string" ||
      !nodes.has(grudge.targetId) ||
      !finite(grudge.magnitude)
    )
      return false;
    grudgeIds.add(grudge.id);
  }

  const crisisIds = new Set<string>();
  for (const transition of value.crisisTransitions) {
    if (
      !exactObject(
        transition,
        ["kind", "gameOverId", "consecutiveTurns", "turnsRemaining"],
        ["stageAtTurn"],
      ) ||
      typeof transition.gameOverId !== "string" ||
      crisisIds.has(transition.gameOverId) ||
      !gameOvers.has(transition.gameOverId) ||
      (transition.kind !== "stage" && transition.kind !== "recovered") ||
      !integer(transition.consecutiveTurns) ||
      !integer(transition.turnsRemaining) ||
      (transition.stageAtTurn !== undefined &&
        (!integer(transition.stageAtTurn) ||
          !gameOvers
            .get(transition.gameOverId)
            ?.stages.some((stage) => stage.atTurn === transition.stageAtTurn)))
    )
      return false;
    crisisIds.add(transition.gameOverId);
  }

  return true;
}

export function validateSavedGame(
  value: unknown,
  catalog: readonly LoadedScenarioCatalogEntry[],
): SavedGame | undefined {
  if (
    !exactObject(
      value,
      [
        "version",
        "scenarioId",
        "scenarioContentVersion",
        "playerName",
        "denominationName",
        "state",
      ],
      ["turnReport"],
    ) ||
    value.version !== 4 ||
    typeof value.scenarioId !== "string" ||
    !integer(value.scenarioContentVersion) ||
    !nonempty(value.playerName) ||
    value.playerName !== value.playerName.trim() ||
    value.playerName.length > 40 ||
    !nonempty(value.denominationName) ||
    value.denominationName !== value.denominationName.trim() ||
    value.denominationName.length > 60
  )
    return undefined;

  const entry = catalog.find(
    ({ scenario, contentVersion }) =>
      scenario.id === value.scenarioId &&
      contentVersion === value.scenarioContentVersion,
  );
  if (!entry) return undefined;
  if (!isValidRuntimeState(value.state, entry.scenario)) return undefined;
  if (
    value.turnReport !== undefined &&
    !isValidTurnReport(value.turnReport, entry.scenario, value.state)
  )
    return undefined;
  return value as unknown as SavedGame;
}

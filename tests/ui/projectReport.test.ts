import assert from "node:assert/strict";
import type {
  GameOverDefinition,
  ScenarioDefinition,
  SimulationState,
} from "../../src/simulation";
import { exampleScenario } from "../../src/scenarios/example";
import {
  initializeScenario,
  type GrudgeRuntimeState,
} from "../../src/simulation";
import {
  projectTurnReport,
  projectFinalReport,
} from "../../src/ui/panels/projectReport";
import { institutionEra, isEtherealTurn } from "../../src/ui/institutionEra";
import {
  getBiggestContribution,
  groupContributions,
  projectContributions,
  type Contribution,
} from "../../src/ui/game/projectContributions";
import { projectPrerequisiteGroups } from "../../src/ui/game/projectPrerequisite";
import {
  projectCrisis,
  formatCrisisProgressLabel,
  formatCrisisTurns,
  projectCrisisDetail,
  projectOutcomeConditionDetail,
} from "../../src/ui/game/projectOutcome";
import {
  moveDossierNavigation,
  type DossierNavigationState,
} from "../../src/ui/game/useDossierNavigation";
import { getDossierTriggerProps } from "../../src/ui/dossierActivation";

function terminalConditions(
  scenario: ScenarioDefinition,
  state: SimulationState,
) {
  const report = projectFinalReport(scenario, state);
  return report?.kind === "game-over"
    ? report.reason.causes.map(({ condition }) => condition)
    : [];
}

function assertFinalReportProjections(
  scenario: ScenarioDefinition,
  warningState: SimulationState,
  terminalState: SimulationState,
) {
  const ending = scenario.completion.endings[0];
  const recorded = {
    ...warningState,
    outcome: {
      kind: "ending" as const,
      turn: warningState.turn,
      endingId: ending.id,
      usedFallback: false,
      matchedTriggerIds: [scenario.completion.prerequisiteGroups[0].id],
      matchedPrerequisiteGroupIds: [ending.prerequisiteGroups[0].id],
    },
  };
  const report = projectFinalReport(scenario, recorded);
  assert.ok(report?.kind === "ending");
  assert.equal(report.title, ending.title);
  assert.equal(report.description, ending.description);
  assert.deepEqual(
    report.reason.ending,
    projectOutcomeConditionDetail(scenario, recorded, {
      kind: "ending",
      id: ending.id,
    }),
  );
  assert.equal(report.reason.completion[0].matchSource, "outcome");
  assert.equal(
    report.activeCrises[0].id,
    scenario.gameOvers![0].id,
    "Normal Endings retain unfinished crises",
  );
  assert.deepEqual(report.actors, scenario.historicalActors);

  const fallbackEnding = scenario.completion.fallbackEnding;
  const fallback = projectFinalReport(scenario, {
    ...recorded,
    outcome: {
      ...recorded.outcome,
      endingId: fallbackEnding.id,
      usedFallback: true,
      matchedPrerequisiteGroupIds: [],
    },
  });
  assert.ok(fallback?.kind === "ending");
  assert.equal(fallback.title, fallbackEnding.title);
  assert.equal(fallback.description, fallbackEnding.description);
  assert.equal(fallback.reason.ending, undefined);
  assert.equal(fallback.reason.usedFallback, true);

  const crisis = scenario.gameOvers![0];
  const terminal = projectFinalReport(scenario, terminalState);
  assert.ok(terminal?.kind === "game-over");
  assert.equal(terminal.title, "Game Over");
  assert.deepEqual(terminal.reason.causes[0], {
    id: crisis.id,
    title: crisis.title,
    description: crisis.description,
    condition: projectOutcomeConditionDetail(scenario, terminalState, {
      kind: "crisis",
      id: crisis.id,
    }),
  });
  assert.equal(terminal.reason.causes[0].condition.matchSource, "outcome");
  assert.equal(terminal.activeCrises[0].status, "terminal");
}

export function runReportProjectionTests() {
  const initial = initializeScenario(exampleScenario);
  const grudge: GrudgeRuntimeState = {
    id: "report-grudge",
    label: "Reportable aftermath",
    target: "leadership-trust",
    magnitude: -0.08,
    decay: 0.9,
    createdTurn: initial.turn,
  };
  const completedTurn = {
    ...initial,
    turn: initial.turn + 1,
    effects: {
      ...initial.effects,
      "centralization-to-reach": {
        ...initial.effects["centralization-to-reach"],
        lastContribution:
          initial.effects["centralization-to-reach"].lastContribution + 0.1,
      },
    },
    nodes: {
      ...initial.nodes,
      "leadership-trust": {
        ...initial.nodes["leadership-trust"],
        value: initial.nodes["leadership-trust"].value - 0.4,
      },
      centralization: {
        ...initial.nodes.centralization,
        value: initial.nodes.centralization.value + 0.25,
      },
      "clergy-formation": {
        ...initial.nodes["clergy-formation"],
        value: initial.nodes["clergy-formation"].value + 0.25,
      },
      "governance-tension": {
        ...initial.nodes["governance-tension"],
        isActive: true,
      },
      authority: {
        ...initial.nodes.authority,
        value: initial.nodes.authority.value + 0.0000000005,
      },
    },
    grudges: [grudge],
  };
  const report = projectTurnReport(exampleScenario, initial, completedTurn);

  assert(
    report.changes.length === 4,
    "Report should exclude insignificant numeric changes",
  );
  assert(
    report.highlights.map((change) => change.nodeId).join(",") ===
      "leadership-trust,centralization,clergy-formation,governance-tension",
    "Highlights should show up to four normalized changes and preserve Scenario order for ties",
  );
  assert(
    report.situationTransitions[0]?.kind === "began" &&
      report.situationTransitions[0]?.node.id === "governance-tension",
    "Situation activation should be reported independently of numeric change",
  );
  assert(
    report.changedEffectIds.join(",") === "centralization-to-reach",
    "Report should identify changed Effects in Scenario order",
  );
  assert(
    report.grudges[0]?.targetId === "leadership-trust" &&
      report.grudges[0]?.targetName === "Leadership Trust" &&
      report.grudges[0]?.targetDomain ===
        exampleScenario.nodes.find((node) => node.id === "leadership-trust")
          ?.domain &&
      report.grudges[0]?.magnitude === -0.08,
    "Remaining Grudges should include their target, domain, and magnitude",
  );

  const unchanged = projectTurnReport(exampleScenario, initial, initial);
  assert(
    unchanged.changes.length === 0 &&
      unchanged.highlights.length === 0 &&
      unchanged.changedEffectIds.length === 0,
    "An unchanged snapshot should not contain node or Effect changes",
  );
  assert(
    institutionEra(0) === "humble" && institutionEra(4) === "humble",
    "Turns zero through four should use the humble era",
  );
  assert(
    institutionEra(5) === "growing" && institutionEra(11) === "growing",
    "Turns five through eleven should use the growing era",
  );
  assert(
    institutionEra(12) === "established",
    "Turn twelve should begin the established era",
  );
  assert(
    isEtherealTurn(report),
    "A situation transition should be significant",
  );
  assert(
    !isEtherealTurn(unchanged),
    "An unchanged turn should not receive the Ethereal treatment",
  );

  const gameOverDefinition = exampleScenario.gameOvers![0];
  const warningState = {
    ...initial,
    turn: initial.turn + 1,
    year: (initial.year ?? 0) + 1,
    gameOverProgress: {
      ...initial.gameOverProgress,
      [gameOverDefinition.id]: {
        episode: 1,
        consecutiveTurns: 1,
        matchedPrerequisiteGroupIds: [
          gameOverDefinition.prerequisiteGroups[0].id,
        ],
      },
    },
  };
  const warnings = projectCrisis(exampleScenario, warningState);
  const warningAnalysis = projectCrisisDetail(
    exampleScenario,
    warningState,
    gameOverDefinition.id,
  )!;
  assert(
    warnings[0]?.turnsRemaining === 3 &&
      warningAnalysis.matchedGroups[0]?.prerequisites.length === 2 &&
      warningAnalysis.allGroups.length ===
        gameOverDefinition.prerequisiteGroups.length &&
      warningAnalysis.matchedGroups
        .flatMap(({ prerequisites }) => prerequisites)
        .filter(({ nodeId }) => nodeId).length === 2,
    "Game Over warnings should project countdowns and mechanical prerequisites",
  );
  assert(
    projectCrisis(exampleScenario, warningState)[0]?.status === "warning",
    "Qualifying Game Overs should project warning Crisis records",
  );
  const crisisReport = projectTurnReport(
    exampleScenario,
    initial,
    warningState,
  );
  assert(
    crisisReport.crisisTransitions[0]?.stage?.id === "assembly-inquiry",
    "A newly reached crisis stage should appear in the turn report",
  );
  const recoveredState = {
    ...warningState,
    turn: warningState.turn + 1,
    year: warningState.year + 1,
    gameOverProgress: {
      ...warningState.gameOverProgress,
      [gameOverDefinition.id]: {
        episode: 1,
        consecutiveTurns: 0,
        matchedPrerequisiteGroupIds: [],
      },
    },
  };
  assert(
    projectTurnReport(exampleScenario, warningState, recoveredState)
      .crisisTransitions[0]?.kind === "recovered",
    "A cleared crisis should appear as a recovery in the turn report",
  );
  assert(
    projectCrisis(exampleScenario, recoveredState, [gameOverDefinition.id])[0]
      ?.status === "recovered",
    "A recovery transition should retain a Crisis record during reveal",
  );

  const terminalState = {
    ...warningState,
    gameOverProgress: {
      ...warningState.gameOverProgress,
      [gameOverDefinition.id]: {
        ...warningState.gameOverProgress[gameOverDefinition.id],
        consecutiveTurns: gameOverDefinition.turnsToGameOver,
      },
    },
    outcome: {
      kind: "game-over" as const,
      turn: warningState.turn,
      causes: [
        {
          gameOverId: gameOverDefinition.id,
          matchedPrerequisiteGroupIds: [
            gameOverDefinition.prerequisiteGroups[0].id,
          ],
        },
      ],
    },
  };
  const gameOverReport = terminalConditions(exampleScenario, terminalState);
  assertFinalReportProjections(exampleScenario, warningState, terminalState);
  assert(
    gameOverReport[0]?.id === gameOverDefinition.id &&
      gameOverReport[0].matchedGroups[0]?.id ===
        gameOverDefinition.prerequisiteGroups[0].id,
    "The terminal report should preserve authored content and matched causes",
  );

  const warning = warnings[0];
  assert(warning !== undefined, "The example crisis should project a warning");
  const timelineFor = (
    consecutiveTurns: number,
    definition: GameOverDefinition = gameOverDefinition,
  ) =>
    projectCrisisDetail(
      { ...exampleScenario, gameOvers: [definition] },
      {
        ...warningState,
        gameOverProgress: {
          [definition.id]: {
            episode: 1,
            consecutiveTurns,
            matchedPrerequisiteGroupIds: [],
          },
        },
      },
      definition.id,
    )!.timeline;
  const warningDetail = warningAnalysis.timeline;
  const warningAtTwo = timelineFor(2);
  const warningAtLastTurn = timelineFor(gameOverDefinition.turnsToGameOver - 1);
  const { milestones } = warningDetail;
  assert(
    warningDetail.stageLabel === gameOverDefinition.stages[0].title &&
      warningDetail.terminalTurn === gameOverDefinition.turnsToGameOver &&
      warningDetail.progressLabel === formatCrisisProgressLabel(warning) &&
      formatCrisisTurns(warning.turnsRemaining) === "3 turns" &&
      warningDetail.progressLabel.includes("1 of 4 qualifying turns"),
    "Crisis details should combine stage, scale, and accessible progress wording",
  );
  assert(
    milestones.filter(({ kind }) => kind === "stage").length ===
      gameOverDefinition.stages.length &&
      gameOverDefinition.stages.every(
        (stage, index) =>
          milestones[index]?.id === stage.id &&
          milestones[index]?.turn === stage.atTurn &&
          milestones[index]?.title === stage.title &&
          milestones[index]?.positionPercent ===
            (stage.atTurn / gameOverDefinition.turnsToGameOver) * 100,
      ) &&
      milestones.at(-1)?.kind === "terminal" &&
      milestones.at(-1)?.turn === gameOverDefinition.turnsToGameOver &&
      milestones.at(-1)?.title === "Game Over" &&
      milestones.at(-1)?.positionPercent === 100,
    "Crisis details should project stage and terminal ticks at authored positions",
  );
  assert(
    warningAtTwo.progressCopy.primary === "Turn: 2 / 4" &&
      warningAtTwo.progressCopy.secondary === "Next threshold: turn 3",
    "Warning crises should identify the current turn and next authored threshold",
  );
  assert(
    warningAtLastTurn.progressCopy.secondary ===
      `Next threshold: turn ${gameOverDefinition.turnsToGameOver}`,
    "Warning crises should fall back to the terminal turn when no authored stage remains",
  );
  assert(
    projectCrisisDetail(exampleScenario, initial, gameOverDefinition.id) ===
      undefined,
    "Inactive crises should not build inspection details",
  );
  const longStageTitle =
    "A deliberately long authored stage name that must remain complete";
  const unsortedStages = Object.freeze([
    { ...gameOverDefinition.stages[0], id: "late", atTurn: 3 },
    {
      ...gameOverDefinition.stages[0],
      id: "early",
      atTurn: 1,
      title: longStageTitle,
    },
    { ...gameOverDefinition.stages[0], id: "middle", atTurn: 2 },
  ]);
  const unsortedDetail = timelineFor(1, {
    ...gameOverDefinition,
    stages: unsortedStages,
  });
  assert(
    unsortedDetail.milestones.map(({ turn }) => turn).join(",") === "1,2,3,4" &&
      unsortedDetail.progressCopy.secondary === "Next threshold: turn 2" &&
      unsortedDetail.milestones[0]?.title === longStageTitle &&
      unsortedStages.map(({ atTurn }) => atTurn).join(",") === "3,1,2",
    "Crisis details should sort thresholds without mutating authored order",
  );
  const recovered = projectCrisis(exampleScenario, recoveredState, [
    gameOverDefinition.id,
  ])[0];
  assert(
    recovered !== undefined,
    "The recovered crisis should appear in the reveal projection",
  );
  const recoveredDetail = projectCrisisDetail(
    exampleScenario,
    recoveredState,
    gameOverDefinition.id,
    [gameOverDefinition.id],
  )!.timeline;
  assert(
    recoveredDetail.stageLabel === "Prerequisites cleared" &&
      recoveredDetail.progressCopy.primary === "Recovered" &&
      recoveredDetail.progressCopy.secondary === "Conditions cleared" &&
      recoveredDetail.progressLabel.includes("Recovered, conditions cleared") &&
      projectCrisis(exampleScenario, recoveredState).length === 0,
    "Recovered crisis details should describe cleared conditions in the reveal projection",
  );
  const terminal = projectCrisis(exampleScenario, terminalState)[0];
  assert(terminal !== undefined, "The terminal crisis should project details");
  const terminalDetail = projectCrisisDetail(
    exampleScenario,
    terminalState,
    gameOverDefinition.id,
  )!.timeline;
  assert(
    terminal.status === "terminal" &&
      terminalDetail.progressCopy.primary === "Game Over" &&
      terminalDetail.progressCopy.secondary === "Turn: 4 / 4" &&
      terminalDetail.progressLabel.includes("Game Over, turn 4 of 4") &&
      terminal.turnsRemaining === 0 &&
      terminal.progressPercent === 100,
    "Terminal crisis presentation should remain complete and identify Game Over",
  );
  const projectProgress = (
    definition: GameOverDefinition,
    consecutiveTurns: number,
  ) =>
    projectCrisis(
      { ...exampleScenario, gameOvers: [definition] },
      {
        ...warningState,
        gameOverProgress: {
          [definition.id]: {
            episode: 1,
            consecutiveTurns,
            matchedPrerequisiteGroupIds: [],
          },
        },
      },
    )[0];
  assert(
    projectProgress(gameOverDefinition, 2).turnsRemaining === 2 &&
      projectProgress(gameOverDefinition, 0) === undefined,
    "Only positive progress should be visible",
  );
  for (const definition of exampleScenario.gameOvers ?? []) {
    const progress = projectProgress(definition, 1);
    assert(
      progress.turnsRemaining === definition.turnsToGameOver - 1 &&
        Math.abs(progress.progressPercent - 100 / definition.turnsToGameOver) <
          0.000001 &&
        timelineFor(1, definition).stageLabel ===
          definition.stages.find(({ atTurn }) => atTurn === 1)?.title,
      `Crisis progress should respect ${definition.id}'s authored duration`,
    );
  }
  const beyondTerminal = projectProgress(
    { ...gameOverDefinition, stages: unsortedStages },
    6,
  );
  assert(
    beyondTerminal.turnsRemaining === 0 &&
      beyondTerminal.progressPercent === 100 &&
      timelineFor(6, { ...gameOverDefinition, stages: unsortedStages })
        .stageLabel === unsortedStages[0].title &&
      beyondTerminal.status === "warning",
    "Progress clamps and selects the latest reached stage without inventing terminal status",
  );
  assert(
    projectCrisis(exampleScenario, recoveredState, [
      gameOverDefinition.id,
      gameOverDefinition.id,
      "unknown",
    ]).length === 1 &&
      projectCrisis(exampleScenario, warningState, [gameOverDefinition.id])[0]
        ?.status === "warning",
    "Recovery ignores duplicates, unknown IDs, and active crises",
  );

  const alternateGroup = {
    id: "alternate-review",
    title: "Alternate review",
    allOf: [gameOverDefinition.prerequisiteGroups[0].allOf[0]],
  };
  const definitionWithAlternatives = {
    ...gameOverDefinition,
    prerequisiteGroups: [
      ...gameOverDefinition.prerequisiteGroups,
      alternateGroup,
    ],
  };
  const scenarioWithAlternatives = {
    ...exampleScenario,
    gameOvers: [definitionWithAlternatives],
  };
  const alternateState = {
    ...warningState,
    gameOverProgress: {
      ...warningState.gameOverProgress,
      [gameOverDefinition.id]: {
        ...warningState.gameOverProgress[gameOverDefinition.id],
        matchedPrerequisiteGroupIds: [alternateGroup.id],
      },
    },
  };
  assert(
    projectPrerequisiteGroups(
      definitionWithAlternatives.prerequisiteGroups,
      [alternateGroup.id],
      scenarioWithAlternatives,
      alternateState,
    ).filter(({ matched }) => matched)[0]?.id === alternateGroup.id &&
      projectCrisisDetail(
        scenarioWithAlternatives,
        alternateState,
        gameOverDefinition.id,
      )?.matchedGroups[0]?.id === alternateGroup.id,
    "Warnings should project whichever alternative group the runtime recorded",
  );
  const recordedOutcome = {
    ...alternateState,
    outcome: {
      kind: "game-over" as const,
      turn: alternateState.turn,
      causes: [
        {
          gameOverId: gameOverDefinition.id,
          matchedPrerequisiteGroupIds: [
            gameOverDefinition.prerequisiteGroups[0].id,
          ],
        },
      ],
    },
  };
  assert(
    terminalConditions(scenarioWithAlternatives, recordedOutcome)[0]
      ?.matchedGroups[0]?.id === gameOverDefinition.prerequisiteGroups[0].id,
    "Terminal reports must use recorded outcome groups rather than live warning groups",
  );

  const multipleDefinitions = [
    { ...definitionWithAlternatives, id: "z", title: "Zulu" },
    { ...definitionWithAlternatives, id: "a", title: "Alpha" },
    { ...definitionWithAlternatives, id: "b", title: "Alpha" },
    { ...definitionWithAlternatives, id: "urgent", title: "Urgent" },
  ];
  const multipleScenario = {
    ...scenarioWithAlternatives,
    gameOvers: multipleDefinitions,
  };
  const multipleState = {
    ...recordedOutcome,
    gameOverProgress: Object.fromEntries(
      multipleDefinitions.map(({ id }) => [
        id,
        {
          episode: 1,
          consecutiveTurns: id === "urgent" ? 3 : 2,
          matchedPrerequisiteGroupIds: [alternateGroup.id],
        },
      ]),
    ),
    outcome: {
      kind: "game-over" as const,
      turn: recordedOutcome.turn,
      causes: [
        {
          gameOverId: "b",
          matchedPrerequisiteGroupIds: [
            gameOverDefinition.prerequisiteGroups[0].id,
          ],
        },
        { gameOverId: "z", matchedPrerequisiteGroupIds: [alternateGroup.id] },
      ],
    },
  };
  const beforeProjection = JSON.stringify({ multipleScenario, multipleState });
  const multipleCrises = projectCrisis(multipleScenario, multipleState);
  const multipleReport = terminalConditions(multipleScenario, multipleState);
  assert(
    multipleCrises.map(({ id }) => id).join(",") === "urgent,a,b,z" &&
      multipleCrises
        .filter(({ status }) => status === "terminal")
        .map(({ id }) => id)
        .join(",") === "b,z",
    "Crises sort by countdown, title, and stable title ties; only recorded causes are terminal",
  );
  assert(
    multipleReport.map(({ id }) => id).join(",") === "b,z" &&
      multipleReport[0].matchedGroups[0].id ===
        gameOverDefinition.prerequisiteGroups[0].id &&
      multipleReport[0].matchedGroups[0].prerequisites.some(
        ({ isMet }) => !isMet,
      ) &&
      multipleReport[0].consecutiveTurns === 2,
    "Reports preserve cause order and recorded groups despite different runtime groups and current readings",
  );
  for (const gameOverProgress of [
    {},
    { b: { episode: 1, consecutiveTurns: 0, matchedPrerequisiteGroupIds: [] } },
  ] as readonly SimulationState["gameOverProgress"][]) {
    assert(
      terminalConditions(multipleScenario, {
        ...multipleState,
        gameOverProgress,
      })[0].consecutiveTurns === gameOverDefinition.turnsToGameOver,
      "Missing or zero runtime duration falls back to authored terminal duration",
    );
  }
  assert(
    JSON.stringify({ multipleScenario, multipleState }) === beforeProjection,
    "Lifecycle and report projection must leave inputs unchanged",
  );
  const contributionState = {
    ...completedTurn,
    effects: {
      ...completedTurn.effects,
      "centralization-to-reach": {
        ...completedTurn.effects["centralization-to-reach"],
        lastContribution: -0.2,
      },
    },
    grudges: [
      grudge,
      { ...grudge, id: "new", createdTurn: completedTurn.turn },
    ],
  };
  const contributionsBefore = JSON.stringify(contributionState);
  const contributions = projectContributions(
    exampleScenario,
    contributionState,
    ["leadership-trust", "governance-reach"],
  );
  assert(
    contributions.some(({ id }) => id === "centralization-to-reach") &&
      contributions.some(({ id }) => id === grudge.id) &&
      !contributions.some(({ id }) => id === "new") &&
      contributions.at(-1)?.kind === "grudge" &&
      projectContributions(exampleScenario, contributionState, []).length ===
        0 &&
      JSON.stringify(contributionState) === contributionsBefore,
    "Shared contributions filter targets and new Grudges, preserve Effect-before-Grudge order, and leave state unchanged",
  );

  const sampleContributions: Contribution[] = [
    {
      id: "a",
      kind: "effect",
      amount: -0.2,
      sourceTitle: "A",
      label: "A",
      value: "−20%",
      targetId: "x",
      targetTitle: "X",
    },
    {
      id: "b",
      kind: "effect",
      amount: 0.3,
      sourceTitle: "B",
      label: "B",
      value: "+30%",
      targetId: "y",
      targetTitle: "Y",
    },
    {
      id: "c",
      kind: "grudge",
      amount: -0.3,
      sourceTitle: "C",
      label: "C",
      value: "−30%",
      targetId: "x",
      targetTitle: "X",
    },
  ];
  const grouped = groupContributions(sampleContributions);
  assert(
    grouped.map(({ targetId }) => targetId).join(",") === "x,y" &&
      grouped[0].contributions.map(({ id }) => id).join(",") === "a,c" &&
      getBiggestContribution(sampleContributions)?.id === "b" &&
      getBiggestContribution([]) === undefined,
    "Contributions should preserve target and tie order while selecting the largest magnitude",
  );
  assert(
    gameOverReport[0]?.biggestContribution ===
      getBiggestContribution(gameOverReport[0]?.contributions ?? []),
    "The terminal report should expose its strongest projected contribution",
  );

  let navigation: DossierNavigationState = { reportOpen: true };
  navigation = moveDossierNavigation(navigation, {
    type: "open-condition",
    condition: { kind: "crisis", id: gameOverDefinition.id },
  });
  assert(
    navigation.condition?.id === gameOverDefinition.id && navigation.reportOpen,
    "Opening a terminal crisis should keep the report open underneath",
  );
  navigation = moveDossierNavigation(navigation, {
    type: "open-node",
    nodeId: "leadership-trust",
  });
  assert(
    navigation.selectedNodeId === "leadership-trust" &&
      navigation.condition?.id === gameOverDefinition.id,
    "A node dossier should open over its crisis dossier",
  );
  navigation = moveDossierNavigation(navigation, {
    type: "open-node",
    nodeId: "authority",
  });
  assert(
    navigation.selectedNodeId === "authority" &&
      navigation.condition?.id === gameOverDefinition.id &&
      navigation.reportOpen,
    "Switching linked nodes should retain the condition and report underneath",
  );
  navigation = moveDossierNavigation(navigation, { type: "close-node" });
  assert(
    navigation.selectedNodeId === undefined &&
      navigation.condition?.id === gameOverDefinition.id,
    "Closing the node dossier should reveal its crisis dossier",
  );
  navigation = moveDossierNavigation(navigation, { type: "close-condition" });
  assert(
    navigation.condition === undefined && navigation.reportOpen,
    "Closing a crisis opened from Game Over should reveal the open report",
  );
  navigation = moveDossierNavigation(navigation, {
    type: "review-final-state",
  });
  navigation = moveDossierNavigation(navigation, {
    type: "open-condition",
    condition: { kind: "crisis", id: gameOverDefinition.id },
  });
  navigation = moveDossierNavigation(navigation, { type: "close-condition" });
  assert(
    !navigation.reportOpen && navigation.condition === undefined,
    "A crisis opened outside the terminal report should close to the game view",
  );
  navigation = moveDossierNavigation(navigation, { type: "open-report" });
  navigation = moveDossierNavigation(navigation, { type: "reset" });
  assert(
    !navigation.reportOpen &&
      navigation.condition === undefined &&
      navigation.selectedNodeId === undefined,
    "Restarting should clear every dossier overlay",
  );

  let activations = 0;
  let stopped = 0;
  let prevented = 0;
  const trigger = getDossierTriggerProps(
    "Open source node dossier",
    () => activations++,
    true,
  );
  const triggerElement = {};
  const event = (key: string, target = triggerElement) => ({
    key,
    target,
    currentTarget: triggerElement,
    stopPropagation: () => stopped++,
    preventDefault: () => prevented++,
  });
  trigger.onClick(event("click") as never);
  trigger.onKeyDown(event("Enter") as never);
  trigger.onKeyDown(event(" ") as never);
  trigger.onKeyDown(event("Escape") as never);
  trigger.onKeyDown(event("Enter", {}) as never);
  assert(
    trigger.role === "button" &&
      trigger.tabIndex === 0 &&
      trigger["aria-label"] === "Open source node dossier" &&
      activations === 3 &&
      stopped === 3 &&
      prevented === 2,
    "Nested dossier triggers should activate on click, Enter, and Space without opening their parent",
  );
}

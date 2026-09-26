import { exampleScenario } from "../../src/scenarios/example";
import {
  initializeScenario,
  type GrudgeRuntimeState,
} from "../../src/simulation";
import { projectTurnReport } from "../../src/ui/panels/projectTurnReport";
import { institutionEra, isEtherealTurn } from "../../src/ui/institutionEra";
import {
  getBiggestContribution,
  getCrisisProgress,
  getGroups,
  groupContributions,
  projectCrises,
  projectGameOverReport,
  projectGameOverWarnings,
  type Contribution,
} from "../../src/ui/game/projectGameOvers";
import {
  crisisCountdown,
  crisisElapsedLabel,
  crisisProgressLabel,
  crisisStageLabel,
  crisisStatusLabel,
  crisisStatusVariant,
  crisisTurnsLabel,
} from "../../src/ui/game/crisisPresentation";
import {
  moveDossierNavigation,
  type DossierNavigationState,
} from "../../src/ui/game/useDossierNavigation";
import { getDossierTriggerProps } from "../../src/ui/dossierActivation";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runTurnReportProjectionTests() {
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
    report.highlights.map((change) => change.node.id).join(",") ===
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
  const warnings = projectGameOverWarnings(exampleScenario, warningState);
  assert(
    warnings[0]?.turnsRemaining === 3 &&
      warnings[0].matchedGroups[0]?.prerequisites.length === 2 &&
      warnings[0].allGroups.length ===
        gameOverDefinition.prerequisiteGroups.length &&
      warnings[0].matchedPrerequisiteNodeIds.length === 2,
    "Game Over warnings should project countdowns and mechanical prerequisites",
  );
  assert(
    projectCrises(exampleScenario, warningState)[0]?.status ===
      "warning",
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
    projectCrises(exampleScenario, recoveredState, [
      {
        kind: "recovered",
        gameOverId: gameOverDefinition.id,
        consecutiveTurns: 0,
        turnsRemaining: gameOverDefinition.terminalAfterTurns,
      },
    ])[0]?.status === "recovered",
    "A recovery transition should retain a Crisis record during reveal",
  );

  const terminalState = {
    ...warningState,
    gameOverProgress: {
      ...warningState.gameOverProgress,
      [gameOverDefinition.id]: {
        ...warningState.gameOverProgress[gameOverDefinition.id],
        consecutiveTurns: gameOverDefinition.terminalAfterTurns,
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
  const gameOverReport = projectGameOverReport(exampleScenario, terminalState);
  assert(
    gameOverReport[0]?.definition.id === gameOverDefinition.id &&
      gameOverReport[0].matchedGroups[0]?.group.id ===
        gameOverDefinition.prerequisiteGroups[0].id,
    "The terminal report should preserve authored narrative and matched causes",
  );

  const warning = warnings[0];
  assert(
    warning !== undefined &&
      crisisStageLabel(warning) === gameOverDefinition.stages[0].title &&
      crisisTurnsLabel(warning.turnsRemaining) === "3 turns" &&
      crisisElapsedLabel(warning) === "1/4 qualifying turns" &&
      crisisProgressLabel(warning).includes("1 of 4 qualifying turns") &&
      crisisStatusLabel("warning") === "Warning" &&
      crisisStatusVariant("recovered") === "outline",
    "Crisis surfaces should share stage, status, and progress wording",
  );
  const recovered = projectCrises(exampleScenario, recoveredState, [
    {
      kind: "recovered",
      gameOverId: gameOverDefinition.id,
      consecutiveTurns: 0,
      turnsRemaining: gameOverDefinition.terminalAfterTurns,
    },
  ])[0];
  assert(
    recovered !== undefined &&
      crisisStageLabel(recovered) === "Prerequisites cleared" &&
      crisisCountdown(recovered) === "Cleared this turn" &&
      projectCrises(exampleScenario, recoveredState).length === 0,
    "Recovered crises should only remain in the reveal projection",
  );
  const terminal = projectCrises(exampleScenario, terminalState)[0];
  assert(
    terminal?.status === "terminal" &&
      crisisCountdown(terminal) === "Game Over" &&
      terminal.turnsRemaining === 0 &&
      terminal.progressPercent === 100,
    "Terminal crisis presentation should remain complete and identify Game Over",
  );
  assert(
    getCrisisProgress(gameOverDefinition, 2).turnsRemaining === 2 &&
      getCrisisProgress(gameOverDefinition, 0).stage === undefined,
    "Crisis progress should select stages and countdowns from elapsed turns",
  );
  for (const definition of exampleScenario.gameOvers ?? []) {
    const progress = getCrisisProgress(definition, 1);
    assert(
      progress.turnsRemaining === definition.terminalAfterTurns - 1 &&
        Math.abs(
          progress.progressPercent - 100 / definition.terminalAfterTurns,
        ) < 0.000001 &&
        progress.stage?.atTurn === 1,
      `Crisis progress should respect ${definition.id}'s authored duration`,
    );
  }

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
    getGroups(
      definitionWithAlternatives,
      [alternateGroup.id],
      scenarioWithAlternatives,
      alternateState,
    ).filter(({ matched }) => matched)[0]?.group.id === alternateGroup.id &&
      projectGameOverWarnings(scenarioWithAlternatives, alternateState)[0]
        ?.matchedGroups[0]?.group.id === alternateGroup.id,
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
    projectGameOverReport(scenarioWithAlternatives, recordedOutcome)[0]
      ?.matchedGroups[0]?.group.id ===
      gameOverDefinition.prerequisiteGroups[0].id,
    "Terminal reports must use recorded outcome groups rather than live warning groups",
  );

  const sampleContributions: Contribution[] = [
    { id: "a", kind: "effect", amount: -0.2, sourceTitle: "A", label: "A", value: "−20%", targetId: "x", targetTitle: "X" },
    { id: "b", kind: "effect", amount: 0.3, sourceTitle: "B", label: "B", value: "+30%", targetId: "y", targetTitle: "Y" },
    { id: "c", kind: "grudge", amount: -0.3, sourceTitle: "C", label: "C", value: "−30%", targetId: "x", targetTitle: "X" },
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
    type: "open-crisis",
    crisisId: gameOverDefinition.id,
  });
  assert(
    navigation.crisis?.id === gameOverDefinition.id && navigation.reportOpen,
    "Opening a terminal crisis should keep the report open underneath",
  );
  navigation = moveDossierNavigation(navigation, {
    type: "open-node-from-crisis",
    nodeId: "leadership-trust",
  });
  assert(
    navigation.selectedNodeId === "leadership-trust" &&
      navigation.crisis?.id === gameOverDefinition.id,
    "A node dossier should open over its crisis dossier",
  );
  navigation = moveDossierNavigation(navigation, { type: "close-node" });
  assert(
    navigation.selectedNodeId === undefined &&
      navigation.crisis?.id === gameOverDefinition.id,
    "Closing the node dossier should reveal its crisis dossier",
  );
  navigation = moveDossierNavigation(navigation, { type: "close-crisis" });
  assert(
    navigation.crisis === undefined && navigation.reportOpen,
    "Closing a crisis opened from Game Over should reveal the open report",
  );
  navigation = moveDossierNavigation(navigation, { type: "review-final-state" });
  navigation = moveDossierNavigation(navigation, {
    type: "open-crisis",
    crisisId: gameOverDefinition.id,
  });
  navigation = moveDossierNavigation(navigation, { type: "close-crisis" });
  assert(
    !navigation.reportOpen && navigation.crisis === undefined,
    "A crisis opened outside the terminal report should close to the game view",
  );
  navigation = moveDossierNavigation(navigation, { type: "open-report" });
  navigation = moveDossierNavigation(navigation, { type: "reset" });
  assert(
    !navigation.reportOpen &&
      navigation.crisis === undefined &&
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

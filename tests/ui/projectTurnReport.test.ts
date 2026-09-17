import { exampleScenario } from "../../src/scenarios/example";
import {
  initializeScenario,
  type GrudgeRuntimeState,
} from "../../src/simulation";
import { projectTurnReport } from "../../src/ui/panels/projectTurnReport";
import { institutionEra, isEtherealTurn } from "../../src/ui/institutionEra";
import {
  projectGameOverReport,
  projectGameOverWarnings,
} from "../../src/ui/game/projectGameOvers";

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
      warnings[0].matchedGroups[0]?.prerequisites.length === 2,
    "Game Over warnings should project countdowns and mechanical prerequisites",
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
}

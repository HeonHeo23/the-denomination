import { exampleScenario } from "../../src/scenarios/example";
import {
  initializeScenario,
  type GrudgeRuntimeState,
} from "../../src/simulation";
import { projectTurnReport } from "../../src/ui/panels/projectTurnReport";

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
      "leadership-trust,centralization,clergy-formation",
    "Highlights should rank normalized changes and preserve Scenario order for ties",
  );
  assert(
    report.situationTransitions[0]?.kind === "began" &&
      report.situationTransitions[0]?.node.id === "governance-tension",
    "Situation activation should be reported independently of numeric change",
  );
  assert(
    report.grudges[0]?.targetName === "Leadership Trust" &&
      report.grudges[0]?.magnitude === -0.08,
    "Remaining Grudges should include their target name and magnitude",
  );

  const unchanged = projectTurnReport(exampleScenario, initial, initial);
  assert(
    unchanged.changes.length === 0 && unchanged.highlights.length === 0,
    "An unchanged snapshot should not contain node changes",
  );
}

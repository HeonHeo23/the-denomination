import { exampleScenario } from "../../src/scenarios/example";
import { initializeScenario } from "../../src/simulation";
import {
  historyYearMarkLabels,
  nearestHistoryPointIndex,
  nextHistoryPointIndex,
  projectNodeValueHistory,
} from "../../src/ui/panels/projectNodeValueHistory";

export function runNodeValueHistoryProjectionTests() {
  if (
    historyYearMarkLabels(1).get(0) !== "last" ||
    historyYearMarkLabels(2).size !== 1 ||
    historyYearMarkLabels(6).size !== 1 ||
    historyYearMarkLabels(7).get(0) !== "first" ||
    historyYearMarkLabels(9).size !== 2 ||
    historyYearMarkLabels(10).size !== 2 ||
    historyYearMarkLabels(11).get(5) !== "middle" ||
    historyYearMarkLabels(12).size !== 3
  )
    throw new Error(
      "Year labels should appear only when marks are far enough apart",
    );
  const initial = initializeScenario(exampleScenario);
  const node = exampleScenario.nodes.find(
    (candidate) => candidate.id === "money",
  )!;
  const initialChart = projectNodeValueHistory(exampleScenario, node, initial);
  if (initialChart.points.length !== 1 || initialChart.points[0].x !== 584)
    throw new Error("The initial reading should render at the right edge");
  if (
    initialChart.guides[0]?.kind !== "baseline" ||
    Math.abs(initialChart.guides[0].y - 60) > 0.001
  )
    throw new Error(
      "A clamped node baseline should align with the chart scale",
    );

  const expandedNode = { ...node, domain: { min: 0, max: 100, clamp: false } };
  const expanded = projectNodeValueHistory(exampleScenario, expandedNode, {
    ...initial,
    nodeValueHistory: [
      {
        ...initial.nodeValueHistory[0],
        values: {
          ...initial.nodeValueHistory[0].values,
          money: { value: 140, isActive: true },
        },
      },
    ],
  });
  if (
    expanded.maximum !== 140 ||
    Math.abs(expanded.guides[0].y - (100 - (40 / 140) * 100)) > 0.001
  )
    throw new Error("Reference guides should use the expanded unclamped range");

  const rangeEnds = projectNodeValueHistory(exampleScenario, node, {
    ...initial,
    nodeValueHistory: [
      {
        ...initial.nodeValueHistory[0],
        values: {
          ...initial.nodeValueHistory[0].values,
          money: { value: node.domain.min, isActive: true },
        },
      },
      {
        ...initial.nodeValueHistory[0],
        turn: initial.turn + 1,
        values: {
          ...initial.nodeValueHistory[0].values,
          money: { value: node.domain.max, isActive: true },
        },
      },
    ],
  });
  if (rangeEnds.points[0].y !== 100 || rangeEnds.points[1].y !== 0)
    throw new Error(
      "The floor and ceiling should mark the domain minimum and maximum",
    );
  if (
    rangeEnds.points[1].x !== initialChart.points[0].x ||
    Math.abs(rangeEnds.points[1].x - rangeEnds.points[0].x - 568 / 11) > 0.001
  )
    throw new Error(
      "New readings should enter from the right and shift older readings left by one slot",
    );

  const situation = exampleScenario.nodes.find(
    (candidate) => candidate.type === "situation",
  )!;
  const closeThresholds = projectNodeValueHistory(
    exampleScenario,
    { ...situation, startThreshold: 0.51, stopThreshold: 0.5 },
    initial,
  );
  if (
    closeThresholds.guides.length !== 2 ||
    closeThresholds.guides[0].label !== "Starts at" ||
    closeThresholds.guides[1].label !== "Ends at" ||
    closeThresholds.guides[0].side !== "left" ||
    closeThresholds.guides[1].side !== "right" ||
    closeThresholds.guides[0].y >= closeThresholds.guides[1].y ||
    closeThresholds.guides[1].y - closeThresholds.guides[0].y > 2
  )
    throw new Error("Close Situation thresholds should label opposite sides");

  const points = Array.from({ length: 15 }, (_, index) => ({
    turn: exampleScenario.start.turn + index,
    values: {
      ...initial.nodeValueHistory[0].values,
      money: { value: index, isActive: true },
    },
  }));
  const chart = projectNodeValueHistory(exampleScenario, node, {
    ...initial,
    nodeValueHistory: points,
  });
  if (
    chart.points.length !== 12 ||
    chart.points[0].turn !== exampleScenario.start.turn + 3 ||
    chart.points.at(-1)?.turn !== exampleScenario.start.turn + 14 ||
    chart.points[0].x !== 16 ||
    chart.points.at(-1)?.x !== 584
  )
    throw new Error(
      "The chart should show exactly the 12 newest completed turns",
    );
  const nextChart = projectNodeValueHistory(exampleScenario, node, {
    ...initial,
    nodeValueHistory: [
      ...points,
      { ...points[0], turn: exampleScenario.start.turn + 15 },
    ],
  });
  if (
    nextChart.points[0].turn !== chart.points[1].turn ||
    nextChart.points[0].x !== chart.points[0].x ||
    nextChart.points.at(-1)?.x !== chart.points.at(-1)?.x
  )
    throw new Error("Full history windows should discard the oldest turn");
  if (
    nearestHistoryPointIndex(chart.points, chart.points[4].x + 1) !== 4 ||
    nextHistoryPointIndex(5, "ArrowLeft", chart.points.length) !== 4 ||
    nextHistoryPointIndex(5, "ArrowRight", chart.points.length) !== 6 ||
    nextHistoryPointIndex(5, "Home", chart.points.length) !== 0 ||
    nextHistoryPointIndex(5, "End", chart.points.length) !== 11 ||
    nextHistoryPointIndex(0, "ArrowLeft", chart.points.length) !== 0 ||
    nextHistoryPointIndex(11, "ArrowRight", chart.points.length) !== 11
  )
    throw new Error(
      "Pointer and keyboard navigation should select exact turns",
    );

  const stance = exampleScenario.nodes.find(
    (candidate) => candidate.type === "stance",
  )!;
  if (
    projectNodeValueHistory(exampleScenario, stance, initial).points.length !==
    0
  )
    throw new Error("Stances should have no value history chart");
}

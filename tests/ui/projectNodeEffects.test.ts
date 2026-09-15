import { exampleScenario } from "../../src/scenarios/example/index";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  previewStanceEffects,
} from "../../src/simulation/index";
import type { ScenarioDefinition } from "../../src/simulation/index";
import { projectNodeEffects } from "../../src/ui/panels/projectNodeEffects";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function runNodeEffectProjectionTests() {
  const initial = initializeScenario(exampleScenario);
  const tensionEffects = projectNodeEffects(
    "governance-tension",
    exampleScenario,
    initial,
  );

  assert(
    tensionEffects.incoming.length === 2,
    "A Situation should list both default and node incoming Effects",
  );
  assert(
    tensionEffects.outgoing.length === 1,
    "A Situation should list its outgoing Effect separately",
  );
  assert(
    tensionEffects.incoming.some(
      (effect) => effect.relatedName === "Default pressure",
    ),
    "The default source should have a player-readable name",
  );
  assert(
    tensionEffects.incoming.find(
      (effect) => effect.relatedName === "Default pressure",
    )?.relatedNodeId === undefined,
    "Default pressure should not link to a graph node",
  );

  const inactiveOutgoing = tensionEffects.outgoing[0];
  assert(
    inactiveOutgoing.contributionLabel === "0.0%" &&
      inactiveOutgoing.contributionTone === "neutral",
    "An inactive source should be identified and its missing contribution should remain neutral",
  );

  const stateWithNegativeContribution = {
    ...initial,
    effects: {
      ...initial.effects,
      "centralization-to-localists": {
        ...initial.effects["centralization-to-localists"],
        lastContribution: -0.2,
      },
    },
  };
  const centralizationEffects = projectNodeEffects(
    "centralization",
    exampleScenario,
    stateWithNegativeContribution,
  );
  const delayedEffect = centralizationEffects.outgoing.find(
    (effect) => effect.id === "centralization-to-localists",
  );
  assert(
    delayedEffect?.inertiaTurns === 2,
    "Configured Effect inertia should be projected",
  );
  assert(
    delayedEffect?.contributionTone === "negative",
    "Negative contributions should retain their sign for presentation",
  );
  assert(
    delayedEffect?.contributionLabel === "−20.0%",
    "Effect contributions should be displayed as signed percentages",
  );
  assert(
    delayedEffect?.relatedNodeId === "localist-movement",
    "Relationship projections should identify the related graph node",
  );

  const stancePreview = projectNodeEffects(
    "clergy-formation",
    exampleScenario,
    initial,
    0.4,
  ).outgoing.find((effect) => effect.id === "formation-to-quality");
  const stanceChange = executeCommand(exampleScenario, initial, {
    type: "set-stance",
    stanceId: "clergy-formation",
    value: 0.4,
  });
  assert(
    stanceChange.accepted,
    "The preview candidate should be a legal Stance change",
  );
  let afterInertiaWindow = stanceChange.state;
  for (let turn = 0; turn < 3; turn += 1) {
    afterInertiaWindow = advanceTurn(exampleScenario, afterInertiaWindow).state;
  }

  assert(
    stancePreview?.previewContribution !== undefined,
    "A changed Stance should expose its projected outgoing contribution",
  );
  assert(
    Math.abs(
      stancePreview.previewContribution -
        afterInertiaWindow.effects["formation-to-quality"].lastContribution,
    ) < 0.000001,
    "The displayed preview should match the contribution after the full inertia window",
  );
  assert(
    stancePreview.previewContributionLabel === "+26.0%",
    "The preview should show the final direct contribution after three-turn inertia",
  );
  assert(
    initial.nodes["clergy-formation"].value === 0.6,
    "Projecting a Stance preview must not mutate the live snapshot",
  );

  const inactiveStanceState = {
    ...initial,
    nodes: {
      ...initial.nodes,
      "clergy-formation": {
        ...initial.nodes["clergy-formation"],
        isActive: false,
      },
    },
  };
  const inactivePreview = previewStanceEffects(
    exampleScenario,
    inactiveStanceState,
    "clergy-formation",
    initial.nodes["clergy-formation"].value,
  ).find((effect) => effect.effectId === "formation-to-quality");
  assert(
    inactivePreview?.contribution === 0.39,
    "Inactive Stances should preview their enacted outgoing contribution",
  );
  assert(
    initial.effects["digital-to-mission"].sourceHistory.every(
      (value) => value === 0,
    ),
    "Inactive Stance Effects should seed their inertia history with zero",
  );

  const productScenario: ScenarioDefinition = {
    ...exampleScenario,
    effects: exampleScenario.effects.map((effect) =>
      effect.id === "formation-to-quality"
        ? {
            ...effect,
            response: {
              kind: "product",
              coefficient: 0.01,
              factors: ["authority"],
            },
          }
        : effect,
    ),
  };
  const productInitial = initializeScenario(productScenario);
  const productPreview = previewStanceEffects(
    productScenario,
    productInitial,
    "clergy-formation",
    0.4,
  ).find((effect) => effect.effectId === "formation-to-quality");
  assert(
    Math.abs((productPreview?.contribution ?? 0) - 0.147) < 0.000001,
    "Product previews should use contextual values from the cost-adjusted candidate state",
  );

  for (const inertiaTurns of [1, 2]) {
    const inertiaScenario: ScenarioDefinition = {
      ...exampleScenario,
      effects: exampleScenario.effects.map((effect) =>
        effect.id === "formation-to-quality"
          ? { ...effect, inertiaTurns }
          : effect,
      ),
    };
    const inertiaInitial = initializeScenario(inertiaScenario);
    const preview = previewStanceEffects(
      inertiaScenario,
      inertiaInitial,
      "clergy-formation",
      0.4,
    ).find((effect) => effect.effectId === "formation-to-quality");
    const change = executeCommand(inertiaScenario, inertiaInitial, {
      type: "set-stance",
      stanceId: "clergy-formation",
      value: 0.4,
    });
    assert(
      change.accepted,
      "The alternate-inertia Stance change should succeed",
    );
    let settled = change.state;
    for (let turn = 0; turn < inertiaTurns; turn += 1) {
      settled = advanceTurn(inertiaScenario, settled).state;
    }
    assert(
      Math.abs(
        (preview?.contribution ?? 0) -
          settled.effects["formation-to-quality"].lastContribution,
      ) < 0.000001,
      `The preview should match the settled contribution for ${inertiaTurns}-turn inertia`,
    );
  }

  const unchangedStancePreview = projectNodeEffects(
    "clergy-formation",
    exampleScenario,
    initial,
    initial.nodes["clergy-formation"].value,
  ).outgoing.find((effect) => effect.id === "formation-to-quality");
  assert(
    unchangedStancePreview?.previewContribution !== undefined,
    "The Stance page should project its current target before the slider changes",
  );
  assert(
    unchangedStancePreview.previewContributionLabel === "+39.0%",
    "An unchanged Stance target should still show its settled direct contribution",
  );

  const authorityEffects = projectNodeEffects(
    "institutional-authority",
    exampleScenario,
    initial,
  );
  assert(
    authorityEffects.outgoing.some(
      (effect) => effect.relatedName === "Authority",
    ),
    "Effects connected to hidden nodes should remain visible in the modal",
  );
}

import { exampleScenario } from "../../src/scenarios/example/index";
import {
  advanceTurn,
  executeCommand,
  initializeScenario,
  previewStanceEffects,
} from "../../src/simulation/index";
import type {
  ScenarioDefinition,
  SimulationState,
} from "../../src/simulation/index";
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
    tensionEffects.outgoing.length === 0,
    "Inactive sources should not list dormant outgoing Effects",
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

  const grudgeState: SimulationState = {
    ...initial,
    grudges: [
      {
        id: "assembly-investigation:grudge:0",
        label: "Assembly investigation",
        target: "governance-tension",
        magnitude: -0.04,
        decay: 0.75,
        createdTurn: initial.turn,
      },
    ],
  };
  const tensionWithGrudge = projectNodeEffects(
    "governance-tension",
    exampleScenario,
    grudgeState,
  );
  const grudge = tensionWithGrudge.incoming.find(
    (effect) => effect.id === "assembly-investigation:grudge:0",
  );
  assert(grudge?.kind === "grudge", "Grudges should be incoming node effects");
  assert(
    grudge.relatedNodeId === undefined &&
      grudge.relatedName === "Grudge" &&
      grudge.label === "Assembly investigation",
    "A Grudge should use the Effect row without inventing a source node",
  );
  assert(
    grudge.contributionLabel === "-4.0%" &&
      grudge.contributionTone === "negative",
    "A Grudge should preserve its signed, domain-aware magnitude",
  );
  assert(
    tensionWithGrudge.outgoing.every((effect) => effect.kind === "effect"),
    "Grudges should not appear as outgoing Effects",
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
  const inactiveTargetState = {
    ...stateWithNegativeContribution,
    nodes: {
      ...stateWithNegativeContribution.nodes,
      "localist-movement": {
        ...stateWithNegativeContribution.nodes["localist-movement"],
        isActive: false,
      },
    },
  };
  const centralizationWithInactiveTarget = projectNodeEffects(
    "centralization",
    exampleScenario,
    inactiveTargetState,
  );
  assert(
    !centralizationWithInactiveTarget.outgoing.some(
      (effect) => effect.id === "centralization-to-localists",
    ),
    "Regular outgoing Effects should hide inactive targets",
  );
  const inactiveSourceIncoming = projectNodeEffects(
    "governance-tension",
    exampleScenario,
    inactiveTargetState,
  );
  assert(
    inactiveSourceIncoming.incoming.some(
      (effect) =>
        effect.id === "localists-to-tension" &&
        effect.relatedNodeId === "localist-movement",
    ),
    "Incoming Effects should still identify inactive source nodes",
  );
  const inactiveSourceWithZeroEffect = projectNodeEffects(
    "governance-tension",
    exampleScenario,
    {
      ...inactiveTargetState,
      effects: {
        ...inactiveTargetState.effects,
        "localists-to-tension": {
          ...(inactiveTargetState.effects as SimulationState["effects"])[
            "localists-to-tension"
          ],
          lastContribution: 0,
        },
      },
    },
  );
  assert(
    !inactiveSourceWithZeroEffect.incoming.some(
      (effect) => effect.id === "localists-to-tension",
    ),
    "Inactive source nodes with zero Effects should stay hidden",
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
    stancePreview?.previewKind === "settled",
    "A legal Stance change should expose a settled target",
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
    inactivePreview?.kind === "settled",
    "A legal enactment preview should be a settled target",
  );
  assert(
    initial.effects["digital-to-mission"].sourceHistory.every(
      (value) => value === 0,
    ),
    "Inactive Stance Effects should seed their inertia history with zero",
  );

  const inactiveStanceEffects = projectNodeEffects(
    "community-partnerships",
    exampleScenario,
    initial,
    0.5,
  );
  assert(
    inactiveStanceEffects.outgoing.length === 4,
    "An inactive Stance draft should list all of its outgoing Effects",
  );
  assert(
    inactiveStanceEffects.outgoing.every(
      (effect) => effect.previewContribution !== undefined,
    ),
    "Every drafted Stance Effect should display a proposed contribution",
  );

  const blockedEnactmentState = {
    ...initial,
    nodes: {
      ...initial.nodes,
      authority: {
        ...initial.nodes.authority,
        value: 3,
        baseValue: 3,
      },
    },
  };
  const blockedEnactment = executeCommand(
    exampleScenario,
    blockedEnactmentState,
    {
      type: "enact-stance",
      stanceId: "community-partnerships",
      value: 0.5,
    },
  );
  assert(
    !blockedEnactment.accepted,
    "The low-authority enactment should remain unavailable",
  );
  const blockedProductScenario: ScenarioDefinition = {
    ...exampleScenario,
    effects: exampleScenario.effects.map((effect) =>
      effect.id === "partnerships-to-charity"
        ? {
            ...effect,
            response: {
              kind: "product",
              coefficient: 1,
              factors: ["authority"],
            },
          }
        : effect,
    ),
  };
  const blockedPreview = previewStanceEffects(
    blockedProductScenario,
    blockedEnactmentState,
    "community-partnerships",
    0.5,
  ).find((effect) => effect.effectId === "partnerships-to-charity");
  assert(
    blockedPreview?.kind === "estimate",
    "A blocked proposal should provide a clearly marked estimate",
  );
  assert(
    blockedPreview?.contribution === 0,
    "A blocked estimate should use the post-cost Resource value after clamping",
  );
  assert(
    blockedEnactmentState.nodes.authority.value === 3,
    "Projecting a blocked proposal must not mutate the live Resource value",
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

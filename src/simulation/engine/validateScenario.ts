type ObjectValue = Record<string, unknown>;

/** Validate untrusted content before any engine code reads its fields. */
export function validateScenario(input: unknown): readonly string[] {
  const errors: string[] = [];
  const error = (path: string, message: string) =>
    errors.push(`${path}: ${message}`);
  function object(
    value: unknown,
    path: string,
    fields: string[],
  ): value is ObjectValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      error(path, "expected a plain object");
      return false;
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !fields.includes(key))
        error(`${path}.${String(key)}`, "unknown field");
    }
    return true;
  }
  function only(value: ObjectValue, path: string, fields: string[]) {
    for (const key of Object.keys(value))
      if (!fields.includes(key))
        error(`${path}.${key}`, "field is not valid here");
  }
  function array(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) {
      error(path, "expected an array");
      return [];
    }
    for (let i = 0; i < value.length; i++)
      if (!Object.hasOwn(value, i))
        error(`${path}[${i}]`, "array entries must be present");
    for (const key of Reflect.ownKeys(value)) {
      if (
        key !== "length" &&
        (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key))
      )
        error(`${path}.${String(key)}`, "unknown array field");
    }
    return value;
  }
  function string(value: unknown, path: string) {
    if (typeof value !== "string") error(path, "expected a string");
  }
  function id(value: unknown, path: string) {
    if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
      error(path, "expected a kebab-case identifier");
  }
  function number(value: unknown, path: string): value is number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      error(path, "expected a finite number");
      return false;
    }
    return true;
  }
  function tags(value: unknown, path: string) {
    if (value !== undefined)
      array(value, path).forEach((v, i) => id(v, `${path}[${i}]`));
  }
  function bounded(value: unknown, path: string, domain: ObjectValue) {
    if (
      number(value, path) &&
      typeof domain.min === "number" &&
      typeof domain.max === "number" &&
      (value < domain.min || value > domain.max)
    )
      error(path, "outside the numeric domain");
  }
  // Inspect descriptors without executing authored code, and reject cycles before cloning.
  const ancestors = new Set<object>();
  function jsonValue(value: unknown, path: string) {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      return;
    if (typeof value === "number") {
      number(value, path);
      return;
    }
    if (typeof value !== "object") {
      error(path, "expected JSON-compatible data");
      return;
    }
    if (ancestors.has(value)) {
      error(path, "cyclic content is not supported");
      return;
    }
    if (
      !Array.isArray(value) &&
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    ) {
      error(path, "expected a plain object");
      return;
    }
    ancestors.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === "length") continue;
      const childPath = Array.isArray(value)
        ? `${path}[${String(key)}]`
        : `${path}.${String(key)}`;
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (typeof key === "symbol" || !descriptor.enumerable)
        error(childPath, "expected an enumerable string-keyed field");
      if (descriptor.get || descriptor.set)
        error(childPath, "accessors are not content");
      else jsonValue(descriptor.value, childPath);
    }
    ancestors.delete(value);
  }
  jsonValue(input, "$");
  if (errors.length) return errors;
  const nodes = new Map<string, ObjectValue>();
  const refs: {
    value: unknown;
    path: string;
    resource?: boolean;
    deactivate?: boolean;
  }[] = [];
  if (
    !object(input, "$", [
      "schemaVersion",
      "id",
      "title",
      "description",
      "start",
      "conditions",
      "nodes",
      "effects",
      "events",
      "dilemmas",
      "gameOvers",
      "completion",
      "historicalActors",
    ])
  )
    return errors;
  if (input.schemaVersion !== 3)
    error("$.schemaVersion", "supported version is 3");
  id(input.id, "$.id");
  string(input.title, "$.title");
  string(input.description, "$.description");
  if (object(input.start, "$.start", ["turn", "year"])) {
    if (
      number(input.start.turn, "$.start.turn") &&
      (!Number.isInteger(input.start.turn) || input.start.turn < 0)
    )
      error("$.start.turn", "expected a nonnegative integer");
    if (input.start.year !== undefined)
      number(input.start.year, "$.start.year");
  }
  tags(input.conditions, "$.conditions");
  const base = [
    "id",
    "type",
    "name",
    "description",
    "category",
    "domain",
    "initial",
    "baseline",
    "graphVisible",
    "requires",
  ];
  const extras: Record<string, string[]> = {
    stance: ["control", "cost", "enactmentCost", "repealCost"],
    indicator: [],
    resource: [],
    faction: ["valueMeaning"],
    situation: ["startThreshold", "stopThreshold"],
  };
  array(input.nodes, "$.nodes").forEach((value, i) => {
    const path = `$.nodes[${i}]`;
    // Inspect the discriminator only after verifying the object has data properties.
    if (
      !object(value, path, [
        ...base,
        "control",
        "cost",
        "enactmentCost",
        "repealCost",
        "valueMeaning",
        "startThreshold",
        "stopThreshold",
      ])
    )
      return;
    const type = typeof value.type === "string" ? value.type : "";
    if (!Object.hasOwn(extras, type))
      error(`${path}.type`, "unknown node type");
    else
      for (const key of Object.keys(value))
        if (![...base, ...extras[type]].includes(key))
          error(`${path}.${key}`, "field is not valid for this node type");
    id(value.id, `${path}.id`);
    if (typeof value.id === "string") {
      if (nodes.has(value.id)) error(`${path}.id`, "duplicate node identifier");
      nodes.set(value.id, value);
    }
    string(value.name, `${path}.name`);
    string(value.description, `${path}.description`);
    if (
      value.category !== undefined &&
      ![
        "Governance",
        "Belief and Teaching",
        "Worship and Practice",
        "Finance and Assets",
        "Care and Charity",
        "Mission and Expansion",
      ].includes(value.category as string)
    )
      error(`${path}.category`, "unknown category");
    if (
      value.graphVisible !== undefined &&
      typeof value.graphVisible !== "boolean"
    )
      error(`${path}.graphVisible`, "expected a boolean");
    tags(value.requires, `${path}.requires`);
    const domain = object(value.domain, `${path}.domain`, [
      "min",
      "max",
      "clamp",
    ])
      ? value.domain
      : {};
    number(domain.min, `${path}.domain.min`);
    number(domain.max, `${path}.domain.max`);
    if (
      typeof domain.min === "number" &&
      typeof domain.max === "number" &&
      domain.min >= domain.max
    )
      error(`${path}.domain`, "min must be less than max");
    if (typeof domain.clamp !== "boolean")
      error(`${path}.domain.clamp`, "expected a boolean");
    const initial = object(value.initial, `${path}.initial`, [
      "value",
      "isActive",
      "isForced",
    ])
      ? value.initial
      : {};
    if (type === "resource") number(initial.value, `${path}.initial.value`);
    else bounded(initial.value, `${path}.initial.value`, domain);
    if (typeof initial.isActive !== "boolean")
      error(`${path}.initial.isActive`, "expected a boolean");
    if (typeof initial.isForced !== "boolean")
      error(`${path}.initial.isForced`, "expected a boolean");
    if (initial.isForced === true && initial.isActive !== true)
      error(
        `${path}.initial.isActive`,
        "must be true when initial.isForced is true",
      );
    if (
      ["indicator", "resource"].includes(type) &&
      (initial.isActive !== true || initial.isForced !== true)
    )
      error(
        `${path}.initial`,
        "Indicators and Resources must start active and forced",
      );
    if (type === "resource" && value.baseline !== undefined)
      error(`${path}.baseline`, "Resources do not use a baseline");
    else if (value.baseline !== undefined)
      bounded(value.baseline, `${path}.baseline`, domain);
    if (type === "faction") string(value.valueMeaning, `${path}.valueMeaning`);
    if (type === "situation") {
      bounded(value.startThreshold, `${path}.startThreshold`, domain);
      bounded(value.stopThreshold, `${path}.stopThreshold`, domain);
      if (
        typeof value.stopThreshold === "number" &&
        typeof value.startThreshold === "number" &&
        value.stopThreshold > value.startThreshold
      )
        error(`${path}.stopThreshold`, "must not exceed startThreshold");
    }
    if (type === "stance") {
      if (
        object(value.control, `${path}.control`, ["kind", "step", "states"])
      ) {
        const control = value.control;
        if (control.kind === "continuous") {
          if ("states" in control)
            error(
              `${path}.control.states`,
              "unknown field for continuous control",
            );
          if (control.step !== undefined)
            number(control.step, `${path}.control.step`);
        } else if (control.kind === "discrete") {
          if ("step" in control)
            error(`${path}.control.step`, "unknown field for discrete control");
          const seen = new Set<unknown>();
          array(control.states, `${path}.control.states`).forEach(
            (state, j) => {
              const p = `${path}.control.states[${j}]`;
              if (!object(state, p, ["value", "label"])) return;
              bounded(state.value, `${p}.value`, domain);
              string(state.label, `${p}.label`);
              if (seen.has(state.value))
                error(`${p}.value`, "duplicate discrete value");
              seen.add(state.value);
            },
          );
          if (!seen.has(initial.value))
            error(`${path}.initial.value`, "must be a named discrete state");
        } else error(`${path}.control.kind`, "unknown control kind");
      }
      if (
        value.cost !== undefined &&
        object(value.cost, `${path}.cost`, [
          "resourceId",
          "base",
          "perPoint",
          "maxChange",
        ])
      ) {
        refs.push({
          value: value.cost.resourceId,
          path: `${path}.cost.resourceId`,
          resource: true,
        });
        number(value.cost.base, `${path}.cost.base`);
        number(value.cost.perPoint, `${path}.cost.perPoint`);
        if (value.cost.maxChange !== undefined)
          number(value.cost.maxChange, `${path}.cost.maxChange`);
      }
      for (const [field, label] of [
        ["enactmentCost", "enactment"],
        ["repealCost", "repeal"],
      ] as const) {
        const transitionCost = value[field];
        if (
          transitionCost !== undefined &&
          object(transitionCost, `${path}.${field}`, ["resourceId", "amount"])
        ) {
          refs.push({
            value: transitionCost.resourceId,
            path: `${path}.${field}.resourceId`,
            resource: true,
          });
          number(transitionCost.amount, `${path}.${field}.amount`);
          if (
            typeof transitionCost.amount === "number" &&
            transitionCost.amount < 0
          )
            error(
              `${path}.${field}.amount`,
              `${label} cost must not be negative`,
            );
        }
      }
    }
  });
  const effects = new Set<unknown>();
  array(input.effects, "$.effects").forEach((effect, i) => {
    const path = `$.effects[${i}]`;
    if (
      !object(effect, path, [
        "id",
        "source",
        "target",
        "response",
        "inertiaTurns",
        "label",
      ])
    )
      return;
    id(effect.id, `${path}.id`);
    if (effects.has(effect.id))
      error(`${path}.id`, "duplicate Effect identifier");
    effects.add(effect.id);
    if (effect.source !== "_default_")
      refs.push({ value: effect.source, path: `${path}.source` });
    refs.push({ value: effect.target, path: `${path}.target` });
    if (effect.label !== undefined) string(effect.label, `${path}.label`);
    if (
      effect.inertiaTurns !== undefined &&
      number(effect.inertiaTurns, `${path}.inertiaTurns`) &&
      (!Number.isInteger(effect.inertiaTurns) || effect.inertiaTurns < 1)
    )
      error(`${path}.inertiaTurns`, "expected a positive integer");
    const shapes: Record<string, string[]> = {
      constant: ["value"],
      linear: ["coefficient", "intercept"],
      power: ["coefficient", "exponent", "intercept"],
      product: ["coefficient", "factors", "intercept"],
    };
    if (
      !object(effect.response, `${path}.response`, [
        "kind",
        "value",
        "coefficient",
        "intercept",
        "exponent",
        "factors",
      ])
    )
      return;
    const response = effect.response;
    const kind = typeof response.kind === "string" ? response.kind : "";
    if (!Object.hasOwn(shapes, kind)) {
      error(`${path}.response.kind`, "unknown response kind");
      return;
    }
    only(response, `${path}.response`, ["kind", ...shapes[kind]]);
    for (const field of shapes[kind]) {
      if (field === "factors")
        array(response.factors, `${path}.response.factors`).forEach(
          (factor, j) =>
            refs.push({
              value: factor,
              path: `${path}.response.factors[${j}]`,
            }),
        );
      else if (field !== "intercept" || response[field] !== undefined)
        number(response[field], `${path}.response.${field}`);
    }
  });

  function consequences(value: unknown, path: string) {
    if (value === undefined) return;
    array(value, path).forEach((consequence, index) => {
      const p = `${path}[${index}]`;
      if (
        !object(consequence, p, [
          "kind",
          "target",
          "amount",
          "magnitude",
          "decay",
          "label",
          "active",
        ])
      )
        return;
      if (consequence.kind === "resource") {
        only(consequence, p, ["kind", "target", "amount"]);
        refs.push({
          value: consequence.target,
          path: `${p}.target`,
          resource: true,
        });
        number(consequence.amount, `${p}.amount`);
      } else if (consequence.kind === "grudge") {
        only(consequence, p, ["kind", "target", "magnitude", "decay", "label"]);
        refs.push({ value: consequence.target, path: `${p}.target` });
        number(consequence.magnitude, `${p}.magnitude`);
        if (
          number(consequence.decay, `${p}.decay`) &&
          (consequence.decay <= 0 || consequence.decay > 1)
        )
          error(`${p}.decay`, "must be greater than 0 and at most 1");
        string(consequence.label, `${p}.label`);
      } else if (consequence.kind === "activation") {
        only(consequence, p, ["kind", "target", "active"]);
        if (typeof consequence.active !== "boolean")
          error(`${p}.active`, "expected a boolean");
        refs.push({
          value: consequence.target,
          path: `${p}.target`,
          deactivate: consequence.active === false,
        });
      } else error(`${p}.kind`, "unknown consequence kind");
    });
  }

  function influences(value: unknown, path: string) {
    array(value, path).forEach((influence, index) => {
      const p = `${path}[${index}]`;
      if (!object(influence, p, ["source", "coefficient", "intercept"])) return;
      if (influence.source !== "_random_")
        refs.push({ value: influence.source, path: `${p}.source` });
      number(influence.coefficient, `${p}.coefficient`);
      if (influence.intercept !== undefined)
        number(influence.intercept, `${p}.intercept`);
    });
  }

  function incidents(value: unknown, path: string, kind: "event" | "dilemma") {
    if (value === undefined) return;
    const ids = new Set<unknown>();
    array(value, path).forEach((definition, index) => {
      const p = `${path}[${index}]`;
      const isEvent = kind === "event";
      if (
        !object(definition, p, [
          "kind",
          "id",
          "title",
          "description",
          "influences",
          "threshold",
          "cooldownTurns",
          "requires",
          isEvent ? "consequences" : "choices",
        ])
      )
        return;
      if (definition.kind !== kind) error(`${p}.kind`, `expected ${kind}`);
      id(definition.id, `${p}.id`);
      if (ids.has(definition.id))
        error(
          `${p}.id`,
          `duplicate ${isEvent ? "Event" : "Dilemma"} identifier`,
        );
      ids.add(definition.id);
      string(definition.title, `${p}.title`);
      string(definition.description, `${p}.description`);
      number(definition.threshold, `${p}.threshold`);
      if (
        number(definition.cooldownTurns, `${p}.cooldownTurns`) &&
        (!Number.isInteger(definition.cooldownTurns) ||
          definition.cooldownTurns < 1)
      )
        error(`${p}.cooldownTurns`, "expected a positive integer");
      tags(definition.requires, `${p}.requires`);
      influences(definition.influences, `${p}.influences`);
      if (isEvent) {
        if (definition.consequences === undefined)
          error(`${p}.consequences`, "expected an array");
        else consequences(definition.consequences, `${p}.consequences`);
        return;
      }
      const choices = array(definition.choices, `${p}.choices`);
      if (choices.length < 2)
        error(`${p}.choices`, "expected at least two choices");
      const choiceIds = new Set<unknown>();
      choices.forEach((choice, choiceIndex) => {
        const choicePath = `${p}.choices[${choiceIndex}]`;
        if (
          !object(choice, choicePath, [
            "id",
            "label",
            "description",
            "consequences",
          ])
        )
          return;
        id(choice.id, `${choicePath}.id`);
        if (choiceIds.has(choice.id))
          error(`${choicePath}.id`, "duplicate choice identifier");
        choiceIds.add(choice.id);
        string(choice.label, `${choicePath}.label`);
        string(choice.description, `${choicePath}.description`);
        if (choice.consequences === undefined)
          error(`${choicePath}.consequences`, "expected an array");
        else consequences(choice.consequences, `${choicePath}.consequences`);
      });
    });
  }
  incidents(input.events, "$.events", "event");
  incidents(input.dilemmas, "$.dilemmas", "dilemma");

  const scenarioContent = input;
  const startTurn = (input.start as ObjectValue | null | undefined)?.turn;
  function prerequisiteGroups(
    value: unknown,
    path: string,
    descriptions = false,
  ) {
    const groupIds = new Set<unknown>();
    const groups = array(value, path);
    if (groups.length === 0) error(path, "expected at least one group");
    groups.forEach((group, groupIndex) => {
      const groupPath = `${path}[${groupIndex}]`;
      if (!object(group, groupPath, ["id", "title", "description", "allOf"]))
        return;
      id(group.id, `${groupPath}.id`);
      if (groupIds.has(group.id))
        error(`${groupPath}.id`, "duplicate prerequisite group identifier");
      groupIds.add(group.id);
      string(group.title, `${groupPath}.title`);
      if (descriptions || group.description !== undefined)
        string(group.description, `${groupPath}.description`);
      const prerequisites = array(group.allOf, `${groupPath}.allOf`);
      if (prerequisites.length === 0)
        error(`${groupPath}.allOf`, "expected at least one prerequisite");
      prerequisites.forEach((prerequisite, prerequisiteIndex) => {
        const p = `${groupPath}.allOf[${prerequisiteIndex}]`;
        if (
          !object(prerequisite, p, [
            "kind",
            "nodeId",
            "comparison",
            "value",
            "active",
            "atTurn",
            "eventId",
            "dilemmaId",
            "choiceId",
          ])
        )
          return;
        switch (prerequisite.kind) {
          case "node-value": {
            only(prerequisite, p, ["kind", "nodeId", "comparison", "value"]);
            refs.push({ value: prerequisite.nodeId, path: `${p}.nodeId` });
            if (
              !["at-most", "at-least"].includes(String(prerequisite.comparison))
            )
              error(`${p}.comparison`, "unknown comparison");
            const target =
              typeof prerequisite.nodeId === "string"
                ? nodes.get(prerequisite.nodeId)
                : undefined;
            bounded(
              prerequisite.value,
              `${p}.value`,
              (target?.domain as ObjectValue | undefined) ??
                (Object.create(null) as ObjectValue),
            );
            break;
          }
          case "node-activation":
            only(prerequisite, p, ["kind", "nodeId", "active"]);
            refs.push({ value: prerequisite.nodeId, path: `${p}.nodeId` });
            if (typeof prerequisite.active !== "boolean")
              error(`${p}.active`, "expected a boolean");
            break;
          case "turn":
            only(prerequisite, p, ["kind", "atTurn"]);
            if (
              number(prerequisite.atTurn, `${p}.atTurn`) &&
              (!Number.isInteger(prerequisite.atTurn) ||
                prerequisite.atTurn < 0 ||
                (typeof startTurn === "number" &&
                  prerequisite.atTurn <= startTurn))
            )
              error(
                `${p}.atTurn`,
                "expected an integer greater than start.turn",
              );
            break;
          case "event":
            only(prerequisite, p, ["kind", "eventId"]);
            id(prerequisite.eventId, `${p}.eventId`);
            if (
              !Array.isArray(scenarioContent.events) ||
              !scenarioContent.events.some(
                (event) => event && event.id === prerequisite.eventId,
              )
            )
              error(`${p}.eventId`, "unknown Event reference");
            break;
          case "dilemma-choice": {
            only(prerequisite, p, ["kind", "dilemmaId", "choiceId"]);
            id(prerequisite.dilemmaId, `${p}.dilemmaId`);
            const dilemma = Array.isArray(scenarioContent.dilemmas)
              ? scenarioContent.dilemmas.find(
                  (dilemma) => dilemma && dilemma.id === prerequisite.dilemmaId,
                )
              : undefined;
            if (!dilemma) error(`${p}.dilemmaId`, "unknown Dilemma reference");
            if (prerequisite.choiceId !== undefined) {
              id(prerequisite.choiceId, `${p}.choiceId`);
              if (
                !Array.isArray(dilemma?.choices) ||
                !dilemma.choices.some(
                  (choice: ObjectValue) =>
                    choice && choice.id === prerequisite.choiceId,
                )
              )
                error(`${p}.choiceId`, "unknown choice reference");
            }
            break;
          }
          case "situation-resolved":
            only(prerequisite, p, ["kind", "nodeId"]);
            id(prerequisite.nodeId, `${p}.nodeId`);
            if (
              typeof prerequisite.nodeId !== "string" ||
              nodes.get(prerequisite.nodeId)?.type !== "situation"
            )
              error(`${p}.nodeId`, "expected a Situation reference");
            break;
          default:
            error(`${p}.kind`, "unknown prerequisite kind");
        }
      });
    });
  }

  const actorIds = new Set<unknown>();
  array(input.historicalActors, "$.historicalActors").forEach(
    (actor, index) => {
      const path = `$.historicalActors[${index}]`;
      if (!object(actor, path, ["id", "name", "role", "description"])) return;
      id(actor.id, `${path}.id`);
      if (actorIds.has(actor.id))
        error(`${path}.id`, "duplicate actor identifier");
      actorIds.add(actor.id);
      for (const field of ["name", "role", "description"])
        string(actor[field], `${path}.${field}`);
    },
  );
  if (
    object(input.completion, "$.completion", [
      "prerequisiteGroups",
      "endings",
      "fallbackEnding",
      "reportNodeIds",
    ])
  ) {
    const completion = input.completion;
    prerequisiteGroups(
      completion.prerequisiteGroups,
      "$.completion.prerequisiteGroups",
      true,
    );
    const endingIds = new Set<unknown>();
    function ending(value: unknown, path: string, conditional: boolean) {
      if (
        !object(value, path, [
          "id",
          "title",
          "narrative",
          ...(conditional ? ["priority", "prerequisiteGroups"] : []),
        ])
      )
        return;
      id(value.id, `${path}.id`);
      if (endingIds.has(value.id))
        error(`${path}.id`, "duplicate ending identifier");
      endingIds.add(value.id);
      string(value.title, `${path}.title`);
      string(value.narrative, `${path}.narrative`);
      if (conditional) {
        if (
          number(value.priority, `${path}.priority`) &&
          !Number.isInteger(value.priority)
        )
          error(`${path}.priority`, "expected an integer");
        prerequisiteGroups(
          value.prerequisiteGroups,
          `${path}.prerequisiteGroups`,
        );
      }
    }
    array(completion.endings, "$.completion.endings").forEach((value, index) =>
      ending(value, `$.completion.endings[${index}]`, true),
    );
    ending(completion.fallbackEnding, "$.completion.fallbackEnding", false);
    const reportIds = new Set<unknown>();
    array(completion.reportNodeIds, "$.completion.reportNodeIds").forEach(
      (value, index) => {
        const path = `$.completion.reportNodeIds[${index}]`;
        id(value, path);
        refs.push({ value, path });
        if (reportIds.has(value))
          error(path, "duplicate report node reference");
        reportIds.add(value);
      },
    );
  }

  if (input.gameOvers !== undefined) {
    const gameOverIds = new Set<unknown>();
    array(input.gameOvers, "$.gameOvers").forEach((definition, index) => {
      const path = `$.gameOvers[${index}]`;
      if (
        !object(definition, path, [
          "id",
          "title",
          "prerequisiteGroups",
          "terminalAfterTurns",
          "stages",
          "recovery",
          "report",
        ])
      )
        return;
      id(definition.id, `${path}.id`);
      if (gameOverIds.has(definition.id))
        error(`${path}.id`, "duplicate Game Over identifier");
      gameOverIds.add(definition.id);
      string(definition.title, `${path}.title`);
      if (
        number(definition.terminalAfterTurns, `${path}.terminalAfterTurns`) &&
        (!Number.isInteger(definition.terminalAfterTurns) ||
          definition.terminalAfterTurns < 2)
      )
        error(
          `${path}.terminalAfterTurns`,
          "expected an integer of at least 2",
        );

      prerequisiteGroups(
        definition.prerequisiteGroups,
        `${path}.prerequisiteGroups`,
      );

      const stageIds = new Set<unknown>();
      const stageTurns = new Set<unknown>();
      const stages = array(definition.stages, `${path}.stages`);
      stages.forEach((stage, stageIndex) => {
        const stagePath = `${path}.stages[${stageIndex}]`;
        if (
          !object(stage, stagePath, [
            "id",
            "atTurn",
            "title",
            "description",
            "consequences",
          ])
        )
          return;
        id(stage.id, `${stagePath}.id`);
        if (stageIds.has(stage.id))
          error(`${stagePath}.id`, "duplicate stage identifier");
        stageIds.add(stage.id);
        string(stage.title, `${stagePath}.title`);
        string(stage.description, `${stagePath}.description`);
        if (number(stage.atTurn, `${stagePath}.atTurn`)) {
          if (!Number.isInteger(stage.atTurn) || stage.atTurn < 1)
            error(`${stagePath}.atTurn`, "expected a positive integer");
          if (
            typeof definition.terminalAfterTurns === "number" &&
            stage.atTurn >= definition.terminalAfterTurns
          )
            error(`${stagePath}.atTurn`, "must be before terminalAfterTurns");
          if (stageTurns.has(stage.atTurn))
            error(`${stagePath}.atTurn`, "duplicate stage turn");
          stageTurns.add(stage.atTurn);
        }
        consequences(stage.consequences, `${stagePath}.consequences`);
      });
      if (!stageTurns.has(1))
        error(`${path}.stages`, "must include a warning stage at turn 1");

      if (
        definition.recovery !== undefined &&
        object(definition.recovery, `${path}.recovery`, [
          "title",
          "description",
          "consequences",
        ])
      ) {
        string(definition.recovery.title, `${path}.recovery.title`);
        string(definition.recovery.description, `${path}.recovery.description`);
        consequences(
          definition.recovery.consequences,
          `${path}.recovery.consequences`,
        );
      }
      if (object(definition.report, `${path}.report`, ["title", "narrative"])) {
        string(definition.report.title, `${path}.report.title`);
        string(definition.report.narrative, `${path}.report.narrative`);
      }
    });
  }
  for (const ref of refs) {
    id(ref.value, ref.path);
    const target =
      typeof ref.value === "string" ? nodes.get(ref.value) : undefined;
    if (!target) error(ref.path, "node reference does not resolve");
    else if (ref.resource && target.type !== "resource")
      error(ref.path, "must reference a Resource");
    else if (
      ref.deactivate &&
      (target.initial as ObjectValue | undefined)?.isForced === true
    )
      error(ref.path, "cannot deactivate a forced-active node");
  }
  return errors;
}

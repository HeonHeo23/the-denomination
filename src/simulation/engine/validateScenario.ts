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
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    ) {
      error(path, "expected a plain object");
      return false;
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !fields.includes(key))
        error(`${path}.${String(key)}`, "unknown field");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor?.get || descriptor?.set)
        error(`${path}.${String(key)}`, "accessors are not content");
    }
    return !Object.values(Object.getOwnPropertyDescriptors(value)).some(
      (d) => d.get || d.set,
    );
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
    if (typeof value !== "string" || !value.trim())
      error(path, "expected a nonempty string");
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
    ])
  )
    return errors;
  if (input.schemaVersion !== 3)
    error("$.schemaVersion", "supported version is 3");
  id(input.id, "$.id");
  string(input.title, "$.title");
  string(input.description, "$.description");
  if (object(input.start, "$.start", ["turn", "year"])) {
    number(input.start.turn, "$.start.turn");
    if (input.start.year !== undefined)
      number(input.start.year, "$.start.year");
  }
  tags(input.conditions, "$.conditions");
  for (const kind of ["events", "dilemmas"]) {
    if (input[kind] !== undefined && array(input[kind], `$.${kind}`).length)
      error(`$.${kind}`, "nonempty incident content is not supported yet");
  }
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
    bounded(initial.value, `${path}.initial.value`, domain);
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
    if (value.baseline !== undefined)
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
    for (const key of Object.keys(response))
      if (!["kind", ...shapes[kind]].includes(key))
        error(`${path}.response.${key}`, "unknown field for response kind");
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
        for (const key of Object.keys(consequence))
          if (!["kind", "target", "amount"].includes(key))
            error(`${p}.${key}`, "field is not valid for resource consequence");
        refs.push({
          value: consequence.target,
          path: `${p}.target`,
          resource: true,
        });
        number(consequence.amount, `${p}.amount`);
      } else if (consequence.kind === "grudge") {
        for (const key of Object.keys(consequence))
          if (!["kind", "target", "magnitude", "decay", "label"].includes(key))
            error(`${p}.${key}`, "field is not valid for grudge consequence");
        refs.push({ value: consequence.target, path: `${p}.target` });
        number(consequence.magnitude, `${p}.magnitude`);
        if (
          number(consequence.decay, `${p}.decay`) &&
          (consequence.decay <= 0 || consequence.decay > 1)
        )
          error(`${p}.decay`, "must be greater than 0 and at most 1");
        string(consequence.label, `${p}.label`);
      } else if (consequence.kind === "activation") {
        for (const key of Object.keys(consequence))
          if (!["kind", "target", "active"].includes(key))
            error(
              `${p}.${key}`,
              "field is not valid for activation consequence",
            );
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

      const groupIds = new Set<unknown>();
      const groups = array(
        definition.prerequisiteGroups,
        `${path}.prerequisiteGroups`,
      );
      if (groups.length === 0)
        error(`${path}.prerequisiteGroups`, "expected at least one group");
      groups.forEach((group, groupIndex) => {
        const groupPath = `${path}.prerequisiteGroups[${groupIndex}]`;
        if (!object(group, groupPath, ["id", "title", "allOf"])) return;
        id(group.id, `${groupPath}.id`);
        if (groupIds.has(group.id))
          error(`${groupPath}.id`, "duplicate prerequisite group identifier");
        groupIds.add(group.id);
        string(group.title, `${groupPath}.title`);
        const prerequisites = array(group.allOf, `${groupPath}.allOf`);
        if (prerequisites.length === 0)
          error(`${groupPath}.allOf`, "expected at least one prerequisite");
        prerequisites.forEach((prerequisite, prerequisiteIndex) => {
          const prerequisitePath = `${groupPath}.allOf[${prerequisiteIndex}]`;
          if (
            !object(prerequisite, prerequisitePath, [
              "kind",
              "nodeId",
              "comparison",
              "value",
              "active",
            ])
          )
            return;
          refs.push({
            value: prerequisite.nodeId,
            path: `${prerequisitePath}.nodeId`,
          });
          if (prerequisite.kind === "node-value") {
            for (const key of Object.keys(prerequisite))
              if (!["kind", "nodeId", "comparison", "value"].includes(key))
                error(
                  `${prerequisitePath}.${key}`,
                  "field is not valid for node-value prerequisite",
                );
            if (
              !["at-most", "at-least"].includes(String(prerequisite.comparison))
            )
              error(`${prerequisitePath}.comparison`, "unknown comparison");
            const target =
              typeof prerequisite.nodeId === "string"
                ? nodes.get(prerequisite.nodeId)
                : undefined;
            bounded(
              prerequisite.value,
              `${prerequisitePath}.value`,
              (target?.domain as ObjectValue | undefined) ??
                (Object.create(null) as ObjectValue),
            );
          } else if (prerequisite.kind === "node-activation") {
            for (const key of Object.keys(prerequisite))
              if (!["kind", "nodeId", "active"].includes(key))
                error(
                  `${prerequisitePath}.${key}`,
                  "field is not valid for node-activation prerequisite",
                );
            if (typeof prerequisite.active !== "boolean")
              error(`${prerequisitePath}.active`, "expected a boolean");
          } else error(`${prerequisitePath}.kind`, "unknown prerequisite kind");
        });
      });

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

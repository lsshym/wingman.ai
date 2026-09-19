import {
  arrayItemPath,
  contractBudgetDiagnostics,
  dedupeDiagnostics,
  diagnostic,
  mergeAssurance,
  node,
  propertyPath,
  rebaseNode,
  stableValue,
  unique,
  uniqueStrings,
} from "./model.mjs";

export function reconcileEvidence(documents, side) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error(`Cannot reconcile an empty ${side} evidence set.`);
  }

  const ordered = [...documents].sort((left, right) => {
    const rank = { declared: 0, observed: 1 };
    return (rank[left.assurance] ?? 2) - (rank[right.assurance] ?? 2) ||
      left.input.id.localeCompare(right.input.id);
  });
  const diagnostics = ordered.flatMap((document) => document.diagnostics || []);
  let root = ordered[0].root;
  for (const document of ordered.slice(1)) {
    root = mergeNodes(root, document.root, {
      diagnostics,
      path: "$",
      side,
    });
  }

  const allDiagnostics = dedupeDiagnostics([
    ...diagnostics.filter((item) => !resolvedByOtherEvidence(item, root)),
    ...contractBudgetDiagnostics(root, "reconciliation"),
  ]);
  const completeness = allDiagnostics.some((item) => item.blocking)
    ? "partial"
    : "complete";

  return {
    side,
    inputs: documents
      .map((document) => document.input)
      .sort((left, right) => left.id.localeCompare(right.id)),
    root,
    completeness,
    assurance: mergeAssurance(documents),
    diagnostics: allDiagnostics,
  };
}

function resolvedByOtherEvidence(item, root) {
  if (![
    "null_only_sample",
    "empty_array_items",
    "unresolved_contract_node",
  ].includes(item.kind)) {
    return false;
  }
  const current = findNode(root, item.path);
  return Boolean(current && current.kind !== "unknown" && current.provenance?.length > 1);
}

function findNode(root, targetPath) {
  if (!root) return null;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current.path === targetPath) return current;
    for (const child of Object.values(current.properties || {})) stack.push(child);
    if (current.items) stack.push(current.items);
    if (current.additionalProperties && typeof current.additionalProperties === "object") {
      stack.push(current.additionalProperties);
    }
  }
  return null;
}

function mergeNodes(left, right, context) {
  if (!left) return right;
  if (!right) return left;

  const evidenceTypes = new Set([
    ...(left.evidenceTypes || [left.evidence]),
    ...(right.evidenceTypes || [right.evidence]),
  ]);
  const bothDeclared = evidenceTypes.size === 1 && evidenceTypes.has("declared");
  const declaredAndObserved = evidenceTypes.has("declared") && evidenceTypes.has("observed");

  let kind = mergeKinds(left.kind, right.kind);
  if (
    bothDeclared &&
    left.kind !== right.kind &&
    left.kind !== "unknown" &&
    right.kind !== "unknown"
  ) {
    conflict(
      context,
      "evidence_kind_constraint_conflict",
      `Declared evidence disagrees on the structural constraint at ${context.path}: ${left.kind} versus ${right.kind}.`,
      left,
      right,
    );
  }
  if (!kind) {
    conflict(
      context,
      "evidence_kind_conflict",
      `Evidence disagrees on the kind at ${context.path}: ${left.kind} versus ${right.kind}.`,
      left,
      right,
    );
    kind = "unknown";
  }

  let required = mergeRequired(left, right);
  if (bothDeclared && left.required !== right.required) {
    conflict(
      context,
      "evidence_presence_conflict",
      `Declared evidence disagrees on required presence at ${context.path}.`,
      left,
      right,
    );
    required = left.required ?? right.required;
  }

  let nullable = left.nullable || right.nullable;
  if (bothDeclared && left.nullable !== right.nullable) {
    conflict(
      context,
      "evidence_nullability_conflict",
      `Declared evidence disagrees on nullability at ${context.path}.`,
      left,
      right,
    );
  }
  if (declaredAndObserved) {
    const declared = evidenceTypeOf(left) === "declared" ? left : right;
    const observed = declared === left ? right : left;
    if (!declaredKindAccepts(declared.kind, observed.kind)) {
      conflict(
        context,
        "declared_observed_kind_conflict",
        `Observed ${observed.kind} evidence is rejected by declared ${declared.kind} evidence at ${context.path}.`,
        declared,
        observed,
      );
    }
    if (observed.nullable && !declared.nullable) {
      conflict(
        context,
        "declared_observed_nullability_conflict",
        `Observed evidence contains null at ${context.path}, which the declaration rejects.`,
        declared,
        observed,
      );
    }
    nullable = declared.nullable || observed.nullable;
    required = declared.required;
  }

  const enumValues = mergeEnumValues(left, right, context);
  const observedValues = unique([...(left.observedValues || []), ...(right.observedValues || [])])
    .sort(compareStable);
  const observedTypes = uniqueStrings([
    ...(left.observedTypes || []),
    ...(right.observedTypes || []),
  ]).sort();

  let properties;
  let items;
  let additionalProperties;

  if (kind === "object") {
    ({ properties, additionalProperties } = mergeObjects(left, right, {
      ...context,
      evidenceTypes,
    }));
  }
  if (kind === "array") {
    if (!left.items || !right.items) {
      conflict(
        context,
        "evidence_array_items_missing",
        `Evidence does not consistently describe array items at ${context.path}.`,
        left,
        right,
      );
      items = left.items || right.items;
    } else {
      items = mergeNodes(left.items, right.items, {
        ...context,
        path: arrayItemPath(context.path),
      });
    }
  }

  return node({
    path: context.path,
    kind,
    required,
    nullable,
    evidence: evidenceTypes.size === 1 ? evidenceTypes.values().next().value : "mixed",
    evidenceTypes: [...evidenceTypes],
    provenance: uniqueStrings([...(left.provenance || []), ...(right.provenance || [])]),
    properties,
    items,
    additionalProperties,
    enumValues,
    observedValues,
    observedTypes,
    rawType: left.rawType || right.rawType,
  });
}

function declaredKindAccepts(declared, observed) {
  if (observed === "unknown") return true;
  if (declared === observed) return true;
  return declared === "number" && observed === "integer";
}

function mergeObjects(left, right, context) {
  const leftProperties = left.properties || {};
  const rightProperties = right.properties || {};
  const names = uniqueStrings([
    ...Object.keys(leftProperties),
    ...Object.keys(rightProperties),
  ]).sort();
  const properties = Object.create(null);

  for (const name of names) {
    const leftField = leftProperties[name];
    const rightField = rightProperties[name];
    const fieldPath = propertyPath(context.path, name);
    if (leftField && rightField) {
      properties[name] = mergeNodes(leftField, rightField, { ...context, path: fieldPath });
      continue;
    }

    const present = leftField || rightField;
    const missingParent = leftField ? right : left;
    const presentParent = leftField ? left : right;
    const parentTypes = new Set([
      evidenceTypeOf(presentParent),
      evidenceTypeOf(missingParent),
    ]);

    if (parentTypes.size === 1 && parentTypes.has("declared")) {
      if (
        missingParent.additionalProperties &&
        typeof missingParent.additionalProperties === "object"
      ) {
        // Typed additionalProperties constrains a value only when the property
        // exists; it does not make an explicit property required.
        const mapValueConstraint = rebaseNode(
          missingParent.additionalProperties,
          fieldPath,
          present.required,
        );
        properties[name] = mergeNodes(
          present,
          mapValueConstraint,
          { ...context, path: fieldPath },
        );
        continue;
      }
      if (missingParent.additionalProperties === false) {
        conflict(
          { ...context, path: fieldPath },
          "evidence_field_presence_conflict",
          `Declared evidence disagrees on whether ${fieldPath} is accepted by the ${context.side} shape.`,
          presentParent,
          missingParent,
        );
      }
    } else if (parentTypes.has("declared") && parentTypes.has("observed")) {
      const declaration = evidenceTypeOf(presentParent) === "declared" ? presentParent : missingParent;
      const observation = declaration === presentParent ? missingParent : presentParent;
      const declaredField = declaration.properties?.[name];
      const observedField = observation.properties?.[name];
      if (declaredField?.required === true && !observedField) {
        conflict(
          { ...context, path: fieldPath },
          "declared_required_field_missing_in_observation",
          `Observed evidence omits declared required field ${fieldPath}.`,
          declaration,
          observation,
        );
      }
      if (
        !declaredField &&
        observedField &&
        declaration.additionalProperties &&
        typeof declaration.additionalProperties === "object"
      ) {
        const mapValueConstraint = rebaseNode(
          declaration.additionalProperties,
          fieldPath,
          observedField.required,
        );
        properties[name] = mergeNodes(
          observedField,
          mapValueConstraint,
          { ...context, path: fieldPath },
        );
        continue;
      }
      if (!declaredField && observedField && declaration.additionalProperties === false) {
        conflict(
          { ...context, path: fieldPath },
          "observed_field_rejected_by_declaration",
          `Observed field ${fieldPath} is rejected by closed declared evidence.`,
          declaration,
          observation,
        );
      }
    }
    properties[name] = present;
  }

  const additionalProperties = mergeAdditionalProperties(left, right, context);
  return { properties, additionalProperties };
}

function mergeAdditionalProperties(left, right, context) {
  const leftValue = left.additionalProperties;
  const rightValue = right.additionalProperties;
  const leftType = evidenceTypeOf(left);
  const rightType = evidenceTypeOf(right);

  if (leftType !== "declared" && rightType === "declared") return rightValue;
  if (rightType !== "declared" && leftType === "declared") return leftValue;
  if (leftType !== "declared" && rightType !== "declared") return true;

  if (leftValue === rightValue) return leftValue;
  if (leftValue && typeof leftValue === "object" && rightValue && typeof rightValue === "object") {
    return mergeNodes(leftValue, rightValue, { ...context, path: `${context.path}{}` });
  }
  conflict(
    context,
    "evidence_openness_conflict",
    `Declared evidence disagrees on whether ${context.path} accepts additional properties.`,
    left,
    right,
  );
  return leftValue ?? rightValue;
}

function mergeEnumValues(left, right, context) {
  const leftEnum = left.enumValues;
  const rightEnum = right.enumValues;
  const leftType = evidenceTypeOf(left);
  const rightType = evidenceTypeOf(right);

  if (
    leftType === "declared" &&
    rightType === "declared" &&
    Boolean(leftEnum) !== Boolean(rightEnum)
  ) {
    conflict(
      context,
      "evidence_enum_constraint_conflict",
      `Declared evidence disagrees on whether ${context.path} is a closed value set.`,
      left,
      right,
    );
  }

  if (leftEnum && rightEnum) {
    if (!sameSet(leftEnum, rightEnum)) {
      conflict(
        context,
        "evidence_enum_conflict",
        `Declared evidence disagrees on allowed values at ${context.path}.`,
        left,
        right,
      );
    }
    return unique([...leftEnum, ...rightEnum]).sort(compareStable);
  }

  const declared = leftType === "declared" ? left : rightType === "declared" ? right : null;
  const observed = declared === left ? right : declared === right ? left : null;
  if (declared?.enumValues && observed?.observedValues) {
    const rejected = observed.observedValues.filter((value) =>
      !declared.enumValues.some((candidate) => stableValue(candidate) === stableValue(value)),
    );
    if (rejected.length > 0) {
      conflict(
        context,
        "declared_observed_value_conflict",
        `Observed values ${rejected.map(JSON.stringify).join(", ")} are rejected at ${context.path}.`,
        declared,
        observed,
      );
    }
    return [...declared.enumValues].sort(compareStable);
  }
  return leftEnum || rightEnum;
}

function mergeKinds(left, right) {
  if (left === right) return left;
  if (left === "unknown") return right;
  if (right === "unknown") return left;
  if (new Set([left, right]).size === 2 && [left, right].every((kind) =>
    ["integer", "number"].includes(kind)
  )) {
    return "number";
  }
  return null;
}

function mergeRequired(left, right) {
  const leftType = evidenceTypeOf(left);
  const rightType = evidenceTypeOf(right);
  if (leftType === "declared" && rightType !== "declared") return left.required;
  if (rightType === "declared" && leftType !== "declared") return right.required;
  if (left.required === right.required) return left.required;
  return left.required ?? right.required ?? null;
}

function evidenceTypeOf(value) {
  const types = value.evidenceTypes || [value.evidence];
  if (types.includes("declared")) return "declared";
  return "observed";
}

function conflict(context, kind, message, left, right) {
  context.diagnostics.push(diagnostic(kind, message, {
    path: context.path,
    source: "reconciliation",
    evidenceIds: uniqueStrings([
      ...(left.provenance || []),
      ...(right.provenance || []),
    ]),
  }));
}

function sameSet(left, right) {
  if (left.length !== right.length) return false;
  const values = new Set(right.map(stableValue));
  return left.every((value) => values.has(stableValue(value)));
}

function compareStable(left, right) {
  return stableValue(left).localeCompare(stableValue(right));
}

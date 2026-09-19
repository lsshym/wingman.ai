import path from "node:path";
import {
  arrayItemPath,
  contractLimitDiagnostic,
  contractDocument,
  diagnostic,
  INPUT_KINDS,
  inputError,
  isRecord,
  MAX_CONTRACT_DEPTH,
  MAX_CONTRACT_NODES,
  node,
  parseJsonInput,
  propertyPath,
  rebaseNode,
  unique,
  visitNode,
} from "./model.mjs";
import { extractPythonContract } from "./python.mjs";
import { extractTypeScriptContract } from "./typescript.mjs";

export { INPUT_KINDS };

const NON_CONSTRAINT_SCHEMA_KEYS = new Set([
  "$anchor",
  "$comment",
  "$defs",
  "$id",
  "$schema",
  "definitions",
  "deprecated",
  "description",
  "examples",
  "externalDocs",
  "readOnly",
  "title",
  "writeOnly",
  "xml",
]);

export function inferInputKind(inputPath, text) {
  if (inputPath !== "-") {
    const basename = path.basename(inputPath).toLowerCase();
    if (basename.endsWith(".ts") || basename.endsWith(".tsx")) return "typescript";
    if (basename.endsWith(".py")) return "python";
  }

  const parsed = tryParseJson(text);
  if (parsed.ok && isRecord(parsed.value)) {
    if (
      typeof parsed.value.openapi === "string" ||
      typeof parsed.value.swagger === "string" ||
      isRecord(parsed.value.components?.schemas)
    ) {
      return "openapi";
    }
    if (looksLikeJsonSchema(parsed.value)) return "json-schema";
  }

  if (inputPath !== "-") {
    const basename = path.basename(inputPath).toLowerCase();
    if (basename.endsWith(".schema.json")) return "json-schema";
    if (basename.endsWith(".openapi.json") || basename === "openapi.json") return "openapi";
  }
  return "json";
}

export function extractContract(text, { inputPath, kind, symbol }) {
  const input = { path: inputPath, kind, symbol };
  if (kind === "typescript") return extractTypeScriptContract(text, input);
  if (kind === "python") return extractPythonContract(text, input);

  const value = parseJsonInput(text, inputPath);
  if (kind === "json") return extractJsonSample(value, input);
  if (kind === "json-schema") return extractSchema(value, input, value);
  if (kind === "openapi") return extractOpenApi(value, input);
  throw inputError(`Unsupported input kind: ${kind}`);
}

function extractJsonSample(value, input) {
  const diagnostics = [];
  const state = { nodes: 0 };
  const root = sampleNode(value, "$", diagnostics, true, state, 0);
  visitNode(root, (current) => {
    if (current.kind !== "unknown" || !current.nullable || !current.observedTypes?.includes("null")) return;
    diagnostics.push(diagnostic(
      "null_only_sample",
      "A null-only sample proves nullability but does not prove the non-null value type.",
      {
        path: current.path,
        source: "evidence",
        blocking: true,
        severity: "warning",
      },
    ));
  });
  return contractDocument({ input, root, diagnostics, assurance: "observed" });
}

function sampleNode(value, currentPath, diagnostics, isRoot = false, state, depth) {
  if (!consumeBudget(state, depth, currentPath, diagnostics)) {
    return node({ path: currentPath, kind: "unknown", required: isRoot ? true : null, evidence: "observed" });
  }
  if (value === null) {
    return node({
      path: currentPath,
      kind: "unknown",
      required: isRoot ? true : null,
      nullable: true,
      evidence: "observed",
      observedTypes: ["null"],
    });
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      diagnostics.push(diagnostic(
        "empty_array_items",
        "An empty sample array does not provide item-shape evidence.",
        { path: arrayItemPath(currentPath), source: "evidence" },
      ));
      return node({
        path: currentPath,
        kind: "array",
        required: isRoot ? true : null,
        evidence: "observed",
        items: node({ path: arrayItemPath(currentPath), kind: "unknown", required: null, evidence: "observed" }),
      });
    }
    const itemPath = arrayItemPath(currentPath);
    const items = value.map((item) =>
      sampleNode(item, itemPath, diagnostics, false, state, depth + 1)
    );
    return node({
      path: currentPath,
      kind: "array",
      required: isRoot ? true : null,
      evidence: "observed",
      items: mergeSampleNodes(items, itemPath, diagnostics),
    });
  }
  if (isRecord(value)) {
    const properties = Object.fromEntries(
      Object.entries(value).map(([name, child]) => [
        name,
        sampleNode(
          child,
          propertyPath(currentPath, name),
          diagnostics,
          false,
          state,
          depth + 1,
        ),
      ]),
    );
    return node({
      path: currentPath,
      kind: "object",
      required: isRoot ? true : null,
      evidence: "observed",
      properties,
    });
  }

  const kind = primitiveKind(value);
  return node({
    path: currentPath,
    kind,
    required: isRoot ? true : null,
    evidence: "observed",
    observedTypes: [kind],
    observedValues: [value],
  });
}

function mergeSampleNodes(nodes, currentPath, diagnostics) {
  const nonNull = nodes.filter((item) => !(item.kind === "unknown" && item.nullable));
  const nullable = nodes.some((item) => item.nullable);
  if (nonNull.length === 0) {
    return node({
      path: currentPath,
      kind: "unknown",
      required: null,
      nullable: true,
      evidence: "observed",
      observedTypes: ["null"],
    });
  }
  const kinds = new Set(nonNull.map((item) => item.kind));
  const numericKinds = [...kinds].every((kind) => kind === "integer" || kind === "number");
  if (kinds.size > 1 && !numericKinds) {
    diagnostics.push(diagnostic(
      "heterogeneous_array_items",
      `Observed incompatible item kinds: ${[...kinds].join(", ")}.`,
      { path: currentPath, source: "evidence" },
    ));
    return node({
      path: currentPath,
      kind: "unknown",
      required: null,
      nullable,
      evidence: "observed",
      observedTypes: unique(nodes.flatMap((item) => item.observedTypes || [item.kind])),
    });
  }

  const kind = numericKinds ? "number" : nonNull[0].kind;
  if (kind === "object") {
    const names = unique(nonNull.flatMap((item) => Object.keys(item.properties || {})));
    const properties = Object.create(null);
    for (const name of names) {
      const children = nonNull.map((item) => item.properties?.[name]).filter(Boolean);
      properties[name] = mergeSampleNodes(children, propertyPath(currentPath, name), diagnostics);
    }
    return node({ path: currentPath, kind, required: null, nullable, evidence: "observed", properties });
  }
  if (kind === "array") {
    const children = nonNull.map((item) => item.items).filter(Boolean);
    return node({
      path: currentPath,
      kind,
      required: null,
      nullable,
      evidence: "observed",
      items: mergeSampleNodes(children, arrayItemPath(currentPath), diagnostics),
    });
  }
  return node({
    path: currentPath,
    kind,
    required: null,
    nullable,
    evidence: "observed",
    observedTypes: unique(nodes.flatMap((item) => item.observedTypes || [item.kind])),
    observedValues: unique(nodes.flatMap((item) => item.observedValues || [])),
  });
}

function extractSchema(schema, input, document) {
  if (!isRecord(schema) && typeof schema !== "boolean") {
    throw inputError("JSON Schema input must be an object or boolean schema");
  }
  const diagnostics = [];
  const context = { document, diagnostics, refs: [], budget: { nodes: 0 } };
  const root = schemaNode(schema, "$", true, context, 0);
  visitNode(root, (current) => {
    if (current.rawType !== "required-without-schema") return;
    diagnostics.push(diagnostic(
      "required_property_schema_missing",
      `Required property ${current.path} has no colocated or merged property schema.`,
      { path: current.path, source: "evidence" },
    ));
  });
  return contractDocument({ input, root, diagnostics, assurance: "declared" });
}

function extractOpenApi(document, input) {
  const schemas = document?.components?.schemas;
  if (!isRecord(schemas)) throw inputError("OpenAPI input does not include components.schemas");
  let symbol = input.symbol;
  if (symbol?.startsWith("#/")) {
    const selected = resolveJsonPointer(document, symbol);
    if (selected === undefined) {
      throw inputError(`OpenAPI selector cannot be resolved: ${symbol}`);
    }
    return extractSchema(selected, { ...input, symbol }, document);
  }
  if (!symbol && Object.keys(schemas).length === 1) symbol = Object.keys(schemas)[0];
  if (!symbol) throw inputError("OpenAPI extraction requires --symbol <schemaName> when multiple schemas exist");
  if (!Object.hasOwn(schemas, symbol)) throw inputError(`OpenAPI schema not found: ${symbol}`);
  return extractSchema(schemas[symbol], { ...input, symbol }, document);
}

function schemaNode(schema, currentPath, required, context, depth) {
  if (!consumeBudget(context.budget, depth, currentPath, context.diagnostics)) {
    return node({ path: currentPath, required });
  }
  if (schema === true) {
    context.diagnostics.push(diagnostic(
      "unconstrained_schema",
      "An unconstrained true schema does not provide structural evidence.",
      { path: currentPath, source: "evidence" },
    ));
    return node({ path: currentPath, required, rawType: "any" });
  }
  if (schema === false) {
    context.diagnostics.push(diagnostic("false_schema", "A false schema accepts no values and cannot be shape-compared.", { path: currentPath }));
    return node({ path: currentPath, required, rawType: "never" });
  }
  if (!isRecord(schema)) {
    context.diagnostics.push(diagnostic("invalid_schema_node", "Schema node is not an object or boolean.", { path: currentPath }));
    return node({ path: currentPath, required });
  }

  validateSchemaKeywordShapes(schema, currentPath, context.diagnostics);

  for (const keyword of [
    "patternProperties",
    "unevaluatedProperties",
    "dependentSchemas",
    "propertyNames",
    "prefixItems",
    "if",
    "then",
    "else",
    "not",
  ]) {
    if (!Object.hasOwn(schema, keyword)) continue;
    context.diagnostics.push(diagnostic(
      "schema_keyword_unsupported",
      `Schema keyword ${keyword} can affect the accepted shape and is not normalized.`,
      { path: currentPath },
    ));
  }

  if (Object.hasOwn(schema, "$ref")) {
    if (typeof schema.$ref !== "string") {
      return node({ path: currentPath, required, rawType: String(schema.$ref) });
    }
    return referencedSchemaNode(schema, currentPath, required, context, depth);
  }
  if (Array.isArray(schema.allOf)) return allOfNode(schema, currentPath, required, context, depth);
  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) {
    const keyword = Array.isArray(schema.oneOf) ? "oneOf" : "anyOf";
    context.diagnostics.push(diagnostic(
      "schema_union_unsupported",
      `${keyword} cannot be represented as one deterministic contract node.`,
      { path: currentPath },
    ));
    return node({ path: currentPath, required, rawType: keyword });
  }

  const rawTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  const nullable = schema.nullable === true || rawTypes.includes("null") || schema.enum?.includes(null) || schema.const === null;
  const types = rawTypes.filter((type) => type !== "null");
  const declaredEnumValues = enumValues(schema);
  let inferredEnumKind;
  if (declaredEnumValues?.length) {
    const enumKinds = new Set(declaredEnumValues.map(primitiveKind));
    const numericEnum = [...enumKinds].every((type) => type === "integer" || type === "number");
    if (enumKinds.size > 1 && !numericEnum) {
      context.diagnostics.push(diagnostic(
        "schema_enum_type_mismatch",
        `Schema enum contains incompatible value kinds: ${[...enumKinds].join(", ")}.`,
        { path: currentPath },
      ));
    }
    inferredEnumKind = numericEnum && enumKinds.has("number")
      ? "number"
      : enumKinds.values().next().value;
    if (types.length === 1) {
      const rejectedKinds = [...enumKinds].filter((enumKind) => !schemaKindAccepts(types[0], enumKind));
      if (rejectedKinds.length > 0) {
        context.diagnostics.push(diagnostic(
          "schema_enum_type_mismatch",
          `Schema type ${types[0]} does not accept enum value kinds: ${rejectedKinds.join(", ")}.`,
          { path: currentPath },
        ));
      }
    }
  }
  let kind = types[0];
  const invalidTypes = types.filter((type) => !["object", "array", "string", "number", "integer", "boolean"].includes(type));
  if (invalidTypes.length > 0) {
    context.diagnostics.push(diagnostic(
      "invalid_schema_type",
      `Unsupported JSON Schema type: ${invalidTypes.join(", ")}.`,
      { path: currentPath },
    ));
    kind = "unknown";
  }
  if (!kind && isRecord(schema.properties)) kind = "object";
  if (!kind && schema.items !== undefined) kind = "array";
  if (!kind && inferredEnumKind) kind = inferredEnumKind;
  if (!kind) {
    kind = "unknown";
    context.diagnostics.push(diagnostic(
      "unconstrained_schema",
      "Schema node does not provide a deterministic structural kind.",
      { path: currentPath, source: "evidence" },
    ));
  }
  if (types.length > 1) {
    context.diagnostics.push(diagnostic(
      "schema_type_union_unsupported",
      `Schema type union contains multiple non-null kinds: ${types.join(", ")}.`,
      { path: currentPath },
    ));
    kind = "unknown";
  }

  if (kind === "object") {
    const requiredNames = new Set(Array.isArray(schema.required) ? schema.required : []);
    const propertySchemas = isRecord(schema.properties) ? schema.properties : {};
    const propertyNames = unique([...Object.keys(propertySchemas), ...requiredNames]);
    const properties = Object.fromEntries(propertyNames.map((name) => [
      name,
      Object.hasOwn(propertySchemas, name)
        ? schemaNode(propertySchemas[name], propertyPath(currentPath, name), requiredNames.has(name), context, depth + 1)
        : node({
            path: propertyPath(currentPath, name),
            required: true,
            rawType: "required-without-schema",
          }),
    ]));
    let additionalProperties = true;
    if (schema.additionalProperties === false) additionalProperties = false;
    else if (isRecord(schema.additionalProperties)) {
      additionalProperties = schemaNode(schema.additionalProperties, `${currentPath}{}`, true, context, depth + 1);
    }
    return node({
      path: currentPath,
      kind,
      required,
      nullable,
      properties,
      additionalProperties,
      enumValues: declaredEnumValues,
    });
  }
  if (kind === "array") {
    let items;
    if (schema.items !== undefined) items = schemaNode(schema.items, arrayItemPath(currentPath), true, context, depth + 1);
    else {
      context.diagnostics.push(diagnostic(
        "unconstrained_array_items",
        "Array schema does not constrain its item shape.",
        { path: arrayItemPath(currentPath), source: "evidence" },
      ));
      items = node({ path: arrayItemPath(currentPath), required: true });
    }
    return node({ path: currentPath, kind, required, nullable, items, enumValues: declaredEnumValues });
  }
  return node({
    path: currentPath,
    kind,
    required,
    nullable,
    enumValues: declaredEnumValues,
  });
}

function referencedSchemaNode(schema, currentPath, required, context, depth) {
  const reference = schema.$ref;
  if (typeof reference !== "string" || !reference.startsWith("#")) {
    context.diagnostics.push(diagnostic("remote_ref_unsupported", `Only local refs are supported: ${reference}.`, { path: currentPath }));
    return node({ path: currentPath, required, rawType: String(reference) });
  }
  if (context.refs.includes(reference)) {
    context.diagnostics.push(diagnostic("cyclic_ref", `Cyclic schema ref: ${[...context.refs, reference].join(" -> ")}.`, { path: currentPath }));
    return node({ path: currentPath, required, rawType: reference });
  }
  const target = resolveJsonPointer(context.document, reference);
  if (target === undefined) {
    context.diagnostics.push(diagnostic("unresolved_ref", `Schema ref cannot be resolved: ${reference}.`, { path: currentPath }));
    return node({ path: currentPath, required, rawType: reference });
  }
  const resolved = schemaNode(
    target,
    currentPath,
    required,
    { ...context, refs: [...context.refs, reference] },
    depth,
  );
  const siblings = constraintSiblings(schema, "$ref");
  if (Object.keys(siblings).length === 0) return resolved;
  const siblingNode = schemaNode(siblings, currentPath, required, context, depth);
  return mergeAllOfNodes([resolved, siblingNode], currentPath, required, context.diagnostics);
}

function allOfNode(schema, currentPath, required, context, depth) {
  const branches = schema.allOf.map((branch) =>
    schemaNode(branch, currentPath, required, context, depth)
  );
  const siblings = constraintSiblings(schema, "allOf");
  if (Object.keys(siblings).length > 0) {
    branches.push(schemaNode(siblings, currentPath, required, context, depth));
  }
  return mergeAllOfNodes(branches, currentPath, required, context.diagnostics);
}

function mergeAllOfNodes(branches, currentPath, required, diagnostics) {
  const knownKinds = new Set(branches.map((branch) => branch.kind).filter((kind) => kind !== "unknown"));
  if (knownKinds.size > 1) {
    diagnostics.push(diagnostic(
      "incompatible_all_of",
      `allOf branches use incompatible kinds: ${[...knownKinds].join(", ")}.`,
      { path: currentPath },
    ));
    return node({ path: currentPath, required, rawType: "allOf" });
  }
  const kind = knownKinds.values().next().value || "unknown";
  if (kind !== "object") {
    if (kind === "array") {
      const itemBranches = branches.map((branch) => branch.items).filter(Boolean);
      return node({
        path: currentPath,
        kind,
        required,
        nullable: branches.every((branch) => branch.nullable),
        items: itemBranches.length
          ? mergeAllOfNodes(itemBranches, arrayItemPath(currentPath), true, diagnostics)
          : undefined,
      });
    }
    const enums = branches.filter((branch) => branch.enumValues).map((branch) => branch.enumValues);
    const enumIntersection = enums.length ? intersect(enums) : undefined;
    if (enums.length > 1 && enumIntersection.length === 0) {
      diagnostics.push(diagnostic(
        "empty_all_of_intersection",
        "allOf enum constraints have no value in common.",
        { path: currentPath },
      ));
      return node({ path: currentPath, required, rawType: "never" });
    }
    return node({
      ...branches.find((branch) => branch.kind !== "unknown"),
      path: currentPath,
      kind,
      required,
      nullable: branches.every((branch) => branch.nullable),
      enumValues: enumIntersection,
    });
  }
  const allPropertyNames = unique(branches.flatMap((branch) => Object.keys(branch.properties || {})));
  for (const branch of branches) {
    if (branch.additionalProperties === true || branch.additionalProperties === undefined) continue;
    const branchProperties = branch.properties || {};
    const siblingOnly = allPropertyNames.filter((name) => !Object.hasOwn(branchProperties, name));
    if (siblingOnly.length === 0) continue;
    diagnostics.push(diagnostic(
      "all_of_additional_properties_unsupported",
      `allOf branch restrictions also apply to sibling properties: ${siblingOnly.join(", ")}.`,
      { path: currentPath },
    ));
  }
  const properties = Object.create(null);
  for (const branch of branches) {
    for (const [name, child] of Object.entries(branch.properties || {})) {
      if (!properties[name]) properties[name] = rebaseNode(child, propertyPath(currentPath, name), child.required);
      else properties[name] = mergeAllOfNodes(
        [properties[name], child],
        propertyPath(currentPath, name),
        properties[name].required || child.required,
        diagnostics,
      );
    }
  }
  const additionalBranches = branches.map((branch) => branch.additionalProperties).filter((value) => value !== undefined);
  let additionalProperties;
  if (additionalBranches.includes(false)) additionalProperties = false;
  else {
    const typedAdditional = additionalBranches.filter((value) => value && typeof value === "object");
    if (typedAdditional.length > 0) {
      additionalProperties = mergeAllOfNodes(typedAdditional, `${currentPath}{}`, true, diagnostics);
    } else if (additionalBranches.includes(true)) additionalProperties = true;
  }
  return node({
    path: currentPath,
    kind: "object",
    required,
    nullable: branches.every((branch) => branch.nullable),
    properties,
    additionalProperties,
  });
}

function resolveJsonPointer(document, reference) {
  if (reference === "#") return document;
  if (!reference.startsWith("#/")) return undefined;
  let current = document;
  for (const rawPart of reference.slice(2).split("/")) {
    const part = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isRecord(current) && !Array.isArray(current)) return undefined;
    if (!Object.hasOwn(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

function constraintSiblings(schema, excludedKeyword) {
  return Object.fromEntries(Object.entries(schema).filter(([key]) =>
    key !== excludedKeyword && !NON_CONSTRAINT_SCHEMA_KEYS.has(key)
  ));
}

function looksLikeJsonSchema(value) {
  if (typeof value.$schema === "string" || isRecord(value.$defs) || isRecord(value.definitions)) return true;
  const validType = typeof value.type === "string" && ["object", "array", "string", "number", "integer", "boolean", "null"].includes(value.type);
  if (validType && value.type === "array" && value.items !== undefined) return true;
  if (validType && value.type !== "object" && (Array.isArray(value.enum) || value.const !== undefined)) return true;
  if (!isRecord(value.properties)) return false;
  if (value.type !== "object" && !Array.isArray(value.required)) return false;
  const properties = Object.values(value.properties);
  return properties.length === 0 || properties.every((property) =>
    typeof property === "boolean" ||
    (isRecord(property) && (
      property.type !== undefined ||
      property.$ref !== undefined ||
      property.enum !== undefined ||
      property.properties !== undefined ||
      property.items !== undefined ||
      property.allOf !== undefined
    )),
  );
}

function enumValues(schema) {
  if (Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.every(isScalarSchemaValue)) {
    return schema.enum.filter((value) => value !== null);
  }
  if (schema.const !== undefined && schema.const !== null && isScalarSchemaValue(schema.const)) return [schema.const];
  return undefined;
}

function validateSchemaKeywordShapes(schema, currentPath, diagnostics) {
  const invalid = (keyword, message) => diagnostics.push(diagnostic(
    "schema_keyword_invalid",
    `Schema keyword ${keyword} ${message}.`,
    { path: currentPath },
  ));

  if (Object.hasOwn(schema, "$ref") && typeof schema.$ref !== "string") invalid("$ref", "must be a string");
  if (Object.hasOwn(schema, "properties") && !isRecord(schema.properties)) invalid("properties", "must be an object");
  if (Object.hasOwn(schema, "required") && (
    !Array.isArray(schema.required) || schema.required.some((name) => typeof name !== "string")
  )) {
    invalid("required", "must be an array of strings");
  }
  if (Object.hasOwn(schema, "additionalProperties") && ![
    true,
    false,
  ].includes(schema.additionalProperties) && !isRecord(schema.additionalProperties)) {
    invalid("additionalProperties", "must be a boolean or schema object");
  }
  for (const keyword of ["allOf", "oneOf", "anyOf"]) {
    if (Object.hasOwn(schema, keyword) && !Array.isArray(schema[keyword])) invalid(keyword, "must be an array");
  }
  if (Object.hasOwn(schema, "nullable") && typeof schema.nullable !== "boolean") invalid("nullable", "must be a boolean");

  if (Object.hasOwn(schema, "enum")) {
    if (!Array.isArray(schema.enum) || schema.enum.length === 0) {
      invalid("enum", "must be a non-empty array");
    } else if (!schema.enum.every(isScalarSchemaValue)) {
      diagnostics.push(diagnostic(
        "schema_enum_value_unsupported",
        "Object and array enum values cannot be normalized as a primitive contract node.",
        { path: currentPath },
      ));
    }
  }
  if (Object.hasOwn(schema, "const") && !isScalarSchemaValue(schema.const)) {
    diagnostics.push(diagnostic(
      "schema_const_value_unsupported",
      "Object and array const values cannot be normalized as a primitive contract node.",
      { path: currentPath },
    ));
  }
}

function isScalarSchemaValue(value) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function schemaKindAccepts(schemaKind, valueKind) {
  return schemaKind === valueKind || (schemaKind === "number" && valueKind === "integer");
}

function primitiveKind(value) {
  if (value === null || value === undefined) return "unknown";
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
}

function intersect(lists) {
  return lists.reduce((current, list) => current.filter((value) => list.includes(value)));
}

function tryParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function consumeBudget(state, depth, currentPath, diagnostics) {
  state.nodes += 1;
  if (depth <= MAX_CONTRACT_DEPTH && state.nodes <= MAX_CONTRACT_NODES) return true;
  diagnostics.push(contractLimitDiagnostic(
    depth > MAX_CONTRACT_DEPTH ? "contract_depth_limit" : "contract_node_limit",
    currentPath,
  ));
  return false;
}

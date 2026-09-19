export const REQUEST_SCHEMA_VERSION = 1;
export const OUTPUT_SCHEMA_VERSION = 1;
export const TOOL_VERSION = "1.0.0";

export const MAX_REQUEST_BYTES = 256 * 1024;
export const MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const MAX_EVIDENCE_PER_SIDE = 16;
export const MAX_EVIDENCE_TOTAL = 32;
export const MAX_DIFFS = 16;
export const MAX_CONTRACT_DEPTH = 64;
export const MAX_CONTRACT_NODES = 20_000;
export const MAX_TOKENS = 200_000;
export const MAX_FINDINGS = 500;
export const MAX_EVIDENCE_SNIPPET = 240;
export const MAX_DEFAULT_OUTPUT_BYTES = 512 * 1024;
export const MAX_DETAIL_OUTPUT_BYTES = 2 * 1024 * 1024;

export const INPUT_KINDS = ["json", "json-schema", "openapi", "typescript", "python"];
export const OUTPUT_FORMATS = ["json", "markdown"];

export const LIMITS = {
  requestBytes: MAX_REQUEST_BYTES,
  inputBytes: MAX_INPUT_BYTES,
  evidencePerSide: MAX_EVIDENCE_PER_SIDE,
  evidenceTotal: MAX_EVIDENCE_TOTAL,
  diffs: MAX_DIFFS,
  contractDepth: MAX_CONTRACT_DEPTH,
  contractNodes: MAX_CONTRACT_NODES,
  tokens: MAX_TOKENS,
  findings: MAX_FINDINGS,
  evidenceSnippetCharacters: MAX_EVIDENCE_SNIPPET,
  defaultOutputBytes: MAX_DEFAULT_OUTPUT_BYTES,
  detailOutputBytes: MAX_DETAIL_OUTPUT_BYTES,
};

export const FINDING_MESSAGES = {
  missing_field: "The Receiver requires a field that the supplied Source evidence does not provide.",
  extra_field: "The Source supplies a field that a closed Receiver does not accept.",
  naming_candidate: "Conventional naming tokens match, but business meaning and mapping are not confirmed.",
  optionality_drift: "The Receiver requires a field that the Source declaration marks optional.",
  nullability_drift: "The Receiver rejects null while the Source permits or observes it.",
  structural_mismatch: "Source and Receiver nodes use incompatible container or primitive kinds.",
  receiver_enum_narrowing: "The Receiver accepts fewer declared values than the Source may supply.",
  observed_value_rejected: "A value observed in Source evidence is excluded by the Receiver declaration.",
  additional_properties_mismatch: "The Source may supply unknown properties that the Receiver explicitly rejects.",
  unsafe_cast: "A type assertion may hide a Source-to-Receiver difference.",
  fake_default: "A fallback may turn missing Source data into misleading Receiver data.",
  guessed_multi_field_fallback: "An alternate-field chain guesses at more than one possible Source shape.",
  semantic_rename_suspect: "A Source field is assigned to a Receiver concept whose meaning is not established.",
  scattered_mapper: "The same external-to-Receiver translation appears in multiple files.",
  enum_status_collapse: "A Source status or enum is asserted into a Receiver value set without explicit handling.",
};

export function node({
  path = "$",
  kind = "unknown",
  required = null,
  nullable = false,
  evidence = "declared",
  provenance,
  evidenceTypes,
  properties,
  items,
  additionalProperties,
  enumValues,
  observedValues,
  observedTypes,
  rawType,
} = {}) {
  return compact({
    path,
    kind,
    required,
    nullable,
    evidence,
    provenance: provenance?.length ? uniqueStrings(provenance).sort() : undefined,
    evidenceTypes: evidenceTypes?.length ? uniqueStrings(evidenceTypes).sort() : undefined,
    properties,
    items,
    additionalProperties,
    enumValues: enumValues?.length ? unique(enumValues) : undefined,
    observedValues: observedValues?.length ? unique(observedValues) : undefined,
    observedTypes: observedTypes?.length ? uniqueStrings(observedTypes).sort() : undefined,
    rawType,
  });
}

export function diagnostic(kind, message, {
  path = "$",
  severity = "warning",
  source = "parser",
  blocking = true,
  evidence,
  evidenceIds,
  file,
  line,
} = {}) {
  return compact({
    kind,
    severity,
    source,
    path,
    message,
    blocking,
    evidence: boundSnippet(evidence),
    evidenceIds: evidenceIds?.length ? uniqueStrings(evidenceIds).sort() : undefined,
    file,
    line,
  });
}

export function contractDocument({ input, root, diagnostics = [], assurance = "declared" }) {
  const baseDiagnostics = [...diagnostics, ...contractBudgetDiagnostics(root)];
  const blockingPaths = new Set(
    baseDiagnostics.filter((item) => item.blocking).map((item) => item.path),
  );
  const unresolvedDiagnostics = [];
  visitNode(root, (current) => {
    if (current.kind !== "unknown" || blockingPaths.has(current.path)) return;
    unresolvedDiagnostics.push(diagnostic(
      "unresolved_contract_node",
      "The supplied evidence does not establish a deterministic structural kind.",
      { path: current.path, source: "evidence" },
    ));
  });
  const allDiagnostics = dedupeDiagnostics([...baseDiagnostics, ...unresolvedDiagnostics]);
  return {
    input: compact(input),
    root,
    completeness: allDiagnostics.some((item) => item.blocking) ? "partial" : "complete",
    assurance,
    diagnostics: allDiagnostics,
  };
}

export function visitNode(current, visitor) {
  if (!current) return;
  const stack = [current];
  while (stack.length > 0) {
    const next = stack.pop();
    visitor(next);
    const properties = Object.entries(next.properties || {}).sort(([left], [right]) =>
      right.localeCompare(left),
    );
    for (const [, child] of properties) stack.push(child);
    if (next.items) stack.push(next.items);
    if (next.additionalProperties && typeof next.additionalProperties === "object") {
      stack.push(next.additionalProperties);
    }
  }
}

export function contractNodeCount(...roots) {
  let count = 0;
  for (const root of roots.flat().filter(Boolean)) {
    visitNode(root, () => {
      count += 1;
    });
  }
  return count;
}

export function rebaseNode(current, path, required = current?.required ?? null) {
  if (!current) return node({ path, required });
  const properties = current.properties
    ? Object.fromEntries(
        Object.entries(current.properties)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, child]) => [
            name,
            rebaseNode(child, propertyPath(path, name), child.required),
          ]),
      )
    : undefined;
  const items = current.items
    ? rebaseNode(current.items, arrayItemPath(path), current.items.required)
    : undefined;
  const additionalProperties = current.additionalProperties &&
    typeof current.additionalProperties === "object"
    ? rebaseNode(current.additionalProperties, `${path}{}`, current.additionalProperties.required)
    : current.additionalProperties;
  return node({ ...current, path, required, properties, items, additionalProperties });
}

export function sameContractConstraint(left, right) {
  if (!left || !right) return left === right;
  if (
    left.kind !== right.kind ||
    left.required !== right.required ||
    left.nullable !== right.nullable ||
    left.rawType !== right.rawType ||
    !sameValueSet(left.enumValues, right.enumValues)
  ) {
    return false;
  }

  const leftNames = Object.keys(left.properties || {}).sort();
  const rightNames = Object.keys(right.properties || {}).sort();
  if (stableValue(leftNames) !== stableValue(rightNames)) return false;
  if (!leftNames.every((name) =>
    sameContractConstraint(left.properties[name], right.properties[name])
  )) {
    return false;
  }
  if (!sameContractConstraint(left.items, right.items)) return false;

  const leftAdditional = left.additionalProperties;
  const rightAdditional = right.additionalProperties;
  const leftTyped = leftAdditional && typeof leftAdditional === "object";
  const rightTyped = rightAdditional && typeof rightAdditional === "object";
  if (Boolean(leftTyped) !== Boolean(rightTyped)) return false;
  if (leftTyped && !sameContractConstraint(leftAdditional, rightAdditional)) return false;
  if (!leftTyped && leftAdditional !== rightAdditional) return false;
  return true;
}

export function withProvenance(root, evidenceId, evidenceType) {
  if (!root) return root;
  const properties = root.properties
    ? Object.fromEntries(
        Object.entries(root.properties)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, child]) => [name, withProvenance(child, evidenceId, evidenceType)]),
      )
    : undefined;
  const items = root.items ? withProvenance(root.items, evidenceId, evidenceType) : undefined;
  const additionalProperties = root.additionalProperties &&
    typeof root.additionalProperties === "object"
    ? withProvenance(root.additionalProperties, evidenceId, evidenceType)
    : root.additionalProperties;
  return node({
    ...root,
    provenance: uniqueStrings([...(root.provenance || []), evidenceId]),
    evidenceTypes: uniqueStrings([...(root.evidenceTypes || []), evidenceType]),
    properties,
    items,
    additionalProperties,
  });
}

export function propertyPath(parent, name) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(name))) {
    return parent === "$" ? `$.${name}` : `${parent}.${name}`;
  }
  return `${parent}[${JSON.stringify(String(name))}]`;
}

export function arrayItemPath(parent) {
  return `${parent}[]`;
}

export function mergeCompleteness(...documents) {
  const present = documents.flat().filter(Boolean);
  return present.some((document) => document.completeness !== "complete") ? "partial" : "complete";
}

export function mergeAssurance(...documents) {
  const present = documents.flat().filter(Boolean);
  const values = new Set(present.map((document) => document.assurance).filter(Boolean));
  if (values.size === 0) return "declared";
  return values.size === 1 ? values.values().next().value : "mixed";
}

export function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const key = stableValue(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

export function normalizeFieldName(name) {
  return fieldNameTokens(name).join("\u0000");
}

export function fieldNameTokens(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

export function dedupeBy(values, keyFor) {
  const seen = new Set();
  return (values || []).filter((value) => {
    const key = keyFor(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeDiagnostics(diagnostics) {
  return dedupeBy(
    diagnostics,
    (item) => `${item.kind}:${item.path}:${item.message}:${(item.evidenceIds || []).join(",")}`,
  ).sort(compareDiagnostic);
}

export function dedupeFindings(findings) {
  return dedupeBy(findings, (item) => [
    item.kind,
    item.sourcePath,
    item.receiverPath,
    item.file,
    item.line,
    item.evidence,
  ].join(":"))
    .sort((left, right) => findingSortKey(left).localeCompare(findingSortKey(right)));
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export function inputError(message, {
  kind = "invalid_input",
  allowedValues,
  nextStep,
} = {}) {
  const error = new Error(message);
  error.inputError = true;
  error.kind = kind;
  error.allowedValues = allowedValues;
  error.nextStep = nextStep;
  return error;
}

export function parseJsonInput(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw inputError(`Invalid JSON in ${label}: ${error.message}`, {
      kind: "invalid_json",
      nextStep: `Correct the JSON syntax in ${label} and rerun the command.`,
    });
  }
}

export function contractLimitDiagnostic(kind, path, source = "parser") {
  const messages = {
    contract_depth_limit: `Contract nesting exceeds ${MAX_CONTRACT_DEPTH} levels.`,
    contract_node_limit: `Contract contains more than ${MAX_CONTRACT_NODES} normalized nodes.`,
  };
  return diagnostic(kind, messages[kind] || "A contract resource limit was exceeded.", {
    path,
    source,
  });
}

export function contractDepthExceeded(depth, path, diagnostics) {
  if (depth <= MAX_CONTRACT_DEPTH) return false;
  diagnostics.push(contractLimitDiagnostic("contract_depth_limit", path));
  return true;
}

export function boundSnippet(value) {
  if (value === undefined || value === null) return value;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length <= MAX_EVIDENCE_SNIPPET
    ? text
    : `${text.slice(0, MAX_EVIDENCE_SNIPPET - 1)}…`;
}

export function estimateTokenCount(text) {
  return (String(text).match(/[A-Za-z_$][A-Za-z0-9_$]*|\d+(?:\.\d+)?|[^\s]/g) || []).length;
}

export function stableValue(value) {
  return `${typeof value}:${JSON.stringify(value)}`;
}

function sameValueSet(left, right) {
  if (!left && !right) return true;
  if (!left || !right || left.length !== right.length) return false;
  const values = new Set(right.map(stableValue));
  return left.every((value) => values.has(stableValue(value)));
}

export function contractBudgetDiagnostics(root, source = "parser") {
  if (!root) return [];
  const diagnostics = [];
  const stack = [{ current: root, depth: 0 }];
  let count = 0;
  while (stack.length > 0) {
    const { current, depth } = stack.pop();
    count += 1;
    if (depth > MAX_CONTRACT_DEPTH) {
      diagnostics.push(contractLimitDiagnostic("contract_depth_limit", current.path, source));
      break;
    }
    if (count > MAX_CONTRACT_NODES) {
      diagnostics.push(contractLimitDiagnostic("contract_node_limit", current.path, source));
      break;
    }
    for (const child of Object.values(current.properties || {})) {
      stack.push({ current: child, depth: depth + 1 });
    }
    if (current.items) stack.push({ current: current.items, depth: depth + 1 });
    if (current.additionalProperties && typeof current.additionalProperties === "object") {
      stack.push({ current: current.additionalProperties, depth: depth + 1 });
    }
  }
  return diagnostics;
}

function compareDiagnostic(left, right) {
  return [
    left.path || "",
    left.kind || "",
    left.message || "",
  ].join("\u0000").localeCompare([
    right.path || "",
    right.kind || "",
    right.message || "",
  ].join("\u0000"));
}

function findingSortKey(item) {
  return [
    item.file || "",
    String(item.line || ""),
    item.receiverPath || "",
    item.sourcePath || "",
    item.kind,
  ].join("\u0000");
}

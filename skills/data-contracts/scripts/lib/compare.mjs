import {
  dedupeBy,
  dedupeDiagnostics,
  diagnostic,
  FINDING_MESSAGES,
  normalizeFieldName,
  rebaseNode,
  stableValue,
  uniqueStrings,
} from "./model.mjs";

export function compareContracts(sourceContract, receiverContract) {
  const findings = [];
  const diagnostics = [
    ...(sourceContract.diagnostics || []),
    ...(receiverContract.diagnostics || []),
  ];

  compareNodes(sourceContract.root, receiverContract.root, findings, diagnostics);

  const dedupedFindings = dedupeBy(
    findings,
    (item) => [
      item.kind,
      item.sourcePath,
      item.receiverPath,
      item.file,
      item.line,
    ].join(":"),
  ).sort(compareFinding);
  const dedupedDiagnostics = dedupeDiagnostics(diagnostics);

  return {
    completeness:
      sourceContract.completeness === "partial" ||
      receiverContract.completeness === "partial" ||
      dedupedDiagnostics.some((item) => item.blocking)
        ? "partial"
        : "complete",
    assurance: mergeAssurance(sourceContract.assurance, receiverContract.assurance),
    findings: dedupedFindings,
    diagnostics: dedupedDiagnostics,
    requiredDecisions: buildRequiredDecisions(dedupedFindings, dedupedDiagnostics),
    verificationSuggestions: buildVerificationSuggestions(dedupedFindings, dedupedDiagnostics),
  };
}

function compareNodes(source, receiver, findings, diagnostics) {
  if (!source || !receiver) {
    diagnostics.push(diagnostic(
      "comparison_node_missing",
      "The comparison could not locate both Source and Receiver nodes.",
      { path: receiver?.path || source?.path || "$", source: "comparison" },
    ));
    return;
  }

  if (source.required === false && receiver.required === true) {
    findings.push(finding("optionality_drift", source, receiver, {
      message: `Receiver requires ${receiver.path}, but Source declares ${source.path} optional.`,
    }));
  }
  if (source.nullable && !receiver.nullable) {
    findings.push(finding("nullability_drift", source, receiver, {
      message: `Receiver rejects null at ${receiver.path}, but Source permits or observes null at ${source.path}.`,
    }));
  }

  if (source.kind === "unknown" || receiver.kind === "unknown") {
    diagnostics.push(diagnostic(
      "unverifiable_node",
      `Cannot verify ${source.path} -> ${receiver.path} because one side has unknown shape.`,
      {
        path: receiver.path,
        source: "comparison",
        evidenceIds: evidenceIds(source, receiver),
      },
    ));
    compareValues(source, receiver, findings);
    return;
  }

  if (!compatibleKinds(source.kind, receiver.kind)) {
    findings.push(finding("structural_mismatch", source, receiver, {
      message: `Source ${source.path} is ${source.kind}, but Receiver ${receiver.path} is ${receiver.kind}.`,
    }));
    return;
  }

  compareValues(source, receiver, findings);
  if (source.kind === "object" && receiver.kind === "object") {
    compareObjectProperties(source, receiver, findings, diagnostics);
    compareAdditionalProperties(source, receiver, findings, diagnostics);
  }
  if (source.kind === "array" && receiver.kind === "array") {
    if (!source.items || !receiver.items) {
      diagnostics.push(diagnostic(
        "unverifiable_array_items",
        `Cannot verify array items for ${source.path} -> ${receiver.path}.`,
        {
          path: receiver.path,
          source: "comparison",
          evidenceIds: evidenceIds(source, receiver),
        },
      ));
    } else {
      compareNodes(source.items, receiver.items, findings, diagnostics);
    }
  }
}

function compareObjectProperties(source, receiver, findings, diagnostics) {
  diagnoseNamingCollisions(source, "Source", diagnostics);
  diagnoseNamingCollisions(receiver, "Receiver", diagnostics);

  const sourceProperties = source.properties || {};
  const receiverProperties = receiver.properties || {};
  const sourceNames = Object.keys(sourceProperties).sort();
  const receiverNames = Object.keys(receiverProperties).sort();

  for (const receiverName of receiverNames) {
    const receiverField = receiverProperties[receiverName];
    const sourceField = sourceProperties[receiverName];
    if (sourceField) {
      if (sourceField.required === null && receiverField.required === true) {
        diagnostics.push(diagnostic(
          "source_presence_unproven",
          `Observed Source evidence includes ${sourceField.path}, but does not prove it is always present as required by ${receiverField.path}.`,
          {
            path: receiverField.path,
            source: "comparison",
            evidenceIds: evidenceIds(sourceField, receiverField),
          },
        ));
      }
      compareNodes(sourceField, receiverField, findings, diagnostics);
      continue;
    }

    if (receiverField.required === true) {
      findings.push({
        kind: "missing_field",
        severity: "warning",
        confidence: "confirmed",
        scope: "deterministic",
        sourcePath: null,
        receiverPath: receiverField.path,
        message: `Receiver requires ${receiverField.path}, but supplied Source evidence does not provide it.`,
        dataRisk: FINDING_MESSAGES.missing_field,
        requiresSemanticDecision: true,
        sourceEvidenceIds: source.provenance || [],
        receiverEvidenceIds: receiverField.provenance || [],
      });
    }

    for (const candidateName of namingCandidates(receiverName, sourceNames)) {
      const candidate = sourceProperties[candidateName];
      findings.push({
        kind: "naming_candidate",
        severity: "warning",
        confidence: "candidate",
        scope: "deterministic",
        sourcePath: candidate.path,
        receiverPath: receiverField.path,
        message: `${candidate.path} and ${receiverField.path} share conventional naming tokens; mapping is not confirmed.`,
        dataRisk: FINDING_MESSAGES.naming_candidate,
        mappingConfirmed: false,
        requiresSemanticDecision: true,
        sourceEvidenceIds: candidate.provenance || [],
        receiverEvidenceIds: receiverField.provenance || [],
      });
    }
  }

  for (const sourceName of sourceNames) {
    if (Object.hasOwn(receiverProperties, sourceName)) continue;
    const sourceField = sourceProperties[sourceName];
    if (
      receiver.additionalProperties &&
      typeof receiver.additionalProperties === "object"
    ) {
      compareNodes(
        sourceField,
        rebaseNode(
          receiver.additionalProperties,
          sourceField.path,
          sourceField.required,
        ),
        findings,
        diagnostics,
      );
      continue;
    }
    if (receiver.additionalProperties !== false) continue;
    findings.push({
      kind: "extra_field",
      severity: "warning",
      confidence: "confirmed",
      scope: "deterministic",
      sourcePath: sourceField.path,
      receiverPath: receiver.path,
      message: `Closed Receiver ${receiver.path} does not accept Source field ${sourceField.path}.`,
      dataRisk: FINDING_MESSAGES.extra_field,
      requiresSemanticDecision: false,
      sourceEvidenceIds: sourceField.provenance || [],
      receiverEvidenceIds: receiver.provenance || [],
    });
  }
}

function compareAdditionalProperties(source, receiver, findings, diagnostics) {
  const sourceAdditional = source.additionalProperties;
  const receiverAdditional = receiver.additionalProperties;
  if (
    sourceAdditional &&
    typeof sourceAdditional === "object" &&
    receiverAdditional &&
    typeof receiverAdditional === "object"
  ) {
    compareNodes(sourceAdditional, receiverAdditional, findings, diagnostics);
    return;
  }
  if (
    (sourceAdditional === true ||
      (sourceAdditional && typeof sourceAdditional === "object")) &&
    receiverAdditional === false
  ) {
    findings.push(finding("additional_properties_mismatch", source, receiver, {
      message: `Source ${source.path} may supply additional properties, but Receiver ${receiver.path} explicitly rejects them.`,
    }));
    return;
  }
  if (
    sourceAdditional === true &&
    receiverAdditional &&
    typeof receiverAdditional === "object"
  ) {
    diagnostics.push(diagnostic(
      "unverifiable_additional_properties",
      `Source ${source.path} permits unconstrained additional properties that Receiver ${receiver.path} restricts.`,
      {
        path: receiver.path,
        source: "comparison",
        evidenceIds: evidenceIds(source, receiver),
      },
    ));
  }
}

function compareValues(source, receiver, findings) {
  if (source.enumValues && receiver.enumValues) {
    const rejected = source.enumValues.filter((value) =>
      !receiver.enumValues.some((candidate) => stableValue(candidate) === stableValue(value)),
    );
    if (rejected.length > 0) {
      findings.push(finding("receiver_enum_narrowing", source, receiver, {
        message: `Receiver ${receiver.path} rejects declared Source values ${formatValues(rejected)}.`,
        requiresSemanticDecision: true,
      }));
    }
  } else if (
    source.evidenceTypes?.includes("declared") &&
    !source.enumValues &&
    receiver.enumValues
  ) {
    findings.push(finding("receiver_enum_narrowing", source, receiver, {
      message: `Declared Source ${source.path} permits broader ${source.kind} values than Receiver enum ${formatValues(receiver.enumValues)}.`,
      requiresSemanticDecision: true,
    }));
  }

  if (source.observedValues && receiver.enumValues) {
    const rejected = source.observedValues.filter((value) =>
      !receiver.enumValues.some((candidate) => stableValue(candidate) === stableValue(value)),
    );
    if (rejected.length > 0) {
      findings.push(finding("observed_value_rejected", source, receiver, {
        message: `Observed Source values ${formatValues(rejected)} are rejected by Receiver ${receiver.path}.`,
        requiresSemanticDecision: true,
      }));
    }
  }
}

function finding(kind, source, receiver, overrides = {}) {
  return {
    kind,
    severity: overrides.severity || "warning",
    confidence: "confirmed",
    scope: "deterministic",
    sourcePath: source.path,
    receiverPath: receiver.path,
    message: overrides.message,
    dataRisk: FINDING_MESSAGES[kind],
    requiresSemanticDecision: overrides.requiresSemanticDecision ?? false,
    sourceEvidenceIds: source.provenance || [],
    receiverEvidenceIds: receiver.provenance || [],
  };
}

function namingCandidates(receiverName, sourceNames) {
  const normalized = normalizeFieldName(receiverName);
  if (!normalized) return [];
  return sourceNames.filter((sourceName) =>
    sourceName !== receiverName && normalizeFieldName(sourceName) === normalized,
  );
}

function diagnoseNamingCollisions(contractNode, side, diagnostics) {
  const groups = new Map();
  for (const name of Object.keys(contractNode.properties || {})) {
    const normalized = normalizeFieldName(name);
    const names = groups.get(normalized) || [];
    names.push(name);
    groups.set(normalized, names);
  }
  for (const names of groups.values()) {
    if (names.length < 2) continue;
    diagnostics.push(diagnostic(
      "ambiguous_naming_candidates",
      `Multiple ${side} fields share conventional naming tokens: ${names.sort().join(", ")}.`,
      {
        path: contractNode.path,
        source: "comparison",
        evidenceIds: contractNode.provenance || [],
      },
    ));
  }
}

export function buildRequiredDecisions(findings = [], diagnostics = []) {
  const decisions = [];
  for (const item of findings) {
    if (item.kind === "missing_field") {
      decisions.push({
        decisionId: stableDecisionId("semantic", "missing_concept", item),
        kind: "missing_concept",
        path: item.receiverPath,
        sourcePath: item.sourcePath,
        receiverPath: item.receiverPath,
        message: `Establish a real Source, explicit absence/error path, contract change, or authorized fallback for ${item.receiverPath}.`,
      });
    }
    if (item.kind === "naming_candidate") {
      decisions.push({
        decisionId: stableDecisionId("semantic", "confirm_field_meaning", item),
        kind: "confirm_field_meaning",
        path: item.receiverPath,
        sourcePath: item.sourcePath,
        receiverPath: item.receiverPath,
        message: `Confirm whether ${item.sourcePath} and ${item.receiverPath} have the same business meaning before mapping.`,
      });
    }
    if (["receiver_enum_narrowing", "observed_value_rejected"].includes(item.kind)) {
      decisions.push({
        decisionId: stableDecisionId("semantic", "confirm_value_owner", item),
        kind: "confirm_value_owner",
        path: item.receiverPath,
        sourcePath: item.sourcePath,
        receiverPath: item.receiverPath,
        message: `Establish which side owns the allowed values for ${item.sourcePath} -> ${item.receiverPath}.`,
      });
    }
    if (item.scope === "heuristic" && item.requiresSemanticDecision) {
      decisions.push({
        decisionId: stableDecisionId("heuristic", item.kind, item),
        kind: "inspect_heuristic",
        path: item.file,
        file: item.file,
        line: item.line,
        message: `Inspect ${item.file}:${item.line}; the heuristic cannot establish business meaning.`,
      });
    }
  }
  for (const item of diagnostics.filter((candidate) => candidate.blocking)) {
    decisions.push({
      decisionId: ["evidence", item.kind, item.path || "$"].join(":"),
      kind: "resolve_incomplete_evidence",
      path: item.path,
      message: `Resolve ${item.kind} before treating the structures as compatible.`,
    });
  }
  return dedupeBy(decisions, (item) => item.decisionId)
    .sort((left, right) => left.decisionId.localeCompare(right.decisionId));
}

function stableDecisionId(scope, kind, item) {
  if (item.file) {
    return [scope, kind, item.file, item.line ?? "unknown"].join(":");
  }
  return [
    scope,
    kind,
    item.sourcePath || "-",
    item.receiverPath || item.path || "$",
  ].join(":");
}

export function buildVerificationSuggestions(findings = [], diagnostics = []) {
  const suggestions = [];
  for (const item of findings) {
    if (item.kind === "missing_field") {
      suggestions.push(`Exercise the absent-Source path for ${item.receiverPath}.`);
    }
    if (item.kind === "optionality_drift") {
      suggestions.push(`Test ${item.sourcePath} when the optional field is absent.`);
    }
    if (item.kind === "nullability_drift") {
      suggestions.push(`Test ${item.sourcePath} with null at the real binding location.`);
    }
    if (item.kind === "structural_mismatch") {
      suggestions.push(`Parse a representative value through ${item.sourcePath} -> ${item.receiverPath}.`);
    }
    if (["receiver_enum_narrowing", "observed_value_rejected"].includes(item.kind)) {
      suggestions.push(`Test every declared or observed Source value at ${item.sourcePath}, including unknown-value handling.`);
    }
    if (item.kind === "unsafe_cast") {
      suggestions.push("Run the smallest typecheck and boundary fixture test after removing or justifying the assertion.");
    }
    if (["fake_default", "guessed_multi_field_fallback"].includes(item.kind)) {
      suggestions.push("Exercise missing Source data and verify it remains explicit or follows an authorized rule.");
    }
  }
  if (diagnostics.some((item) => item.blocking)) {
    suggestions.push("Supply supported, non-conflicting evidence and rerun check before implementation.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Run the smallest schema parse, fixture test, typecheck, or integration path that crosses this data boundary.");
  }
  return uniqueStrings(suggestions).sort();
}

function compatibleKinds(source, receiver) {
  if (source === receiver) return true;
  return source === "integer" && receiver === "number";
}

function evidenceIds(source, receiver) {
  return uniqueStrings([
    ...(source?.provenance || []),
    ...(receiver?.provenance || []),
  ]).sort();
}

function mergeAssurance(source, receiver) {
  return source === receiver ? source : "mixed";
}

function formatValues(values) {
  return values.map((value) => JSON.stringify(value)).join(", ");
}

function compareFinding(left, right) {
  return [
    left.receiverPath || "",
    left.sourcePath || "",
    left.file || "",
    String(left.line || ""),
    left.kind,
  ].join("\u0000").localeCompare([
    right.receiverPath || "",
    right.sourcePath || "",
    right.file || "",
    String(right.line || ""),
    right.kind,
  ].join("\u0000"));
}

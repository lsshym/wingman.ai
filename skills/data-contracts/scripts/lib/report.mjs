import {
  boundSnippet,
  compact,
  LIMITS,
  MAX_DEFAULT_OUTPUT_BYTES,
  MAX_DETAIL_OUTPUT_BYTES,
  MAX_FINDINGS,
  OUTPUT_SCHEMA_VERSION,
  TOOL_VERSION,
} from "./model.mjs";

export function buildEnvelope(command, {
  status,
  requiresSemanticDecision = false,
  inputs = [],
  scope,
  summary = {},
  findings = [],
  diagnostics = [],
  requiredDecisions = [],
  verificationSuggestions = [],
  detail,
} = {}) {
  return compact({
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    toolVersion: TOOL_VERSION,
    command,
    status,
    requiresSemanticDecision,
    inputs,
    scope,
    summary,
    findings,
    diagnostics,
    requiredDecisions,
    verificationSuggestions,
    ...detail,
  });
}

export function buildCheckEnvelope({
  boundaryId,
  structuralStatus,
  decisionStatus,
  workflowStatus,
  inputs = [],
  scope,
  summary = {},
  findings = [],
  diagnostics = [],
  requiredDecisions = [],
  nextActions = [],
  detail,
  error,
} = {}) {
  return compact({
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    toolVersion: TOOL_VERSION,
    command: "check",
    boundaryId,
    structuralStatus,
    decisionStatus,
    workflowStatus,
    inputs,
    scope,
    summary,
    findings,
    diagnostics,
    requiredDecisions,
    nextActions,
    error,
    ...detail,
  });
}

export function buildErrorEnvelope(command, error) {
  if (command === "check") {
    return buildCheckEnvelope({
      structuralStatus: "error",
      decisionStatus: "invalid",
      workflowStatus: "error",
      inputs: [],
      scope: {
        mode: "none",
        completeAlignment: false,
        semanticMeaning: "not_evaluated",
      },
      summary: {
        findingCount: 0,
        diagnosticCount: 0,
        assurance: "none",
        structuralCoverage: "not_applicable",
      },
      findings: [],
      diagnostics: [],
      requiredDecisions: [],
      nextActions: [],
      error: errorDetail(error),
    });
  }
  return buildEnvelope(command, {
    status: "error",
    inputs: [],
    scope: {
      mode: "none",
      completeAlignment: false,
      semanticMeaning: "not_evaluated",
    },
    summary: {
      findingCount: 0,
      diagnosticCount: 0,
      assurance: "none",
      completeness: "not_applicable",
    },
    findings: [],
    diagnostics: [],
    requiredDecisions: [],
    verificationSuggestions: [],
    detail: { error: errorDetail(error) },
  });
}

export function determineStatus({ diagnostics = [], findings = [] }) {
  if (diagnostics.some((item) => item.blocking)) return "incomplete";
  if (findings.length > 0) return "findings";
  return "no_findings";
}

export function exitCodeFor(status) {
  if (["ready_to_implement", "ready_to_verify"].includes(status)) return 0;
  if (["needs_decision", "blocked"].includes(status)) return 1;
  if (status === "needs_evidence") return 5;
  if (status === "error") return 3;
  if (status === "no_findings") return 0;
  if (status === "findings") return 1;
  if (status === "incomplete") return 5;
  return 3;
}

export function boundFindings(findings, diagnostics) {
  if (findings.length <= MAX_FINDINGS) return { findings, diagnostics };
  return {
    findings: findings.slice(0, MAX_FINDINGS),
    diagnostics: [
      ...diagnostics,
      {
        kind: "finding_limit_exceeded",
        severity: "warning",
        source: "report",
        path: "$",
        message: `Analysis produced more than ${MAX_FINDINGS} findings.`,
        blocking: true,
      },
    ],
  };
}

export function serializePayload(payload, { format = "json", detail = false } = {}) {
  const output = format === "markdown"
    ? toMarkdown(payload)
    : `${JSON.stringify(payload, null, 2)}\n`;
  const limit = detail ? MAX_DETAIL_OUTPUT_BYTES : MAX_DEFAULT_OUTPUT_BYTES;
  if (Buffer.byteLength(output, "utf8") <= limit) return { output, payload };

  const limited = payload.command === "check"
    ? limitedCheckPayload(payload, limit, false)
    : buildEnvelope(payload.command, {
        status: "incomplete",
        requiresSemanticDecision: payload.requiresSemanticDecision,
        inputs: (payload.inputs || []).slice(0, 32).map(compactInput),
        scope: payload.scope,
        summary: {
          ...payload.summary,
          completeness: "partial",
          diagnosticCount: (payload.diagnostics?.length || 0) + 1,
        },
        findings: [],
        diagnostics: [
          ...(payload.diagnostics || []).slice(0, 20).map(compactDiagnostic),
          {
            kind: "output_limit_exceeded",
            severity: "warning",
            source: "report",
            path: "$",
            message: `Rendered output exceeds ${limit} bytes. Narrow the evidence set or omit --detail.`,
            blocking: true,
          },
        ],
        requiredDecisions: (payload.requiredDecisions || []).slice(0, 20).map((item) => ({
          kind: item.kind,
          path: boundSnippet(item.path),
          message: boundSnippet(item.message),
        })),
        verificationSuggestions: (payload.verificationSuggestions || [])
          .slice(0, 20)
          .map(boundSnippet),
      });
  const limitedOutput = format === "markdown"
    ? toMarkdown(limited)
    : `${JSON.stringify(limited, null, 2)}\n`;
  if (Buffer.byteLength(limitedOutput, "utf8") <= limit) {
    return { output: limitedOutput, payload: limited };
  }

  const emergency = payload.command === "check"
    ? limitedCheckPayload(payload, limit, true)
    : buildEnvelope(payload.command, {
        status: "incomplete",
        requiresSemanticDecision: payload.requiresSemanticDecision,
        inputs: [],
        scope: payload.scope,
        summary: {
          completeness: "partial",
          assurance: payload.summary?.assurance || "none",
          findingCount: payload.summary?.findingCount || 0,
          diagnosticCount: 1,
          sourceEvidenceCount: payload.summary?.sourceEvidenceCount || 0,
          receiverEvidenceCount: payload.summary?.receiverEvidenceCount || 0,
          diffCount: payload.summary?.diffCount || 0,
        },
        findings: [],
        diagnostics: [{
          kind: "output_limit_exceeded",
          severity: "warning",
          source: "report",
          path: "$",
          message: `Rendered output exceeds ${limit} bytes. Narrow the evidence set or omit --detail.`,
          blocking: true,
        }],
        requiredDecisions: [],
        verificationSuggestions: [],
      });
  return {
    output: format === "markdown"
      ? toMarkdown(emergency)
      : `${JSON.stringify(emergency, null, 2)}\n`,
    payload: emergency,
  };
}

export function toMarkdown(payload) {
  if (payload.command === "check") return checkToMarkdown(payload);
  const lines = [
    `## Data Contracts ${titleCase(payload.command || "result")}`,
    "",
    `- Status: ${payload.status}`,
    `- Complete alignment: ${payload.scope?.completeAlignment ? "yes" : "no"}`,
    `- Completeness: ${payload.summary?.completeness || "not_applicable"}`,
    `- Assurance: ${payload.summary?.assurance || "none"}`,
    `- Findings: ${payload.summary?.findingCount ?? payload.findings?.length ?? 0}`,
    `- Semantic decision required: ${payload.requiresSemanticDecision ? "yes" : "no"}`,
  ];

  if (payload.error) {
    lines.push("", "### Error", "", `- ${payload.error.kind}: ${payload.error.message}`);
    if (payload.error.allowedValues?.length) {
      lines.push(`- Allowed values: ${payload.error.allowedValues.join(", ")}`);
    }
    if (payload.error.nextStep) lines.push(`- Next step: ${payload.error.nextStep}`);
  }
  appendSection(lines, "Findings", payload.findings, (item) =>
    `${item.kind}: ${item.message || item.evidence}`);
  appendSection(lines, "Diagnostics", payload.diagnostics, (item) =>
    `${item.kind} at ${item.path}: ${item.message}`);
  appendSection(lines, "Required decisions", payload.requiredDecisions, (item) =>
    `${item.kind}: ${item.message}`);
  appendSection(lines, "Verification suggestions", payload.verificationSuggestions, (item) =>
    String(item));
  if (payload.normalizedEvidence) {
    lines.push("", "### Normalized evidence", "");
    lines.push(...JSON.stringify(payload.normalizedEvidence, null, 2)
      .split("\n")
      .map((line) => `    ${line}`));
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function summaryFor({
  completeness,
  assurance,
  findings = [],
  diagnostics = [],
  sourceEvidenceCount = 0,
  receiverEvidenceCount = 0,
  diffCount = 0,
}) {
  return {
    completeness,
    assurance,
    findingCount: findings.length,
    diagnosticCount: diagnostics.length,
    sourceEvidenceCount,
    receiverEvidenceCount,
    diffCount,
  };
}

export function checkSummaryFor({
  structuralCoverage,
  assurance,
  findings = [],
  diagnostics = [],
  sourceEvidenceCount = 0,
  receiverEvidenceCount = 0,
  diffCount = 0,
}) {
  return {
    structuralCoverage,
    assurance,
    findingCount: findings.length,
    diagnosticCount: diagnostics.length,
    sourceEvidenceCount,
    receiverEvidenceCount,
    diffCount,
  };
}

export function limitsForHelp() {
  return LIMITS;
}

function appendSection(lines, title, values, render) {
  if (!values?.length) return;
  lines.push("", `### ${title}`, "");
  for (const value of values) lines.push(`- ${render(value)}`);
}

function compactInput(input) {
  return {
    id: boundSnippet(input.id),
    side: input.side,
    path: boundSnippet(input.path),
    kind: input.kind,
    selector: boundSnippet(input.selector),
    evidenceType: input.evidenceType,
  };
}

function compactDiagnostic(item) {
  return {
    kind: item.kind,
    severity: item.severity,
    source: item.source,
    path: boundSnippet(item.path),
    message: boundSnippet(item.message),
    blocking: item.blocking,
    evidence: boundSnippet(item.evidence),
    evidenceIds: (item.evidenceIds || []).slice(0, 20).map(boundSnippet),
    file: boundSnippet(item.file),
    line: item.line,
  };
}

function limitedCheckPayload(payload, limit, emergency) {
  const outputDiagnostic = {
    kind: "output_limit_exceeded",
    severity: "warning",
    source: "report",
    path: "$",
    message: `Rendered output exceeds ${limit} bytes. Narrow the evidence set or omit --detail.`,
    blocking: true,
  };
  return buildCheckEnvelope({
    boundaryId: emergency ? undefined : boundSnippet(payload.boundaryId),
    structuralStatus: "incomplete",
    decisionStatus: payload.decisionStatus || "missing",
    workflowStatus: "needs_evidence",
    inputs: emergency
      ? []
      : (payload.inputs || []).slice(0, 32).map(compactInput),
    scope: payload.scope,
    summary: {
      structuralCoverage: "partial",
      assurance: payload.summary?.assurance || "none",
      findingCount: payload.summary?.findingCount || 0,
      diagnosticCount: 1,
      sourceEvidenceCount: payload.summary?.sourceEvidenceCount || 0,
      receiverEvidenceCount: payload.summary?.receiverEvidenceCount || 0,
      diffCount: payload.summary?.diffCount || 0,
    },
    findings: [],
    diagnostics: emergency
      ? [outputDiagnostic]
      : [
          ...(payload.diagnostics || []).slice(0, 20).map(compactDiagnostic),
          outputDiagnostic,
        ],
    requiredDecisions: emergency
      ? []
      : (payload.requiredDecisions || []).slice(0, 20).map(compactDecision),
    nextActions: [{
      kind: "narrow_input",
      message: "Narrow the evidence set or omit --detail, then rerun check.",
    }],
  });
}

function checkToMarkdown(payload) {
  const lines = [
    "## Data Contracts Check",
    "",
    `- Boundary: ${payload.boundaryId || "unknown"}`,
    `- Structural status: ${payload.structuralStatus}`,
    `- Decision status: ${payload.decisionStatus}`,
    `- Workflow status: ${payload.workflowStatus}`,
    `- Structural coverage: ${payload.summary?.structuralCoverage || "not_applicable"}`,
    `- Assurance: ${payload.summary?.assurance || "none"}`,
    `- Findings: ${payload.summary?.findingCount ?? payload.findings?.length ?? 0}`,
  ];
  if (payload.error) {
    lines.push("", "### Error", "", `- ${payload.error.kind}: ${payload.error.message}`);
    if (payload.error.allowedValues?.length) {
      lines.push(`- Allowed values: ${payload.error.allowedValues.join(", ")}`);
    }
    if (payload.error.nextStep) lines.push(`- Next step: ${payload.error.nextStep}`);
  }
  appendSection(lines, "Findings", payload.findings, (item) =>
    `${item.kind}: ${item.message || item.evidence}`);
  appendSection(lines, "Diagnostics", payload.diagnostics, (item) =>
    `${item.kind} at ${item.path}: ${item.message}`);
  appendSection(lines, "Required decisions", payload.requiredDecisions, (item) =>
    `${item.decisionId}: ${item.message}`);
  appendSection(lines, "Next actions", payload.nextActions, (item) =>
    `${item.kind}: ${item.message}`);
  if (payload.normalizedEvidence) {
    lines.push("", "### Normalized evidence", "");
    lines.push(...JSON.stringify(payload.normalizedEvidence, null, 2)
      .split("\n")
      .map((line) => `    ${line}`));
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function compactDecision(item) {
  return {
    decisionId: boundSnippet(item.decisionId),
    kind: item.kind,
    path: boundSnippet(item.path),
    sourcePath: boundSnippet(item.sourcePath),
    receiverPath: boundSnippet(item.receiverPath),
    file: boundSnippet(item.file),
    line: item.line,
    message: boundSnippet(item.message),
  };
}

function errorDetail(error) {
  return compact({
    kind: error?.kind || (error?.inputError ? "invalid_input" : "internal_error"),
    message: error?.message || String(error),
    allowedValues: error?.allowedValues,
    nextStep: error?.nextStep ||
      (error?.inputError
        ? "Run data-contracts.mjs --help, correct the invocation, and retry."
        : "Inspect the stack trace on stderr or report the internal failure."),
  });
}

function titleCase(value) {
  return String(value).replace(/^\w/, (letter) => letter.toUpperCase());
}

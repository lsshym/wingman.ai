import { analyzeRequest } from "./analysis.mjs";
import {
  buildRequiredDecisions,
  buildVerificationSuggestions,
} from "./compare.mjs";
import { extractContract } from "./extract.mjs";
import { evaluateGate } from "./gate.mjs";
import {
  dedupeDiagnostics,
  dedupeFindings,
  estimateTokenCount,
  inputError,
  MAX_TOKENS,
  withProvenance,
} from "./model.mjs";
import {
  boundFindings,
  buildCheckEnvelope,
  buildEnvelope,
  checkSummaryFor,
  determineStatus,
  summaryFor,
} from "./report.mjs";
import { loadDiff, readDirectInput } from "./request.mjs";
import { scanDiff } from "./scan.mjs";

const DEPRECATION_DIAGNOSTIC = Object.freeze({
  kind: "deprecated_command",
  severity: "warning",
  source: "cli",
  path: "$",
  message: "analyze is a temporary compatibility alias; use check for the normal workflow. The alias is scheduled for removal after the 1.x compatibility cycle.",
  blocking: false,
});

export async function runCommand(command, options) {
  if (command === "check") return runCheck(options);
  if (command === "analyze" || command === "compare") {
    return runDiagnosticRequest(command, options);
  }
  if (command === "extract") return runExtract(options);
  if (command === "scan") return runScan(options);
  throw new Error(`Unimplemented command: ${command}`);
}

export function buildResourceLimitEnvelope(command, error) {
  const resourceDiagnostic = {
    kind: error.kind || "resource_limit_exceeded",
    severity: "warning",
    source: "resource",
    path: "$",
    message: error.message,
    blocking: true,
  };
  if (command === "check") {
    return buildCheckEnvelope({
      structuralStatus: "incomplete",
      decisionStatus: "missing",
      workflowStatus: "needs_evidence",
      inputs: [],
      scope: scopeFor(command),
      summary: checkSummaryFor({
        structuralCoverage: "partial",
        assurance: "none",
        diagnostics: [resourceDiagnostic],
      }),
      findings: [],
      diagnostics: [resourceDiagnostic],
      requiredDecisions: [],
      nextActions: [{
        kind: "narrow_input",
        message: "Narrow or split the supplied evidence, then rerun check.",
      }],
    });
  }
  return buildEnvelope(command, {
    status: "incomplete",
    inputs: [],
    scope: scopeFor(command),
    summary: summaryFor({
      completeness: "partial",
      assurance: "none",
      diagnostics: [resourceDiagnostic],
    }),
    findings: [],
    diagnostics: [resourceDiagnostic],
    requiredDecisions: [{
      kind: "narrow_input",
      path: "$",
      message: "Narrow or split the supplied evidence, then rerun the diagnostic command.",
    }],
    verificationSuggestions: [],
  });
}

async function runCheck(options) {
  requireOption(options, "request", "check", "check requires --request <file|->.");
  const analysis = await analyzeRequest(options.request, {
    includeDiffs: true,
    workflow: true,
  });
  const requiredDecisions = buildRequiredDecisions(
    analysis.findings,
    analysis.diagnostics,
  );
  const gate = evaluateGate({
    diagnostics: analysis.diagnostics,
    findings: analysis.findings,
    requiredDecisions,
    decision: analysis.request.decision,
    hasDiff: analysis.diffDocuments.length > 0,
    authorityEvidenceIds: [
      ...analysis.sourceDocuments,
      ...analysis.receiverDocuments,
    ].map((document) => document.input.id),
  });
  const diagnostics = dedupeDiagnostics([
    ...analysis.diagnostics,
    ...gate.diagnostics,
  ]);

  return buildCheckEnvelope({
    boundaryId: analysis.request.boundaryId,
    structuralStatus: gate.structuralStatus,
    decisionStatus: gate.decisionStatus,
    workflowStatus: gate.workflowStatus,
    inputs: analysis.inputs,
    scope: scopeFor("check", { hasDiff: analysis.diffDocuments.length > 0 }),
    summary: checkSummaryFor({
      structuralCoverage: gate.structuralStatus === "incomplete" ? "partial" : "complete",
      assurance: analysis.assurance,
      findings: analysis.findings,
      diagnostics,
      sourceEvidenceCount: analysis.sourceDocuments.length,
      receiverEvidenceCount: analysis.receiverDocuments.length,
      diffCount: analysis.diffDocuments.length,
    }),
    findings: analysis.findings,
    diagnostics,
    requiredDecisions,
    nextActions: gate.nextActions,
    detail: normalizedDetail(options, analysis),
  });
}

async function runDiagnosticRequest(command, options) {
  requireOption(
    options,
    "request",
    command,
    `${command} requires --request <file|->.`,
  );
  const includeDiffs = command === "analyze";
  const analysis = await analyzeRequest(options.request, { includeDiffs });
  const diagnostics = includeDiffs
    ? dedupeDiagnostics([...analysis.diagnostics, DEPRECATION_DIAGNOSTIC])
    : analysis.diagnostics;
  const status = determineStatus({ diagnostics, findings: analysis.findings });
  const requiredDecisions = buildRequiredDecisions(analysis.findings, diagnostics);

  return buildEnvelope(command, {
    status,
    requiresSemanticDecision:
      analysis.findings.some((item) => item.requiresSemanticDecision) ||
      requiredDecisions.some((item) => item.kind !== "resolve_incomplete_evidence"),
    inputs: analysis.inputs,
    scope: scopeFor(command, { hasDiff: analysis.diffDocuments.length > 0 }),
    summary: summaryFor({
      completeness: status === "incomplete" ? "partial" : "complete",
      assurance: analysis.assurance,
      findings: analysis.findings,
      diagnostics,
      sourceEvidenceCount: analysis.sourceDocuments.length,
      receiverEvidenceCount: analysis.receiverDocuments.length,
      diffCount: analysis.diffDocuments.length,
    }),
    findings: analysis.findings,
    diagnostics,
    requiredDecisions,
    verificationSuggestions: buildVerificationSuggestions(
      analysis.findings,
      diagnostics,
    ),
    detail: normalizedDetail(options, analysis),
  });
}

async function runExtract(options) {
  requireOption(options, "input", "extract", "extract requires --input <file|->.");
  requireOption(options, "kind", "extract", "extract requires --kind <kind>.");
  const text = await readDirectInput(options.input, "extract input");
  const tokenCount = estimateTokenCount(text);
  if (tokenCount > MAX_TOKENS) {
    const error = new Error(
      `${options.input} contains approximately ${tokenCount} tokens; the limit is ${MAX_TOKENS}.`,
    );
    error.limitError = true;
    error.kind = "token_limit_exceeded";
    throw error;
  }

  const evidenceType = options.kind === "json" ? "observed" : "declared";
  const contract = extractContract(text, {
    inputPath: options.input,
    kind: options.kind,
    symbol: options.selector,
  });
  contract.root = withProvenance(contract.root, "extract-input", evidenceType);
  contract.input = {
    id: "extract-input",
    side: "diagnostic",
    path: options.input,
    kind: options.kind,
    selector: contract.input.symbol || options.selector,
    evidenceType,
  };
  contract.diagnostics = (contract.diagnostics || []).map((item) => ({
    ...item,
    evidenceIds: [...new Set([...(item.evidenceIds || []), "extract-input"])].sort(),
  }));
  const status = determineStatus({ diagnostics: contract.diagnostics });

  return buildEnvelope("extract", {
    status,
    inputs: [contract.input],
    scope: scopeFor("extract"),
    summary: summaryFor({
      completeness: status === "incomplete" ? "partial" : "complete",
      assurance: evidenceType,
      diagnostics: contract.diagnostics,
    }),
    findings: [],
    diagnostics: contract.diagnostics,
    requiredDecisions: buildRequiredDecisions([], contract.diagnostics),
    verificationSuggestions: buildVerificationSuggestions([], contract.diagnostics),
    detail: { normalizedEvidence: contract },
  });
}

async function runScan(options) {
  requireOption(options, "diff", "scan", "scan requires --diff <file|->.");
  const document = await loadDiff({ id: "scan-diff", path: options.diff });
  const bounded = boundFindings(
    scanDiff(document.text, document.input.path),
    document.diagnostics,
  );
  const findings = dedupeFindings(bounded.findings);
  const diagnostics = dedupeDiagnostics(bounded.diagnostics);
  const status = determineStatus({ findings, diagnostics });

  return buildEnvelope("scan", {
    status,
    requiresSemanticDecision: findings.some((item) => item.requiresSemanticDecision),
    inputs: [document.input],
    scope: scopeFor("scan"),
    summary: summaryFor({
      completeness: status === "incomplete" ? "partial" : "not_applicable",
      assurance: "heuristic",
      findings,
      diagnostics,
      diffCount: 1,
    }),
    findings,
    diagnostics,
    requiredDecisions: buildRequiredDecisions(findings, diagnostics),
    verificationSuggestions: buildVerificationSuggestions(findings, diagnostics),
  });
}

function normalizedDetail(options, analysis) {
  if (!options.detail) return undefined;
  return {
    normalizedEvidence: {
      source: analysis.source,
      receiver: analysis.receiver,
    },
  };
}

function requireOption(options, key, command, message) {
  if (options[key]) return;
  throw inputError(message, {
    kind: "missing_required_option",
    nextStep: `Run data-contracts.mjs ${command} --help for an example.`,
  });
}

function scopeFor(command, { hasDiff = false } = {}) {
  const modes = {
    check: hasDiff ? "structural_and_heuristic" : "structural",
    analyze: hasDiff ? "structural_and_heuristic" : "structural",
    compare: "structural_diagnostic",
    extract: "extraction_diagnostic",
    scan: "heuristic_diagnostic",
  };
  return {
    mode: modes[command] || "none",
    completeAlignment: false,
    semanticMeaning: command === "check" ? "decision_record_required" : "not_evaluated",
  };
}

import { compareContracts } from "./compare.mjs";
import {
  contractNodeCount,
  dedupeDiagnostics,
  dedupeFindings,
  diagnostic,
  MAX_CONTRACT_NODES,
  MAX_TOKENS,
} from "./model.mjs";
import { reconcileEvidence } from "./reconcile.mjs";
import { boundFindings } from "./report.mjs";
import { loadDiff, loadEvidenceDocument, loadRequest } from "./request.mjs";
import { scanDiff } from "./scan.mjs";

export async function analyzeRequest(
  requestLocation,
  { includeDiffs = false, workflow = false } = {},
) {
  const request = await loadRequest(requestLocation, { workflow });
  const [sourceDocuments, receiverDocuments, diffDocuments] = await Promise.all([
    Promise.all(request.sources.map((item) => loadEvidenceDocument(item, "source"))),
    Promise.all(request.receivers.map((item) => loadEvidenceDocument(item, "receiver"))),
    includeDiffs
      ? Promise.all(request.diffs.map((item) => loadDiff(item)))
      : Promise.resolve([]),
  ]);

  const source = reconcileEvidence(sourceDocuments, "source");
  const receiver = reconcileEvidence(receiverDocuments, "receiver");
  const comparison = compareContracts(source, receiver);
  const scanFindings = includeDiffs
    ? diffDocuments.flatMap((document) => scanDiff(document.text, document.input.path))
    : [];
  const diagnostics = requestDiagnostics({
    comparison,
    source,
    receiver,
    sourceDocuments,
    receiverDocuments,
    diffDocuments,
  });
  const bounded = boundFindings(
    dedupeFindings([...comparison.findings, ...scanFindings]),
    diagnostics,
  );

  return {
    request,
    source,
    receiver,
    sourceDocuments,
    receiverDocuments,
    diffDocuments,
    assurance: comparison.assurance,
    inputs: [
      ...sourceDocuments.map((document) => document.input),
      ...receiverDocuments.map((document) => document.input),
      ...diffDocuments.map((document) => document.input),
    ].sort(compareInput),
    findings: dedupeFindings(bounded.findings),
    diagnostics: dedupeDiagnostics(bounded.diagnostics),
  };
}

function requestDiagnostics({
  comparison,
  source,
  receiver,
  sourceDocuments,
  receiverDocuments,
  diffDocuments,
}) {
  const diagnostics = [
    ...comparison.diagnostics,
    ...diffDocuments.flatMap((document) => document.diagnostics),
  ];
  const totalTokenCount = [
    ...sourceDocuments,
    ...receiverDocuments,
    ...diffDocuments,
  ].reduce((sum, document) => sum + (document.tokenCount || 0), 0);
  if (totalTokenCount > MAX_TOKENS) {
    diagnostics.push(diagnostic(
      "request_token_limit",
      `The complete request contains approximately ${totalTokenCount} tokens; the limit is ${MAX_TOKENS}.`,
      { path: "$", source: "resource" },
    ));
  }

  const totalNodeCount = contractNodeCount(source.root, receiver.root);
  if (totalNodeCount > MAX_CONTRACT_NODES) {
    diagnostics.push(diagnostic(
      "request_node_limit",
      `The reconciled Source and Receiver contain ${totalNodeCount} normalized nodes; the limit is ${MAX_CONTRACT_NODES}.`,
      { path: "$", source: "reconciliation" },
    ));
  }
  return dedupeDiagnostics(diagnostics);
}

function compareInput(left, right) {
  const rank = { source: 0, receiver: 1, diff: 2, diagnostic: 3 };
  return (rank[left.side] ?? 4) - (rank[right.side] ?? 4) ||
    left.id.localeCompare(right.id);
}

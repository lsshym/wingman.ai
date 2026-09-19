import { dedupeBy, dedupeDiagnostics, diagnostic } from "./model.mjs";

const ACTIONABLE_DECISION_KINDS = new Set([
  "missing_concept",
  "confirm_field_meaning",
  "confirm_value_owner",
  "inspect_heuristic",
]);

export function evaluateGate({
  diagnostics = [],
  findings = [],
  requiredDecisions = [],
  decision,
  hasDiff = false,
  authorityEvidenceIds = [],
} = {}) {
  const structuralStatus = diagnostics.some((item) => item.blocking)
    ? "incomplete"
    : findings.length > 0
      ? "findings"
      : "compatible";
  const gateDiagnostics = [];
  const nextActions = [];
  const flags = {
    missing: !decision,
    unresolved: false,
    blocked: false,
    invalid: false,
  };
  const actionable = requiredDecisions.filter((item) =>
    ACTIONABLE_DECISION_KINDS.has(item.kind)
  );
  const evidenceIds = new Set(authorityEvidenceIds);

  if (!decision) {
    flags.missing = true;
    nextActions.push(action(
      "provide_semantic_decision",
      "Record whether business meaning is resolved, unresolved, or blocked, with authority references when resolved.",
    ));
    for (const item of actionable) {
      nextActions.push(action(
        "resolve_required_decision",
        item.message,
        { decisionId: item.decisionId, allowedStatuses: ["resolved", "unresolved", "blocked"] },
      ));
    }
    nextActions.push(action(
      "select_binding",
      "Select direct, translate, change_receiver, or blocked for this data handoff.",
      { allowedValues: ["blocked", "change_receiver", "direct", "translate"] },
    ));
  } else {
    evaluateSemantic(decision.semantic, evidenceIds, flags, gateDiagnostics, nextActions);
    evaluateResolutions(
      decision.resolutions || [],
      requiredDecisions,
      evidenceIds,
      flags,
      gateDiagnostics,
      nextActions,
    );
    evaluateBinding(decision.binding, flags, gateDiagnostics, nextActions);
  }

  if (structuralStatus === "incomplete") {
    for (const item of requiredDecisions.filter((candidate) =>
      candidate.kind === "resolve_incomplete_evidence"
    )) {
      nextActions.push(action(
        "resolve_evidence",
        item.message,
        { decisionId: item.decisionId, path: item.path },
      ));
    }
  }

  const decisionStatus = flags.invalid
    ? "invalid"
    : flags.blocked
      ? "blocked"
      : flags.missing
        ? "missing"
        : flags.unresolved
          ? "unresolved"
          : "resolved";
  const workflowStatus = structuralStatus === "incomplete"
    ? "needs_evidence"
    : decisionStatus === "invalid" || decisionStatus === "blocked"
      ? "blocked"
      : decisionStatus === "missing" || decisionStatus === "unresolved"
        ? "needs_decision"
        : hasDiff
          ? "ready_to_verify"
          : "ready_to_implement";

  if (workflowStatus === "ready_to_implement") {
    nextActions.push(action(
      "implement_binding",
      "Implement the recorded binding decision, then rerun check with the relevant unified diff.",
    ));
  }
  if (workflowStatus === "ready_to_verify") {
    nextActions.push(action(
      "run_boundary_verification",
      "Run the smallest real project verification that crosses this data handoff; check does not execute or certify it.",
    ));
  }

  return {
    structuralStatus,
    decisionStatus,
    workflowStatus,
    diagnostics: dedupeDiagnostics(gateDiagnostics),
    nextActions: dedupeBy(prioritizeActions(workflowStatus, nextActions), (item) => [
      item.kind,
      item.decisionId,
      item.path,
      item.message,
    ].join(":")),
  };
}

function prioritizeActions(workflowStatus, actions) {
  if (workflowStatus === "needs_evidence") {
    return actions.filter((item) => item.kind === "resolve_evidence");
  }
  if (workflowStatus === "blocked") {
    return actions.filter((item) => [
      "correct_decision_record",
      "obtain_external_decision",
    ].includes(item.kind));
  }
  return actions;
}

function evaluateSemantic(semantic, evidenceIds, flags, diagnostics, nextActions) {
  if (!semantic?.status || semantic.status === "unresolved") {
    flags.unresolved = true;
    nextActions.push(action(
      "provide_semantic_decision",
      "Establish business meaning from repository evidence or ask the user, then record the result.",
    ));
    return;
  }
  if (semantic.status === "blocked") {
    flags.blocked = true;
    nextActions.push(action(
      "obtain_external_decision",
      "The semantic decision is blocked; obtain the missing specification, domain rule, or user decision.",
    ));
    return;
  }
  validateAuthorityRefs(
    semantic.authorityRefs,
    evidenceIds,
    "request.decision.semantic",
    flags,
    diagnostics,
    nextActions,
  );
}

function evaluateResolutions(
  resolutions,
  requiredDecisions,
  evidenceIds,
  flags,
  diagnostics,
  nextActions,
) {
  const actionableDecisions = requiredDecisions.filter((item) =>
    ACTIONABLE_DECISION_KINDS.has(item.kind)
  );
  const allById = new Map(requiredDecisions.map((item) => [item.decisionId, item]));
  const requiredById = new Map(actionableDecisions.map((item) => [item.decisionId, item]));
  const resolutionById = new Map();
  for (const resolution of resolutions) {
    if (resolutionById.has(resolution.decisionId)) {
      invalidate(
        flags,
        diagnostics,
        nextActions,
        "duplicate_resolution",
        `Resolution ${resolution.decisionId} is duplicated.`,
        resolution.decisionId,
      );
      continue;
    }
    resolutionById.set(resolution.decisionId, resolution);
    if (!requiredById.has(resolution.decisionId)) {
      const current = allById.get(resolution.decisionId);
      invalidate(
        flags,
        diagnostics,
        nextActions,
        current?.kind === "resolve_incomplete_evidence"
          ? "evidence_resolution_not_allowed"
          : "stale_resolution",
        current?.kind === "resolve_incomplete_evidence"
          ? `Resolution ${resolution.decisionId} cannot replace missing or invalid evidence; repair the evidence and rerun check.`
          : `Resolution ${resolution.decisionId} does not match a current required decision.`,
        resolution.decisionId,
      );
    }
  }

  for (const item of actionableDecisions) {
    const resolution = resolutionById.get(item.decisionId);
    if (!resolution || !resolution.status || resolution.status === "unresolved") {
      flags.unresolved = true;
      nextActions.push(action(
        "resolve_required_decision",
        item.message,
        { decisionId: item.decisionId, allowedStatuses: ["resolved", "unresolved", "blocked"] },
      ));
      continue;
    }
    if (resolution.status === "blocked") {
      flags.blocked = true;
      nextActions.push(action(
        "obtain_external_decision",
        item.message,
        { decisionId: item.decisionId },
      ));
      continue;
    }
    validateAuthorityRefs(
      resolution.authorityRefs,
      evidenceIds,
      `resolution ${item.decisionId}`,
      flags,
      diagnostics,
      nextActions,
      item.decisionId,
    );
  }
}

function evaluateBinding(binding, flags, diagnostics, nextActions) {
  if (!binding?.mode) {
    flags.unresolved = true;
    nextActions.push(action(
      "select_binding",
      "Select direct, translate, change_receiver, or blocked for this data handoff.",
      { allowedValues: ["blocked", "change_receiver", "direct", "translate"] },
    ));
    return;
  }
  if (binding.mode === "blocked") {
    flags.blocked = true;
    nextActions.push(action(
      "obtain_external_decision",
      "The binding decision is blocked; resolve the affected seam or receiving requirement before implementation.",
    ));
    return;
  }
  if (binding.mode === "translate" && !binding.location) {
    invalidate(
      flags,
      diagnostics,
      nextActions,
      "binding_location_missing",
      "translate requires one binding location.",
    );
    return;
  }
  if (["direct", "change_receiver"].includes(binding.mode) && binding.location) {
    invalidate(
      flags,
      diagnostics,
      nextActions,
      "binding_location_not_applicable",
      `${binding.mode} must not include a translation location.`,
    );
  }
}

function validateAuthorityRefs(
  refs,
  evidenceIds,
  label,
  flags,
  diagnostics,
  nextActions,
  decisionId,
) {
  if (!refs?.length) {
    invalidate(
      flags,
      diagnostics,
      nextActions,
      "authority_missing",
      `${label} is resolved but has no authority reference.`,
      decisionId,
    );
    return;
  }
  for (const ref of refs) {
    if (ref.kind === "evidence" && !evidenceIds.has(ref.id)) {
      invalidate(
        flags,
        diagnostics,
        nextActions,
        "authority_evidence_unknown",
        `${label} references unknown evidence id ${ref.id}.`,
        decisionId,
      );
    }
    if (ref.kind === "local" && ref.available === false) {
      invalidate(
        flags,
        diagnostics,
        nextActions,
        "authority_file_unreadable",
        `${label} references an unavailable local authority: ${ref.path}.`,
        decisionId,
      );
    }
  }
}

function invalidate(flags, diagnostics, nextActions, kind, message, decisionId) {
  flags.invalid = true;
  diagnostics.push(diagnostic(kind, message, {
    path: decisionId || "$.decision",
    source: "decision",
    blocking: false,
  }));
  nextActions.push(action(
    "correct_decision_record",
    message,
    decisionId ? { decisionId } : {},
  ));
}

function action(kind, message, extra = {}) {
  return { kind, ...extra, message };
}

import assert from "node:assert/strict";
import test from "node:test";
import { evaluateGate } from "../../skills/data-contracts/scripts/lib/gate.mjs";

const authority = [{ kind: "evidence", id: "source" }];
const resolvedDecision = {
  semantic: { status: "resolved", authorityRefs: authority },
  resolutions: [],
  binding: { mode: "direct" },
};

test("pure gate covers missing, ready-to-implement, and ready-to-verify transitions", () => {
  const missing = evaluateGate();
  assert.deepEqual(
    [missing.structuralStatus, missing.decisionStatus, missing.workflowStatus],
    ["compatible", "missing", "needs_decision"],
  );

  const implement = evaluateGate({
    decision: resolvedDecision,
    authorityEvidenceIds: ["source"],
  });
  assert.deepEqual(
    [implement.structuralStatus, implement.decisionStatus, implement.workflowStatus],
    ["compatible", "resolved", "ready_to_implement"],
  );

  const verify = evaluateGate({
    decision: resolvedDecision,
    authorityEvidenceIds: ["source"],
    hasDiff: true,
  });
  assert.equal(verify.workflowStatus, "ready_to_verify");
});

test("pure gate keeps evidence, block, and unresolved priorities independent", () => {
  const incomplete = evaluateGate({
    diagnostics: [{
      kind: "unresolved_ref",
      path: "$.user",
      blocking: true,
    }],
    requiredDecisions: [{
      decisionId: "evidence:unresolved_ref:$.user",
      kind: "resolve_incomplete_evidence",
      path: "$.user",
      message: "Resolve the reference.",
    }],
    decision: resolvedDecision,
    authorityEvidenceIds: ["source"],
  });
  assert.deepEqual(
    [incomplete.structuralStatus, incomplete.decisionStatus, incomplete.workflowStatus],
    ["incomplete", "resolved", "needs_evidence"],
  );
  assert.deepEqual(incomplete.nextActions.map((item) => item.kind), ["resolve_evidence"]);

  const assertedEvidenceFix = evaluateGate({
    diagnostics: [{ kind: "unresolved_ref", path: "$.user", blocking: true }],
    requiredDecisions: [{
      decisionId: "evidence:unresolved_ref:$.user",
      kind: "resolve_incomplete_evidence",
      path: "$.user",
      message: "Resolve the reference.",
    }],
    decision: {
      ...resolvedDecision,
      resolutions: [{
        decisionId: "evidence:unresolved_ref:$.user",
        status: "resolved",
        authorityRefs: authority,
      }],
    },
    authorityEvidenceIds: ["source"],
  });
  assert.equal(assertedEvidenceFix.decisionStatus, "invalid");
  assert.equal(assertedEvidenceFix.workflowStatus, "needs_evidence");
  assert.ok(assertedEvidenceFix.diagnostics.some((item) =>
    item.kind === "evidence_resolution_not_allowed"
  ));

  const blocked = evaluateGate({
    decision: {
      semantic: { status: "blocked", authorityRefs: [] },
      resolutions: [],
      binding: { mode: "blocked" },
    },
  });
  assert.deepEqual(
    [blocked.decisionStatus, blocked.workflowStatus],
    ["blocked", "blocked"],
  );

  const requiredDecisions = [{
    decisionId: "semantic:confirm_field_meaning:$.name:$.name",
    kind: "confirm_field_meaning",
    message: "Confirm meaning.",
  }];
  const unresolved = evaluateGate({
    findings: [{ kind: "naming_candidate" }],
    requiredDecisions,
    decision: resolvedDecision,
    authorityEvidenceIds: ["source"],
  });
  assert.deepEqual(
    [unresolved.structuralStatus, unresolved.decisionStatus, unresolved.workflowStatus],
    ["findings", "unresolved", "needs_decision"],
  );
});

test("pure gate treats invalid decision records as blocked", () => {
  const invalid = evaluateGate({
    decision: {
      semantic: {
        status: "resolved",
        authorityRefs: [{ kind: "evidence", id: "unknown" }],
      },
      resolutions: [],
      binding: { mode: "translate" },
    },
    authorityEvidenceIds: ["source"],
  });
  assert.deepEqual(
    [invalid.decisionStatus, invalid.workflowStatus],
    ["invalid", "blocked"],
  );
  assert.deepEqual(
    invalid.diagnostics.map((item) => item.kind).sort(),
    ["authority_evidence_unknown", "binding_location_missing"],
  );
  assert.ok(invalid.nextActions.every((item) => item.kind === "correct_decision_record"));
});

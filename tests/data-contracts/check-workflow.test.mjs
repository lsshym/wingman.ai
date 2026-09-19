import assert from "node:assert/strict";
import test from "node:test";
import {
  evidence,
  fixture,
  makeFiles,
  parseJson,
  runRequest,
  schema,
} from "./helpers.mjs";

function compatibleRequest(overrides = {}) {
  return {
    schemaVersion: 1,
    boundaryId: "api-user-to-user-view",
    sources: [evidence("source", fixture("user-schema.json"))],
    receivers: [evidence("receiver", fixture("user-schema.json"))],
    ...overrides,
  };
}

function resolvedDecision(overrides = {}) {
  return {
    semantic: {
      status: "resolved",
      authorityRefs: [{ kind: "evidence", id: "source" }],
    },
    resolutions: [],
    binding: { mode: "direct" },
    ...overrides,
  };
}

test("check requires a schema version and stable boundary id", async () => {
  const withoutVersion = compatibleRequest();
  delete withoutVersion.schemaVersion;
  const versionResult = await runRequest("check", withoutVersion);
  assert.equal(versionResult.code, 2, versionResult.stdout);
  assert.equal(parseJson(versionResult).error.kind, "missing_schema_version");

  const unsupportedVersion = await runRequest("check", compatibleRequest({
    schemaVersion: 2,
  }));
  assert.equal(unsupportedVersion.code, 2, unsupportedVersion.stdout);
  assert.equal(parseJson(unsupportedVersion).error.kind, "unsupported_schema_version");

  const withoutBoundary = compatibleRequest();
  delete withoutBoundary.boundaryId;
  const boundaryResult = await runRequest("check", withoutBoundary);
  assert.equal(boundaryResult.code, 2, boundaryResult.stdout);
  assert.equal(parseJson(boundaryResult).error.kind, "missing_boundary_id");
});

test("compatible structures still stop for semantic and binding decisions", async () => {
  const result = await runRequest("check", compatibleRequest());
  assert.equal(result.code, 1, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.command, "check");
  assert.equal(payload.structuralStatus, "compatible");
  assert.equal(payload.decisionStatus, "missing");
  assert.equal(payload.workflowStatus, "needs_decision");
  assert.equal(payload.status, undefined);
  assert.deepEqual(
    payload.nextActions.map((item) => item.kind),
    ["provide_semantic_decision", "select_binding"],
  );
});

test("resolved decisions require a valid authority", async () => {
  const missingAuthority = await runRequest("check", compatibleRequest({
    decision: resolvedDecision({
      semantic: { status: "resolved", authorityRefs: [] },
    }),
  }));
  assert.equal(missingAuthority.code, 1, missingAuthority.stdout);
  const missingPayload = parseJson(missingAuthority);
  assert.equal(missingPayload.decisionStatus, "invalid");
  assert.equal(missingPayload.workflowStatus, "blocked");
  assert.ok(missingPayload.diagnostics.some((item) => item.kind === "authority_missing"));

  const unknownAuthority = await runRequest("check", compatibleRequest({
    decision: resolvedDecision({
      semantic: {
        status: "resolved",
        authorityRefs: [{ kind: "evidence", id: "not-in-request" }],
      },
    }),
  }));
  assert.equal(unknownAuthority.code, 1, unknownAuthority.stdout);
  assert.ok(parseJson(unknownAuthority).diagnostics.some((item) =>
    item.kind === "authority_evidence_unknown"
  ));

  const unavailableLocalAuthority = await runRequest("check", compatibleRequest({
    decision: resolvedDecision({
      semantic: {
        status: "resolved",
        authorityRefs: [{ kind: "local", path: "docs/does-not-exist.md" }],
      },
    }),
  }));
  assert.equal(unavailableLocalAuthority.code, 1, unavailableLocalAuthority.stdout);
  assert.ok(parseJson(unavailableLocalAuthority).diagnostics.some((item) =>
    item.kind === "authority_file_unreadable"
  ));
});

test("required decision ids are stable and every current decision needs a resolution", async () => {
  const request = compatibleRequest({
    boundaryId: "api-user-to-user-view-with-drift",
    receivers: [
      evidence("receiver", fixture("user-types.ts"), "typescript", "UserView"),
    ],
  });
  const first = await runRequest("check", request);
  const second = await runRequest("check", request);
  assert.equal(first.code, 1, first.stdout);
  assert.equal(second.code, 1, second.stdout);
  const firstPayload = parseJson(first);
  const secondPayload = parseJson(second);
  const ids = firstPayload.requiredDecisions.map((item) => item.decisionId);
  assert.ok(ids.length > 0);
  assert.deepEqual(
    ids,
    secondPayload.requiredDecisions.map((item) => item.decisionId),
  );
  assert.ok(ids.every((id) => /^(semantic|heuristic|evidence):/.test(id)));

  const unresolved = await runRequest("check", {
    ...request,
    decision: resolvedDecision({ binding: { mode: "translate", location: "src/map-user.ts" } }),
  });
  assert.equal(unresolved.code, 1, unresolved.stdout);
  const unresolvedPayload = parseJson(unresolved);
  assert.equal(unresolvedPayload.decisionStatus, "unresolved");
  assert.equal(unresolvedPayload.workflowStatus, "needs_decision");
  assert.ok(unresolvedPayload.nextActions.some((item) =>
    item.kind === "resolve_required_decision" && ids.includes(item.decisionId)
  ));

  const resolutions = ids.map((decisionId) => ({
    decisionId,
    status: "resolved",
    authorityRefs: [{ kind: "evidence", id: "source" }],
  }));
  const resolved = await runRequest("check", {
    ...request,
    decision: resolvedDecision({
      resolutions,
      binding: { mode: "translate", location: "src/map-user.ts" },
    }),
  });
  assert.equal(resolved.code, 0, resolved.stdout);
  const resolvedPayload = parseJson(resolved);
  assert.equal(resolvedPayload.structuralStatus, "findings");
  assert.equal(resolvedPayload.decisionStatus, "resolved");
  assert.equal(resolvedPayload.workflowStatus, "ready_to_implement");
});

test("stale and duplicate resolutions block the workflow", async () => {
  const stale = {
    decisionId: "semantic:missing_concept:-:$.stale",
    status: "resolved",
    authorityRefs: [{ kind: "evidence", id: "source" }],
  };
  const result = await runRequest("check", compatibleRequest({
    decision: resolvedDecision({ resolutions: [stale, stale] }),
  }));
  assert.equal(result.code, 1, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.decisionStatus, "invalid");
  assert.equal(payload.workflowStatus, "blocked");
  assert.ok(payload.diagnostics.some((item) => item.kind === "stale_resolution"));
  assert.ok(payload.diagnostics.some((item) => item.kind === "duplicate_resolution"));
});

test("binding constraints and explicit blocks have deterministic priority", async () => {
  const missingLocation = await runRequest("check", compatibleRequest({
    decision: resolvedDecision({ binding: { mode: "translate" } }),
  }));
  assert.equal(missingLocation.code, 1, missingLocation.stdout);
  const missingPayload = parseJson(missingLocation);
  assert.equal(missingPayload.decisionStatus, "invalid");
  assert.equal(missingPayload.workflowStatus, "blocked");
  assert.ok(missingPayload.diagnostics.some((item) =>
    item.kind === "binding_location_missing"
  ));

  const blocked = await runRequest("check", compatibleRequest({
    decision: {
      semantic: { status: "blocked", authorityRefs: [] },
      resolutions: [],
      binding: { mode: "blocked" },
    },
  }));
  assert.equal(blocked.code, 1, blocked.stdout);
  const blockedPayload = parseJson(blocked);
  assert.equal(blockedPayload.decisionStatus, "blocked");
  assert.equal(blockedPayload.workflowStatus, "blocked");
});

test("incomplete structural evidence takes priority over decision readiness", async (t) => {
  const files = await makeFiles(t, {
    "sample.json": JSON.stringify({ name: "Ada" }),
    "receiver.schema.json": schema({ name: { type: "string" } }),
  });
  const result = await runRequest("check", compatibleRequest({
    boundaryId: "observed-user-to-required-view",
    sources: [evidence("source", files["sample.json"], "json")],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
    decision: resolvedDecision(),
  }));
  assert.equal(result.code, 5, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.structuralStatus, "incomplete");
  assert.equal(payload.workflowStatus, "needs_evidence");
  assert.ok(payload.nextActions.some((item) => item.kind === "resolve_evidence"));
});

test("a complete decision advances to implement or verify without claiming completion", async () => {
  const implement = await runRequest("check", compatibleRequest({
    decision: resolvedDecision(),
  }));
  assert.equal(implement.code, 0, implement.stdout);
  const implementPayload = parseJson(implement);
  assert.equal(implementPayload.decisionStatus, "resolved");
  assert.equal(implementPayload.workflowStatus, "ready_to_implement");
  assert.equal(implementPayload.status, undefined);

  const verify = await runRequest("check", compatibleRequest({
    diffs: [{ id: "change", path: fixture("clean-change.diff") }],
    decision: resolvedDecision(),
  }));
  assert.equal(verify.code, 0, verify.stdout);
  const verifyPayload = parseJson(verify);
  assert.equal(verifyPayload.workflowStatus, "ready_to_verify");
  assert.ok(verifyPayload.nextActions.some((item) =>
    item.kind === "run_boundary_verification"
  ));
  assert.equal(JSON.stringify(verifyPayload).includes("verified"), false);
});

test("check output is deterministic and Markdown exposes all three states", async () => {
  const request = compatibleRequest();
  const first = await runRequest("check", request);
  const second = await runRequest("check", request);
  assert.equal(first.stdout, second.stdout);

  const markdown = await runRequest("check", request, ["--format", "markdown"]);
  assert.equal(markdown.code, 1, markdown.stdout);
  assert.match(markdown.stdout, /^## Data Contracts Check/);
  assert.match(markdown.stdout, /Structural status: compatible/);
  assert.match(markdown.stdout, /Decision status: missing/);
  assert.match(markdown.stdout, /Workflow status: needs_decision/);
});

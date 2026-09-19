import assert from "node:assert/strict";
import test from "node:test";
import {
  evidence,
  fixture,
  makeFiles,
  parseJson,
  runCli,
  runRequest,
} from "./helpers.mjs";

test("help documents the small command interface and runnable examples", async () => {
  const result = await runCli(["--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Normal workflow:/);
  assert.match(result.stdout, /check --request/);
  assert.match(result.stdout, /extract --input/);
  assert.match(result.stdout, /compare --request/);
  assert.match(result.stdout, /scan --diff/);
  assert.doesNotMatch(result.stdout, /\bcheckpoint\b|\bverify\b/);
  assert.match(result.stdout, /5 needs_evidence/);
  assert.match(result.stdout, /Node\.js 18 or newer/);
  assert.match(result.stdout, /No npm install/);
});

test("invalid commands and values return one structured error document", async () => {
  const command = await runCli(["checkpoint"]);
  assert.equal(command.code, 2);
  const commandPayload = parseJson(command);
  assert.equal(commandPayload.status, "error");
  assert.equal(commandPayload.error.kind, "unknown_command");
  assert.deepEqual(commandPayload.error.allowedValues, [
    "check",
    "compare",
    "extract",
    "scan",
  ]);
  assert.match(commandPayload.error.nextStep, /check/);

  const format = await runCli([
    "scan",
    "--diff",
    fixture("clean-change.diff"),
    "--format",
    "yaml",
  ]);
  assert.equal(format.code, 2);
  assert.deepEqual(parseJson(format).error.allowedValues, ["json", "markdown"]);

  const checkOption = await runCli(["check", "--unknown"]);
  assert.equal(checkOption.code, 2);
  const checkPayload = parseJson(checkOption);
  assert.equal(checkPayload.command, "check");
  assert.equal(checkPayload.structuralStatus, "error");
  assert.equal(checkPayload.decisionStatus, "invalid");
  assert.equal(checkPayload.workflowStatus, "error");
  assert.equal(checkPayload.status, undefined);
});

test("request rejects unknown top-level fields, duplicate ids, URLs, and evidence stdin", async () => {
  const base = {
    sources: [evidence("source", fixture("user-schema.json"))],
    receivers: [evidence("receiver", fixture("user-schema.json"))],
  };
  for (const [request, kind] of [
    [{ ...base, owner: "backend" }, "unsupported_request_field"],
    [{
      ...base,
      receivers: [evidence("source", fixture("user-schema.json"))],
    }, "duplicate_evidence_id"],
    [{
      ...base,
      sources: [evidence("source", "https://example.com/schema.json")],
    }, "remote_input_unsupported"],
    [{
      ...base,
      sources: [evidence("source", "-", "json")],
    }, "evidence_stdin_unsupported"],
  ]) {
    const result = await runRequest("analyze", request);
    assert.equal(result.code, 2, result.stdout);
    assert.equal(parseJson(result).error.kind, kind);
  }
});

test("default output is concise while detail exposes normalized evidence", async () => {
  const request = {
    sources: [evidence("source", fixture("user-schema.json"))],
    receivers: [evidence("receiver", fixture("user-schema.json"))],
  };
  const concise = await runRequest("analyze", request);
  assert.equal(concise.code, 0, concise.stdout);
  const concisePayload = parseJson(concise);
  assert.equal(concisePayload.schemaVersion, 1);
  assert.equal(concisePayload.toolVersion, "1.0.0");
  assert.equal(concisePayload.status, "no_findings");
  assert.equal(concisePayload.normalizedEvidence, undefined);
  assert.ok(concisePayload.diagnostics.some((item) =>
    item.kind === "deprecated_command" && /1\.x compatibility cycle/.test(item.message)
  ));

  const detailed = await runRequest("analyze", request, ["--detail"]);
  assert.equal(detailed.code, 0, detailed.stdout);
  assert.equal(parseJson(detailed).normalizedEvidence.source.root.kind, "object");
});

test("compare is structural-only even when the reusable request contains diffs", async () => {
  const result = await runRequest("compare", {
    sources: [evidence("source", fixture("user-schema.json"))],
    receivers: [evidence("receiver", fixture("user-schema.json"))],
    diffs: [{ id: "change", path: fixture("risky-mapper.diff") }],
  });
  assert.equal(result.code, 0, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.command, "compare");
  assert.equal(payload.scope.mode, "structural_diagnostic");
  assert.equal(payload.inputs.some((item) => item.side === "diff"), false);
  assert.equal(payload.findings.length, 0);
  assert.equal(payload.workflowStatus, undefined);
  assert.doesNotMatch(result.stdout, /ready_to_(?:implement|verify)/);
});

test("relative evidence paths resolve from the request file directory", async (t) => {
  const contract = JSON.stringify({
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  });
  const files = await makeFiles(t, {
    "source.schema.json": contract,
    "receiver.schema.json": contract,
    "alignment.json": JSON.stringify({
      sources: [{
        id: "source",
        path: "source.schema.json",
        kind: "json-schema",
      }],
      receivers: [{
        id: "receiver",
        path: "receiver.schema.json",
        kind: "json-schema",
      }],
    }),
  });
  const result = await runCli(["analyze", "--request", files["alignment.json"]]);
  assert.equal(result.code, 0, result.stdout);
  assert.equal(parseJson(result).status, "no_findings");
});

test("JSON output is byte-for-byte deterministic and Markdown is debuggable", async () => {
  const request = {
    sources: [evidence("source", fixture("user-schema.json"))],
    receivers: [
      evidence("receiver", fixture("user-types.ts"), "typescript", "UserView"),
    ],
  };
  const first = await runRequest("analyze", request);
  const second = await runRequest("analyze", request);
  assert.equal(first.stdout, second.stdout);

  const markdown = await runRequest("analyze", request, ["--format", "markdown"]);
  assert.equal(markdown.code, 1);
  assert.match(markdown.stdout, /^## Data Contracts Analyze/);
  assert.match(markdown.stdout, /Status: findings/);
  assert.doesNotThrow(() => parseJson(first));
});

test("Markdown detail includes normalized evidence", async () => {
  const request = {
    sources: [evidence("source", fixture("user-schema.json"))],
    receivers: [evidence("receiver", fixture("user-schema.json"))],
  };
  const result = await runRequest("analyze", request, [
    "--format",
    "markdown",
    "--detail",
  ]);
  assert.equal(result.code, 0, result.stdout);
  assert.match(result.stdout, /### Normalized evidence/);
  assert.match(result.stdout, /"source"/);
  assert.match(result.stdout, /"receiver"/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  evidence,
  makeFiles,
  parseJson,
  runRequest,
  schema,
} from "./helpers.mjs";

test("compatible declared Source and Receiver return no findings", async (t) => {
  const files = await makeFiles(t, {
    "contract.schema.json": schema({
      id: { type: "string" },
      status: { type: "string", enum: ["active"] },
    }),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["contract.schema.json"])],
    receivers: [evidence("receiver", files["contract.schema.json"])],
  });
  assert.equal(result.code, 0, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.status, "no_findings");
  assert.equal(payload.summary.assurance, "declared");
  assert.equal(payload.scope.completeAlignment, false);
});

test("naming-style equality is an unconfirmed candidate and does not cancel missing", async (t) => {
  const files = await makeFiles(t, {
    "source.schema.json": schema({ user_name: { type: "string" } }),
    "receiver.schema.json": schema({ userName: { type: "string" } }),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 1, result.stdout);
  const payload = parseJson(result);
  const candidate = payload.findings.find((item) => item.kind === "naming_candidate");
  assert.equal(candidate.mappingConfirmed, false);
  assert.equal(candidate.sourcePath, "$.user_name");
  assert.equal(candidate.receiverPath, "$.userName");
  assert.ok(payload.findings.some((item) =>
    item.kind === "missing_field" && item.receiverPath === "$.userName"
  ));
  assert.equal(payload.requiresSemanticDecision, true);
});

test("partial semantic name similarity is not paired", async (t) => {
  const files = await makeFiles(t, {
    "source.schema.json": schema({ status: { type: "string" } }),
    "receiver.schema.json": schema({ workflowStatus: { type: "string" } }),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 1);
  const findings = parseJson(result).findings;
  assert.equal(findings.some((item) => item.kind === "naming_candidate"), false);
  assert.ok(findings.some((item) => item.kind === "missing_field"));
});

test("comparison reports optionality, nullability, kind, and missing fields", async (t) => {
  const files = await makeFiles(t, {
    "source.schema.json": JSON.stringify({
      type: "object",
      properties: {
        email: { type: ["string", "null"] },
        count: { type: "string" },
      },
    }),
    "receiver.schema.json": schema({
      email: { type: "string" },
      count: { type: "number" },
      avatarUrl: { type: "string" },
    }),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 1);
  const kinds = new Set(parseJson(result).findings.map((item) => item.kind));
  assert.ok(kinds.has("optionality_drift"));
  assert.ok(kinds.has("nullability_drift"));
  assert.ok(kinds.has("structural_mismatch"));
  assert.ok(kinds.has("missing_field"));
});

test("enum compatibility is directional", async (t) => {
  const files = await makeFiles(t, {
    "narrow.schema.json": schema({
      status: { type: "string", enum: ["active"] },
    }),
    "wide.schema.json": schema({
      status: { type: "string", enum: ["active", "disabled"] },
    }),
  });

  const compatible = await runRequest("analyze", {
    sources: [evidence("source", files["narrow.schema.json"])],
    receivers: [evidence("receiver", files["wide.schema.json"])],
  });
  assert.equal(compatible.code, 0, compatible.stdout);

  const rejected = await runRequest("analyze", {
    sources: [evidence("source", files["wide.schema.json"])],
    receivers: [evidence("receiver", files["narrow.schema.json"])],
  });
  assert.equal(rejected.code, 1);
  assert.ok(parseJson(rejected).findings.some((item) =>
    item.kind === "receiver_enum_narrowing"
  ));
});

test("extra Source fields are compatible unless Receiver is closed", async (t) => {
  const files = await makeFiles(t, {
    "source.schema.json": schema({
      id: { type: "string" },
      extra: { type: "string" },
    }),
    "open.schema.json": schema({ id: { type: "string" } }),
    "closed.schema.json": schema({ id: { type: "string" } }, ["id"], false),
  });

  const open = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["open.schema.json"])],
  });
  assert.equal(open.code, 0, open.stdout);

  const closed = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["closed.schema.json"])],
  });
  assert.equal(closed.code, 1);
  const kinds = new Set(parseJson(closed).findings.map((item) => item.kind));
  assert.ok(kinds.has("extra_field"));
  assert.ok(kinds.has("additional_properties_mismatch"));
});

test("typed Receiver additional properties constrain explicit Source fields", async (t) => {
  const files = await makeFiles(t, {
    "number-source.schema.json": schema(
      { extra: { type: "number" } },
      ["extra"],
      false,
    ),
    "string-source.schema.json": schema(
      { extra: { type: "string" } },
      ["extra"],
      false,
    ),
    "receiver.schema.json": JSON.stringify({
      type: "object",
      additionalProperties: { type: "string" },
    }),
  });

  const rejected = await runRequest("analyze", {
    sources: [evidence("source", files["number-source.schema.json"])],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(rejected.code, 1, rejected.stdout);
  assert.ok(parseJson(rejected).findings.some((item) =>
    item.kind === "structural_mismatch" && item.sourcePath === "$.extra"
  ));

  const compatible = await runRequest("analyze", {
    sources: [evidence("source", files["string-source.schema.json"])],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(compatible.code, 0, compatible.stdout);
});

test("typed Receiver additional properties report the explicit nested field path", async (t) => {
  const files = await makeFiles(t, {
    "source.schema.json": schema(
      {
        profile: {
          type: "object",
          required: ["label"],
          properties: {
            label: { type: "number" },
          },
        },
      },
      ["profile"],
      false,
    ),
    "receiver.schema.json": JSON.stringify({
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["label"],
        properties: {
          label: { type: "string" },
        },
      },
    }),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 1, result.stdout);
  assert.ok(parseJson(result).findings.some((item) =>
    item.kind === "structural_mismatch" &&
    item.sourcePath === "$.profile.label" &&
    item.receiverPath === "$.profile.label"
  ));
});

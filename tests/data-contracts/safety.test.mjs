import assert from "node:assert/strict";
import test from "node:test";
import {
  evidence,
  makeFiles,
  parseJson,
  runCli,
  runRequest,
  schema,
} from "./helpers.mjs";

test("request and evidence count limits return incomplete", async (t) => {
  const files = await makeFiles(t, {
    "contract.schema.json": schema({ id: { type: "string" } }),
  });
  const sources = Array.from({ length: 17 }, (_, index) =>
    evidence(`source-${index}`, files["contract.schema.json"])
  );
  const result = await runRequest("analyze", {
    sources,
    receivers: [evidence("receiver", files["contract.schema.json"])],
  });
  assert.equal(result.code, 5);
  assert.equal(parseJson(result).diagnostics[0].kind, "evidence_count_limit");

  const oversizedRequest = await runCli(
    ["analyze", "--request", "-"],
    JSON.stringify({
      sources: [{
        id: "x".repeat(270_000),
        path: files["contract.schema.json"],
        kind: "json-schema",
      }],
      receivers: [evidence("receiver", files["contract.schema.json"])],
    }),
  );
  assert.equal(oversizedRequest.code, 5);
  assert.equal(parseJson(oversizedRequest).diagnostics[0].kind, "request_size_limit");

  const tooManyDiffs = await runRequest("analyze", {
    sources: [evidence("source", files["contract.schema.json"])],
    receivers: [evidence("receiver", files["contract.schema.json"])],
    diffs: Array.from({ length: 17 }, (_, index) => ({
      id: `diff-${index}`,
      path: files["contract.schema.json"],
    })),
  });
  assert.equal(tooManyDiffs.code, 5);
  assert.equal(parseJson(tooManyDiffs).diagnostics[0].kind, "diff_count_limit");
});

test("oversized evidence and token budgets return incomplete without parsing code", async (t) => {
  const files = await makeFiles(t, {
    "large.json": `"${"x".repeat(2 * 1024 * 1024)}"`,
    "tokens.ts": `${"x ".repeat(200_001)}\ntype Payload = string;\n`,
    "receiver.schema.json": JSON.stringify({ type: "string" }),
  });

  for (const [id, input, kind] of [
    ["large", files["large.json"], "json"],
    ["tokens", files["tokens.ts"], "typescript"],
  ]) {
    const result = await runRequest("analyze", {
      sources: [evidence(id, input, kind, kind === "typescript" ? "Payload" : undefined)],
      receivers: [evidence("receiver", files["receiver.schema.json"])],
    });
    assert.equal(result.code, 5, result.stdout);
    assert.equal(parseJson(result).status, "incomplete");
  }
});

test("depth and node budgets return incomplete", async (t) => {
  let deep = { type: "string" };
  for (let index = 0; index < 66; index += 1) {
    deep = {
      type: "object",
      required: ["child"],
      properties: { child: deep },
    };
  }
  const properties = Object.fromEntries(
    Array.from({ length: 20_100 }, (_, index) => [`p${index}`, index]),
  );
  const files = await makeFiles(t, {
    "deep.schema.json": JSON.stringify(deep),
    "nodes.json": JSON.stringify(properties),
    "receiver.schema.json": JSON.stringify({ type: "object" }),
  });

  for (const [id, input, diagnostic, kind] of [
    ["deep", files["deep.schema.json"], "contract_depth_limit", "json-schema"],
    ["nodes", files["nodes.json"], "contract_node_limit", "json"],
  ]) {
    const result = await runRequest("analyze", {
      sources: [evidence(id, input, kind)],
      receivers: [evidence("receiver", files["receiver.schema.json"])],
    });
    assert.equal(result.code, 5, result.stdout);
    assert.ok(
      parseJson(result).diagnostics.some((item) => item.kind === diagnostic),
      `${id}: expected ${diagnostic}\n${result.stdout}`,
    );
  }
});

test("merged evidence cannot exceed the normalized node budget", async (t) => {
  const fields = (prefix) => Object.fromEntries(
    Array.from({ length: 10_100 }, (_, index) => [
      `${prefix}_${index}`,
      { type: "string" },
    ]),
  );
  const files = await makeFiles(t, {
    "source-a.schema.json": schema(fields("a"), []),
    "source-b.schema.json": schema(fields("b"), []),
    "receiver.schema.json": JSON.stringify({ type: "object" }),
  });
  const result = await runRequest("analyze", {
    sources: [
      evidence("source-a", files["source-a.schema.json"]),
      evidence("source-b", files["source-b.schema.json"]),
    ],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 5, result.stdout.slice(0, 2_000));
  assert.ok(parseJson(result).diagnostics.some((item) =>
    item.kind === "contract_node_limit" &&
    item.source === "reconciliation"
  ));
});

test("Source and Receiver together cannot exceed the normalized node budget", async (t) => {
  const properties = Object.fromEntries(
    Array.from({ length: 10_100 }, (_, index) => [
      `field_${index}`,
      index,
    ]),
  );
  const files = await makeFiles(t, {
    "source.json": JSON.stringify(properties),
    "receiver.json": JSON.stringify(properties),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["source.json"], "json")],
    receivers: [evidence("receiver", files["receiver.json"], "json")],
  });
  assert.equal(result.code, 5, result.stdout.slice(0, 2_000));
  assert.ok(parseJson(result).diagnostics.some((item) =>
    item.kind === "request_node_limit"
  ));
});

test("token budget applies to the complete request, not each evidence file", async (t) => {
  const source = `// ${"x ".repeat(100_001)}\ntype Payload = string;\n`;
  const files = await makeFiles(t, {
    "source-a.ts": source,
    "source-b.ts": source,
    "receiver.schema.json": JSON.stringify({ type: "string" }),
  });
  const result = await runRequest("analyze", {
    sources: [
      evidence("source-a", files["source-a.ts"], "typescript", "Payload"),
      evidence("source-b", files["source-b.ts"], "typescript", "Payload"),
    ],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 5, result.stdout);
  assert.ok(parseJson(result).diagnostics.some((item) =>
    item.kind === "request_token_limit"
  ));
});

test("diff input cannot bypass the token budget", async (t) => {
  const files = await makeFiles(t, {
    "contract.schema.json": schema({ id: { type: "string" } }),
    "change.diff": [
      "+++ b/src/user.ts",
      "@@ -0,0 +1 @@",
      `+const payload = ${"x ".repeat(200_001)}`,
      "",
    ].join("\n"),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("source", files["contract.schema.json"])],
    receivers: [evidence("receiver", files["contract.schema.json"])],
    diffs: [{ id: "change", path: files["change.diff"] }],
  });
  assert.equal(result.code, 5, result.stdout);
  assert.ok(parseJson(result).diagnostics.some((item) =>
    item.kind === "token_limit_exceeded" &&
    item.source === "resource"
  ));
});

test("finding and default-output budgets return explicit incomplete diagnostics", async (t) => {
  const missing = Object.fromEntries(
    Array.from({ length: 501 }, (_, index) => [`missing_${index}`, { type: "string" }]),
  );
  const longMissing = Object.fromEntries(
    Array.from({ length: 500 }, (_, index) => [
      `missing_${index}_${"x".repeat(320)}`,
      { type: "string" },
    ]),
  );
  const files = await makeFiles(t, {
    "source.schema.json": schema({ id: { type: "string" } }),
    "too-many.schema.json": schema(missing),
    "too-large-output.schema.json": schema(longMissing),
  });

  const findingLimit = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["too-many.schema.json"])],
  });
  assert.equal(findingLimit.code, 5, findingLimit.stdout);
  assert.ok(parseJson(findingLimit).diagnostics.some((item) =>
    item.kind === "finding_limit_exceeded"
  ));

  const outputLimit = await runRequest("analyze", {
    sources: [evidence("source", files["source.schema.json"])],
    receivers: [evidence("receiver", files["too-large-output.schema.json"])],
  });
  assert.equal(outputLimit.code, 5, outputLimit.stdout);
  assert.ok(parseJson(outputLimit).diagnostics.some((item) =>
    item.kind === "output_limit_exceeded"
  ));
  assert.ok(Buffer.byteLength(outputLimit.stdout, "utf8") <= 512 * 1024);
});

test("detailed-output fallback is also bounded", async (t) => {
  const unconstrained = Object.fromEntries(
    Array.from({ length: 19_000 }, (_, index) => [`p${index}`, {}]),
  );
  const files = await makeFiles(t, {
    "large-diagnostics.schema.json": JSON.stringify({
      type: "object",
      properties: unconstrained,
    }),
  });
  const result = await runCli([
    "extract",
    "--input",
    files["large-diagnostics.schema.json"],
    "--kind",
    "json-schema",
  ]);
  assert.equal(result.code, 5, result.stdout.slice(0, 2_000));
  assert.ok(Buffer.byteLength(result.stdout, "utf8") <= 2 * 1024 * 1024);
  assert.ok(parseJson(result).diagnostics.some((item) =>
    item.kind === "output_limit_exceeded"
  ));
});

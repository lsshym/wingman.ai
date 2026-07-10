import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "skills/data-contracts/scripts/data-contracts.mjs");
const fixtureRoot = path.join(repoRoot, "tests/fixtures/data-contracts");

function fixture(name) {
  return path.join(fixtureRoot, name);
}

function runCli(args, input) {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [cliPath, ...args],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          code: error?.code ?? 0,
          stdout,
          stderr,
        });
      },
    );
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

function parseJson(result) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    assert.fail(`stdout is not JSON: ${error.message}\n${result.stdout}\n${result.stderr}`);
  }
}

test("scan reports contract anti-patterns from a diff", async () => {
  const result = await runCli(["scan", "--diff", fixture("risky-mapper.diff"), "--format", "json"]);

  assert.equal(result.code, 1);
  const payload = parseJson(result);
  const kinds = payload.findings.map((finding) => finding.kind);

  assert.equal(payload.command, "scan");
  assert.ok(kinds.includes("unsafe_cast"));
  assert.ok(kinds.includes("claimed_unproven_source_field"));
  assert.ok(kinds.includes("fake_default"));
  assert.ok(kinds.includes("guessed_multi_field_fallback"));
  assert.ok(kinds.includes("enum_status_collapse"));
  assert.ok(kinds.includes("semantic_rename_suspect"));

  const diffText = await readFile(fixture("risky-mapper.diff"), "utf8");
  const stdinResult = await runCli(["scan", "--diff", "-", "--format", "json"], diffText);
  assert.equal(stdinResult.code, 1);
  assert.equal(parseJson(stdinResult).command, "scan");
});

test("extract normalizes JSON, JSON Schema, OpenAPI, TypeScript, and Python inputs", async () => {
  const cases = [
    ["json", fixture("api-user.json"), undefined, ["id", "display_name", "email", "status", "roles"]],
    ["json-schema", fixture("user-schema.json"), undefined, ["id", "display_name", "email", "status", "roles"]],
    ["openapi", fixture("openapi.json"), "ApiUser", ["id", "display_name", "status"]],
    ["typescript", fixture("user-types.ts"), "UserView", ["id", "displayName", "email", "avatarUrl", "status"]],
    ["python", fixture("user-models.py"), "UserView", ["id", "display_name", "email", "status"]],
  ];

  for (const [kind, input, symbol, expectedFields] of cases) {
    const args = ["extract", "--input", input, "--kind", kind, "--format", "json"];
    if (symbol) args.push("--symbol", symbol);
    const result = await runCli(args);
    assert.equal(result.code, 0, `${kind} should extract cleanly: ${result.stderr}`);
    const payload = parseJson(result);
    assert.equal(payload.command, "extract");
    assert.equal(payload.shape.kind, kind);
    assert.deepEqual(Object.keys(payload.shape.fields), expectedFields);
  }
});

test("compare reports structural, optionality, and enum contract gaps", async () => {
  const result = await runCli([
    "compare",
    "--source",
    fixture("api-user.json"),
    "--source-kind",
    "json",
    "--receiver",
    fixture("user-types.ts"),
    "--receiver-kind",
    "typescript",
    "--receiver-symbol",
    "UserView",
    "--format",
    "json",
  ]);

  assert.equal(result.code, 1);
  const payload = parseJson(result);
  const gapKinds = payload.gaps.map((gap) => gap.kind);

  assert.equal(payload.command, "compare");
  assert.ok(gapKinds.includes("missing_field"));
  assert.ok(gapKinds.includes("optionality_drift"));
  assert.ok(gapKinds.includes("enum_status_collapse"));
  assert.ok(payload.gaps.some((gap) => gap.receiverPath === "avatarUrl"));
  assert.ok(payload.questions.length > 0);
});

test("checkpoint validates required data-contract fields and can emit markdown", async () => {
  const incomplete = await runCli([
    "checkpoint",
    "--source",
    "fixtures/api-user.json",
    "--receiver",
    "src/user/types.ts",
    "--gap",
    "receiver expects avatarUrl without source evidence",
    "--verification",
    "fixture + typecheck",
    "--format",
    "json",
  ]);

  assert.equal(incomplete.code, 4);
  const payload = parseJson(incomplete);
  assert.equal(payload.checkpoint.owner, "missing");
  assert.equal(payload.checkpoint.bindingLocation, "missing");

  const markdown = await runCli([
    "checkpoint",
    "--source",
    "fixtures/api-user.json",
    "--receiver",
    "src/user/types.ts",
    "--owner",
    "API schema owns external payload",
    "--gap",
    "receiver expects avatarUrl without source evidence",
    "--binding",
    "parser",
    "--verification",
    "fixture + typecheck",
    "--format",
    "md",
  ]);

  assert.equal(markdown.code, 0);
  assert.match(markdown.stdout, /## Data Contracts Checkpoint/);
  assert.match(markdown.stdout, /\*\*Owner\/source of truth\*\*: API schema owns external payload/);
});

test("analyze aggregates scan, compare, checkpoint, and verification guidance", async () => {
  const result = await runCli([
    "analyze",
    "--source",
    fixture("api-user.json"),
    "--source-kind",
    "json",
    "--receiver",
    fixture("user-types.ts"),
    "--receiver-kind",
    "typescript",
    "--receiver-symbol",
    "UserView",
    "--diff",
    fixture("risky-mapper.diff"),
    "--owner",
    "API schema owns external payload",
    "--binding",
    "adapter",
    "--verification",
    "fixture + typecheck",
    "--format",
    "json",
  ]);

  assert.equal(result.code, 1);
  const payload = parseJson(result);

  assert.equal(payload.command, "analyze");
  assert.ok(payload.summary.findingCount > 0);
  assert.ok(payload.summary.gapCount > 0);
  assert.equal(payload.checkpoint.owner, "present");
  assert.equal(payload.checkpoint.bindingLocation, "present");
  assert.ok(payload.verification.length > 0);
  assert.ok(payload.limits.some((limit) => limit.includes("does not decide business meaning")));
});

test("verify converts existing JSON findings into focused verification guidance", async () => {
  const compare = await runCli([
    "compare",
    "--source",
    fixture("api-user.json"),
    "--source-kind",
    "json",
    "--receiver",
    fixture("user-types.ts"),
    "--receiver-kind",
    "typescript",
    "--receiver-symbol",
    "UserView",
    "--format",
    "json",
  ]);

  const result = await runCli(["verify", "--from-json", "-", "--format", "json"], compare.stdout);

  assert.equal(result.code, 0);
  const payload = parseJson(result);
  assert.equal(payload.command, "verify");
  assert.ok(payload.verification.some((item) => item.includes("missing receiver field")));
  assert.ok(payload.verification.some((item) => item.includes("enum/status value")));
});

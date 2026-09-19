import assert from "node:assert/strict";
import test from "node:test";
import {
  fixture,
  makeFiles,
  parseJson,
  runCli,
} from "./helpers.mjs";

test("scan reports only located medium/high-confidence boundary findings", async () => {
  const result = await runCli([
    "scan",
    "--diff",
    fixture("risky-mapper.diff"),
  ]);
  assert.equal(result.code, 1, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.status, "findings");
  assert.equal(payload.summary.assurance, "heuristic");
  assert.equal(payload.scope.completeAlignment, false);
  assert.ok(payload.findings.length >= 4);
  for (const finding of payload.findings) {
    assert.match(finding.confidence, /^(medium|high)$/);
    assert.equal(typeof finding.file, "string");
    assert.equal(typeof finding.line, "number");
    assert.ok(finding.evidence.length <= 240);
  }
});

test("scan ignores comments, tests, ordinary defaults, and unrelated assertions", async () => {
  for (const name of ["clean-change.diff", "clean-test-sample.diff"]) {
    const result = await runCli(["scan", "--diff", fixture(name)]);
    assert.equal(result.code, 0, result.stdout);
    assert.equal(parseJson(result).status, "no_findings");
  }
});

test("scan bounds long evidence snippets", async (t) => {
  const fallback = `payload.display_name || payload.user_name || payload.${"x".repeat(400)}`;
  const files = await makeFiles(t, {
    "long.diff": [
      "diff --git a/src/mapper.ts b/src/mapper.ts",
      "--- a/src/mapper.ts",
      "+++ b/src/mapper.ts",
      "@@ -0,0 +1 @@",
      `+displayName: ${fallback},`,
      "",
    ].join("\n"),
  });
  const result = await runCli(["scan", "--diff", files["long.diff"]]);
  assert.equal(result.code, 1);
  assert.ok(parseJson(result).findings.every((item) => item.evidence.length <= 240));
});

test("scan rejects added lines without unified-diff location data", async () => {
  const result = await runCli(
    ["scan", "--diff", "-"],
    "+const user = payload as unknown as UserView;\n",
  );
  assert.equal(result.code, 2, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.status, "error");
  assert.equal(payload.error.kind, "invalid_diff_location");
});

test("scan flags direct boundary casts and single semantic fallbacks", async (t) => {
  const files = await makeFiles(t, {
    "direct-risk.diff": [
      "diff --git a/src/user.ts b/src/user.ts",
      "--- a/src/user.ts",
      "+++ b/src/user.ts",
      "@@ -0,0 +1,2 @@",
      "+const user = payload as UserView;",
      "+const avatarUrl = user.avatarUrl ?? \"\";",
      "",
    ].join("\n"),
  });
  const result = await runCli(["scan", "--diff", files["direct-risk.diff"]]);
  assert.equal(result.code, 1, result.stdout);
  const kinds = new Set(parseJson(result).findings.map((item) => item.kind));
  assert.ok(kinds.has("unsafe_cast"));
  assert.ok(kinds.has("fake_default"));
});

test("scan flags semantic fallbacks assigned to Receiver members", async (t) => {
  const files = await makeFiles(t, {
    "member-fallback.diff": [
      "diff --git a/src/user.ts b/src/user.ts",
      "--- a/src/user.ts",
      "+++ b/src/user.ts",
      "@@ -0,0 +1 @@",
      "+user.avatarUrl = payload.avatarUrl ?? \"\";",
      "",
    ].join("\n"),
  });
  const result = await runCli(["scan", "--diff", files["member-fallback.diff"]]);
  assert.equal(result.code, 1, result.stdout);
  assert.ok(parseJson(result).findings.some((item) => item.kind === "fake_default"));
});

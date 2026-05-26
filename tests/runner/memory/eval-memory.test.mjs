import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { prepareAllMemoryRuns, prepareMemoryRun } from "./eval-memory.mjs";

describe("prepareMemoryRun", () => {
  it("creates an isolated memory case directory with prompt and evidence template", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-memory-runner-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# memory-load Test Cases

## MEMLOAD-004: Domain Registry routes to one domain

### Initial Workspace

\`.wingman/memory/brief.md\`

\`\`\`markdown
# Memory Brief
\`\`\`

\`.wingman/memory/context.md\`

\`\`\`markdown
# Memory Context
\`\`\`

### Task Prompt

\`\`\`text
Use memory-load before changing the quota display.
\`\`\`

### Expected Behavior

- Read brief and context.

### Pass Assertions

- No files changed.
`
      );

      const result = await prepareMemoryRun({
        skill: "memory-load",
        caseId: "MEMLOAD-004",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      assert.equal(result.caseId, "MEMLOAD-004");

      const caseDir = path.join(root, ".eval-runs", "memory-load", "test-run", "MEMLOAD-004");
      assert.equal(
        await readFile(path.join(caseDir, "workspace", ".wingman", "memory", "brief.md"), "utf8"),
        "# Memory Brief\n"
      );

      const prompt = await readFile(path.join(caseDir, "prompt.md"), "utf8");
      const evidence = JSON.parse(await readFile(path.join(caseDir, "evidence-template.json"), "utf8"));

      assert.match(prompt, /Use `memory-load`/);
      assert.match(prompt, /Use memory-load before changing the quota display\./);
      assert.equal(evidence.id, "MEMLOAD-004");
      assert.equal(evidence.skill, "memory-load");
      assert.deepEqual(evidence.loaded_memory_files, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates runs for every ordinary memory case and skips mini comparison variants", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-memory-runner-all-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# memory-load Test Cases

## MEMLOAD-001: Disabled repository does not load memory

### Initial Workspace

\`README.md\`

\`\`\`markdown
# Demo
\`\`\`

### Task Prompt

\`\`\`text
Use memory-load.
\`\`\`

## MEMLOAD-002: Partial memory is not authoritative

### Initial Workspace

\`.wingman/memory/brief.md\`

\`\`\`markdown
# Memory Brief
\`\`\`

### Task Prompt

\`\`\`text
Use memory-load.
\`\`\`

## MEMLOAD-008A: Baseline without memory guidance

### Initial Workspace

\`README.md\`

\`\`\`markdown
# Baseline
\`\`\`

### Task Prompt

\`\`\`text
Find the rule.
\`\`\`
`
      );

      const result = await prepareAllMemoryRuns({
        skill: "memory-load",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      assert.deepEqual(result.caseIds, ["MEMLOAD-001", "MEMLOAD-002"]);
      assert.equal(result.runs.length, 2);
      assert.equal(
        await readFile(
          path.join(root, ".eval-runs", "memory-load", "test-run", "MEMLOAD-001", "workspace", "README.md"),
          "utf8"
        ),
        "# Demo\n"
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

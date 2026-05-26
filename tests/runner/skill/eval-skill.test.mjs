import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { prepareAllRuns, prepareRun } from "./eval-skill.mjs";

describe("prepareRun", () => {
  it("creates isolated A/B run directories with prompts and evidence templates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-runner-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# align-contracts Test Cases

## Pair ALIGN-002: Semantic mismatch

### Shared Initial Workspace

\`src/workflow.ts\`

\`\`\`ts
export const status = "queued";
\`\`\`

### ALIGN-002A baseline_without_skill

#### Task Prompt

\`\`\`text
Fix src/workflow.ts.
\`\`\`

### ALIGN-002B with_align_contracts

#### Task Prompt

\`\`\`text
Use align-contracts to fix src/workflow.ts.
\`\`\`
`
      );

      const result = await prepareRun({
        skill: "align-contracts",
        caseId: "ALIGN-002",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      assert.equal(result.caseDirs.length, 2);
      assert.deepEqual(
        result.caseDirs.map((entry) => entry.caseId),
        ["ALIGN-002A", "ALIGN-002B"]
      );

      const caseADir = path.join(root, ".eval-runs", "align-contracts", "test-run", "ALIGN-002A");
      const caseBDir = path.join(root, ".eval-runs", "align-contracts", "test-run", "ALIGN-002B");

      assert.equal(
        await readFile(path.join(caseADir, "workspace", "src", "workflow.ts"), "utf8"),
        'export const status = "queued";\n'
      );

      const promptA = await readFile(path.join(caseADir, "prompt.md"), "utf8");
      const promptB = await readFile(path.join(caseBDir, "prompt.md"), "utf8");
      const evidence = JSON.parse(await readFile(path.join(caseADir, "evidence-template.json"), "utf8"));

      assert.match(promptA, /Do not use `align-contracts` or any Wingman skill/);
      assert.match(promptA, /Fix src\/workflow\.ts\./);
      assert.match(promptB, /Use `align-contracts`/);
      assert.match(promptB, /Use align-contracts to fix src\/workflow\.ts\./);
      assert.equal(evidence.id, "ALIGN-002A");
      assert.deepEqual(evidence.files_read, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates runs for every paired case in a skill cases file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-runner-all-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# align-contracts Test Cases

## Pair ALIGN-001: Naming mismatch

### Shared Initial Workspace

\`src/a.ts\`

\`\`\`ts
export const a = 1;
\`\`\`

### ALIGN-001A baseline_without_skill

#### Task Prompt

\`\`\`text
Fix A.
\`\`\`

### ALIGN-001B with_align_contracts

#### Task Prompt

\`\`\`text
Use align-contracts to fix A.
\`\`\`

## Pair ALIGN-002: Semantic mismatch

### Shared Initial Workspace

\`src/b.ts\`

\`\`\`ts
export const b = 2;
\`\`\`

### ALIGN-002A baseline_without_skill

#### Task Prompt

\`\`\`text
Fix B.
\`\`\`

### ALIGN-002B with_align_contracts

#### Task Prompt

\`\`\`text
Use align-contracts to fix B.
\`\`\`
`
      );

      const result = await prepareAllRuns({
        skill: "align-contracts",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      assert.deepEqual(result.caseIds, ["ALIGN-001", "ALIGN-002"]);
      assert.equal(result.runs.length, 2);
      assert.equal(
        await readFile(
          path.join(root, ".eval-runs", "align-contracts", "test-run", "ALIGN-001A", "workspace", "src", "a.ts"),
          "utf8"
        ),
        "export const a = 1;\n"
      );
      assert.equal(
        await readFile(
          path.join(root, ".eval-runs", "align-contracts", "test-run", "ALIGN-002B", "workspace", "src", "b.ts"),
          "utf8"
        ),
        "export const b = 2;\n"
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  analyzeRun,
  prepareSkillEval,
  runSkillEval,
  summarizeRun,
} from "./run-skill-eval.mjs";

describe("prepareSkillEval", () => {
  it("prepares paired A/B cases from contract-skill cases markdown", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-paired-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# contract-skill Test Cases

## Pair CASE-001: Naming mismatch

### Shared Initial Workspace

\`src/profile.ts\`

\`\`\`ts
export const user = {};
\`\`\`

### CASE-001A baseline_without_skill

#### Task Prompt

\`\`\`text
Fix profile.
\`\`\`

### CASE-001B with_align_contracts

#### Task Prompt

\`\`\`text
Use contract-skill to fix profile.
\`\`\`
`,
        "utf8"
      );

      const prepared = await prepareSkillEval({
        skill: "contract-skill",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      assert.equal(prepared.kind, "paired");
      assert.deepEqual(
        prepared.cases.map((entry) => entry.caseId),
        ["CASE-001A", "CASE-001B"]
      );

      const caseADir = path.join(root, ".eval-runs", "contract-skill", "test-run", "CASE-001A");
      const caseBDir = path.join(root, ".eval-runs", "contract-skill", "test-run", "CASE-001B");
      assert.equal(
        await readFile(path.join(caseADir, "workspace", "src", "profile.ts"), "utf8"),
        "export const user = {};\n"
      );

      const promptA = await readFile(path.join(caseADir, "prompt.md"), "utf8");
      const promptB = await readFile(path.join(caseBDir, "prompt.md"), "utf8");
      const templateA = JSON.parse(await readFile(path.join(caseADir, "evidence-template.json"), "utf8"));

      assert.match(promptA, /Do not use `contract-skill` or any Wingman skill/);
      assert.match(promptA, /Fix profile\./);
      assert.match(promptB, /Use `contract-skill`/);
      assert.match(promptB, /Use contract-skill to fix profile\./);
      assert.equal(templateA.id, "CASE-001A");
      assert.equal(templateA.variant, "baseline_without_skill");
      assert.equal(templateA.status, "not_run");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prepares ordinary memory cases and skips mini comparison variants", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-memory-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# custom-skill Test Cases

## TASK-001: Disabled repository

### Initial Workspace

\`README.md\`

\`\`\`markdown
# Demo
\`\`\`

### Task Prompt

\`\`\`text
Use custom-skill.
\`\`\`

## TASK-008A: Baseline comparison

### Initial Workspace

\`README.md\`

\`\`\`markdown
# Baseline
\`\`\`

### Task Prompt

\`\`\`text
Find the rule.
\`\`\`
`,
        "utf8"
      );

      const prepared = await prepareSkillEval({
        skill: "custom-skill",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      assert.equal(prepared.kind, "ordinary");
      assert.deepEqual(
        prepared.cases.map((entry) => entry.caseId),
        ["TASK-001"]
      );

      const caseDir = path.join(root, ".eval-runs", "custom-skill", "test-run", "TASK-001");
      assert.equal(await readFile(path.join(caseDir, "workspace", "README.md"), "utf8"), "# Demo\n");

      const prompt = await readFile(path.join(caseDir, "prompt.md"), "utf8");
      const template = JSON.parse(await readFile(path.join(caseDir, "evidence-template.json"), "utf8"));

      assert.match(prompt, /Use `custom-skill`/);
      assert.match(prompt, /Use custom-skill\./);
      assert.equal(template.id, "TASK-001");
      assert.deepEqual(template.files_read, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("expands shared enabled memory fixtures in ordinary cases", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-shared-fixture-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# notes-skill Test Cases

## Shared Enabled Memory Fixture

\`.wingman/memory/brief.md\`

\`\`\`markdown
# Memory Brief
\`\`\`

\`.wingman/memory/context.md\`

\`\`\`markdown
# Original Context
\`\`\`

## NOTE-005: Meaningful progress writes context log

### Initial Workspace

Use the shared enabled memory fixture, but replace \`context.md\` with:

\`\`\`markdown
# Replacement Context
\`\`\`

### Task Prompt

\`\`\`text
Use notes-skill after this upload telemetry work.
\`\`\`
`,
        "utf8"
      );

      const prepared = await prepareSkillEval({
        skill: "notes-skill",
        caseId: "NOTE-005",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      const caseDir = prepared.cases[0].caseRoot;
      assert.equal(
        await readFile(path.join(caseDir, "workspace", ".wingman", "memory", "brief.md"), "utf8"),
        "# Memory Brief\n"
      );
      assert.equal(
        await readFile(path.join(caseDir, "workspace", ".wingman", "memory", "context.md"), "utf8"),
        "# Replacement Context\n"
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("expands referenced ordinary case workspaces", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-referenced-fixture-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# cleanup-skill Test Cases

## Shared Enabled Memory Fixture

\`.wingman/memory/brief.md\`

\`\`\`markdown
# Memory Brief
\`\`\`

## CLEAN-004: Compact noisy context

### Initial Workspace

Use the shared enabled memory fixture, but replace \`context.md\` with:

\`\`\`markdown
# Noisy Context
\`\`\`

### Task Prompt

\`\`\`text
Use cleanup-skill to compact noisy context logs.
\`\`\`

## CLEAN-006: Deletion proposal

### Initial Workspace

Use \`CLEAN-004\` initial workspace.

### Task Prompt

\`\`\`text
Use cleanup-skill and delete duplicate billing quota attempt logs if safe.
\`\`\`
`,
        "utf8"
      );

      const prepared = await prepareSkillEval({
        skill: "cleanup-skill",
        caseId: "CLEAN-006",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
      });

      const caseDir = prepared.cases[0].caseRoot;
      assert.equal(
        await readFile(path.join(caseDir, "workspace", ".wingman", "memory", "brief.md"), "utf8"),
        "# Memory Brief\n"
      );
      assert.equal(
        await readFile(path.join(caseDir, "workspace", ".wingman", "memory", "context.md"), "utf8"),
        "# Noisy Context\n"
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("infers custom evidence fields from method JSON examples", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-method-fields-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# custom-review Test Cases

## REVIEW-001: Check an implementation

### Initial Workspace

\`src/example.ts\`

\`\`\`ts
export const value = 1;
\`\`\`

### Task Prompt

\`\`\`text
Use custom-review to inspect the implementation.
\`\`\`
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "method.md"),
        `# custom-review Test Method

## Required JSON Output

\`\`\`json
{
  "suite_id": "wingman.custom-review",
  "skill": "custom-review",
  "cases": [
    {
      "id": "REVIEW-001",
      "status": "pass",
      "risk_level": "",
      "findings": [],
      "files_read": [],
      "failure_reasons": []
    }
  ]
}
\`\`\`
`,
        "utf8"
      );

      const prepared = await prepareSkillEval({
        skill: "custom-review",
        caseId: "REVIEW-001",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
        methodPath: path.join(root, "method.md"),
      });

      const template = JSON.parse(
        await readFile(path.join(prepared.cases[0].caseRoot, "evidence-template.json"), "utf8")
      );

      assert.equal(template.risk_level, "");
      assert.deepEqual(template.findings, []);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("runSkillEval", () => {
  it("supports dry-run prepare without invoking an agent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-dry-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# custom-skill Test Cases

## TASK-001: Disabled repository

### Initial Workspace

\`README.md\`

\`\`\`markdown
# Demo
\`\`\`

### Task Prompt

\`\`\`text
Use custom-skill.
\`\`\`
`,
        "utf8"
      );
      const result = await runSkillEval({
        skill: "custom-skill",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
        dryRun: true,
      });

      assert.equal(result.summary.total, 1);
      assert.equal(result.summary.missingEvidence, 1);
      assert.match(
        await readFile(path.join(root, ".eval-runs", "custom-skill", "test-run", "summary.md"), "utf8"),
        /Missing Evidence \| 1/
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("can use an injected analyzer as the final judge for real runs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-judge-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# custom-skill Test Cases

## TASK-001: Judge me

### Initial Workspace

\`README.md\`

\`\`\`markdown
# Demo
\`\`\`

### Task Prompt

\`\`\`text
Use custom-skill.
\`\`\`
`,
        "utf8"
      );
      await writeFile(
        path.join(root, "fake-worker.mjs"),
        `import { writeFile } from "node:fs/promises";
await writeFile("../evidence.json", JSON.stringify({ id: "TASK-001", status: "pass", failure_reasons: [] }, null, 2));
console.log("fake worker done");
`,
        "utf8"
      );

      const result = await runSkillEval({
        skill: "custom-skill",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
        agentCmd: `node ${path.join(root, "fake-worker.mjs")}`,
        analyzer: async () => ({
          status: "fail",
          reasons: [{ code: "judge_failed", detail: "Independent judge rejected the result." }],
          notes: "judge notes",
        }),
      });

      const caseRoot = path.join(root, ".eval-runs", "custom-skill", "test-run", "TASK-001");
      const analysis = JSON.parse(await readFile(path.join(caseRoot, "analysis.json"), "utf8"));

      assert.equal(result.summary.fail, 1);
      assert.equal(analysis.worker_status, "pass");
      assert.equal(analysis.final_status, "fail");
      assert.match(await readFile(path.join(caseRoot, "agent-output.txt"), "utf8"), /fake worker done/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("can prepare a shared TypeScript toolchain and tell workers to use it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-toolchain-"));

    try {
      await writeFile(
        path.join(root, "cases.md"),
        `# contract-skill Test Cases

## TASK-001: TypeScript verification

### Initial Workspace

\`src/example.ts\`

\`\`\`ts
export const value: string = "ok";
\`\`\`

### Task Prompt

\`\`\`text
Use contract-skill and verify TypeScript.
\`\`\`
`,
        "utf8"
      );

      const result = await runSkillEval({
        skill: "contract-skill",
        runId: "test-run",
        repoRoot: root,
        casesPath: path.join(root, "cases.md"),
        dryRun: true,
        setupToolchain: "typescript",
        setupToolchainRunner: async ({ toolchainRoot, binPath }) => {
          await mkdir(path.dirname(binPath), { recursive: true });
          await writeFile(binPath, "#!/usr/bin/env node\n", "utf8");
          return {
            command: ["fake-npm", "install", "--prefix", toolchainRoot, "typescript"],
            cwd: toolchainRoot,
            exitCode: 0,
            timedOut: false,
            stdout: "installed",
            stderr: "",
          };
        },
      });

      const caseRoot = path.join(root, ".eval-runs", "contract-skill", "test-run", "TASK-001");
      const prompt = await readFile(path.join(caseRoot, "prompt.md"), "utf8");
      const setup = JSON.parse(
        await readFile(path.join(root, ".eval-runs", ".toolchains", "typescript", "setup.json"), "utf8")
      );

      assert.equal(result.summary.total, 1);
      assert.match(prompt, /\.eval-runs\/\.toolchains\/typescript\/node_modules\/\.bin\/tsc/);
      assert.match(prompt, /Do not install dependencies/);
      assert.ok(setup.command.includes("--prefix"));
      assert.equal(setup.exitCode, 0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("analyzeRun", () => {
  it("keeps worker output and writes independent analysis artifacts", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-analysis-"));

    try {
      const runRoot = path.join(root, ".eval-runs", "contract-skill", "test-run");
      const caseRoot = path.join(runRoot, "CASE-001");
      await mkdir(path.join(caseRoot, "workspace", "src"), { recursive: true });
      await writeFile(path.join(caseRoot, "workspace", "src", "example.ts"), "export const value = 2;\n", "utf8");
      await writeFile(path.join(caseRoot, "agent-output.txt"), "worker stdout\n", "utf8");
      await writeFile(path.join(caseRoot, "agent-error.txt"), "worker stderr\n", "utf8");
      await writeFile(path.join(caseRoot, "prompt.md"), "# CASE-001\n", "utf8");
      await writeFile(
        path.join(caseRoot, "evidence.json"),
        JSON.stringify({ id: "CASE-001", status: "pass", failure_reasons: [] }, null, 2),
        "utf8"
      );
      await writeFile(
        path.join(runRoot, "run.json"),
        JSON.stringify(
          {
            skill: "contract-skill",
            runId: "test-run",
            kind: "ordinary",
            cases: [
              {
                caseId: "CASE-001",
                variant: "single",
                caseRoot,
                workspaceRoot: path.join(caseRoot, "workspace"),
              },
            ],
          },
          null,
          2
        ),
        "utf8"
      );

      await analyzeRun({
        runRoot,
        analyzer: async ({ evidence, workspaceFiles, agentOutput, agentError }) => ({
          status: evidence.status === "pass" && workspaceFiles["src/example.ts"].includes("value = 2") ? "pass" : "fail",
          reasons: [],
          notes: `stdout=${agentOutput.trim()} stderr=${agentError.trim()}`,
        }),
      });

      const analysis = JSON.parse(await readFile(path.join(caseRoot, "analysis.json"), "utf8"));
      const analysisMarkdown = await readFile(path.join(caseRoot, "analysis.md"), "utf8");

      assert.equal(analysis.worker_status, "pass");
      assert.equal(analysis.analysis_status, "pass");
      assert.equal(analysis.final_status, "pass");
      assert.match(analysisMarkdown, /worker stdout/);
      assert.equal(await readFile(path.join(caseRoot, "workspace", "src", "example.ts"), "utf8"), "export const value = 2;\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("summarizeRun", () => {
  it("prefers analysis status over worker evidence status", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "wingman-eval-summary-"));

    try {
      const runRoot = path.join(root, ".eval-runs", "contract-skill", "test-run");
      await writeEvidence(runRoot, "CASE-001A", {
        id: "CASE-001A",
        status: "fail",
        variant: "baseline_without_skill",
      });
      await writeEvidence(runRoot, "CASE-001B", {
        id: "CASE-001B",
        status: "pass",
        variant: "with_skill",
      });
      await writeAnalysis(runRoot, "CASE-001A", {
        final_status: "fail",
        analysis_status: "fail",
        worker_status: "fail",
        reasons: [],
      });
      await writeAnalysis(runRoot, "CASE-001B", {
        final_status: "fail",
        analysis_status: "fail",
        worker_status: "pass",
        reasons: [{ code: "semantic_gap_hidden", detail: "Worker self-reported pass, analyzer found drift." }],
      });
      await writeFile(
        path.join(runRoot, "run.json"),
        JSON.stringify(
          {
            skill: "contract-skill",
            runId: "test-run",
            kind: "paired",
            cases: [
              { caseId: "CASE-001A", pairId: "CASE-001", variant: "baseline_without_skill" },
              { caseId: "CASE-001B", pairId: "CASE-001", variant: "with_skill" },
            ],
          },
          null,
          2
        ),
        "utf8"
      );

      const summary = await summarizeRun({ runRoot });

      assert.equal(summary.total, 2);
      assert.equal(summary.pass, 0);
      assert.equal(summary.fail, 2);
      assert.equal(summary.missingEvidence, 0);
      assert.deepEqual(summary.pairEffects, [
        {
          pairId: "CASE-001",
          baseline: "fail",
          withSkill: "fail",
          effect: "unchanged_fail",
        },
      ]);
      assert.equal(summary.cases[1].workerStatus, "pass");
      assert.equal(summary.cases[1].analysisStatus, "fail");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function writeEvidence(runRoot, caseId, evidence) {
  const caseRoot = path.join(runRoot, caseId);
  await mkdir(caseRoot, { recursive: true });
  await writeFile(path.join(caseRoot, "evidence.json"), JSON.stringify(evidence, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
}

async function writeAnalysis(runRoot, caseId, analysis) {
  const caseRoot = path.join(runRoot, caseId);
  await mkdir(caseRoot, { recursive: true });
  await writeFile(path.join(caseRoot, "analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
}

#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VALID_STATUSES = new Set(["pass", "fail", "not_run"]);

export async function prepareSkillEval({
  skill,
  caseId,
  runId = timestampRunId(),
  repoRoot = process.cwd(),
  casesPath = path.join(repoRoot, "tests", skill, "cases.md"),
  methodPath = path.join(repoRoot, "tests", skill, "method.md"),
  setupToolchain,
  setupToolchainRunner = setupToolchainWithNpm,
  setupTimeoutMs = 5 * 60 * 1000,
} = {}) {
  if (!skill) {
    throw new Error("prepareSkillEval requires skill");
  }

  const casesMarkdown = await readFile(casesPath, "utf8");
  const methodMarkdown = await readOptionalText(methodPath);
  const parsedCases = parseCases({ markdown: casesMarkdown, methodMarkdown, caseId });
  const runRoot = path.join(repoRoot, ".eval-runs", skill, runId);
  const toolchains = await prepareToolchains({
    repoRoot,
    setupToolchain,
    setupToolchainRunner,
    setupTimeoutMs,
  });
  const preparedCases = [];

  for (const testCase of parsedCases) {
    const caseRoot = path.join(runRoot, testCase.caseId);
    const workspaceRoot = path.join(caseRoot, "workspace");
    await writeFixtures(workspaceRoot, testCase.fixtures);
    await writeFile(path.join(caseRoot, "prompt.md"), buildPrompt({ skill, testCase, toolchains }), "utf8");
    await writeJson(path.join(caseRoot, "evidence-template.json"), buildEvidenceTemplate({ skill, testCase }));

    preparedCases.push({
      skill,
      caseId: testCase.caseId,
      baseCaseId: testCase.baseCaseId,
      pairId: testCase.pairId,
      title: testCase.title,
      variant: testCase.variant,
      caseMarkdown: testCase.caseMarkdown,
      checkRules: testCase.checkRules || [],
      caseRoot,
      workspaceRoot,
      promptPath: path.join(caseRoot, "prompt.md"),
      evidencePath: path.join(caseRoot, "evidence.json"),
    });
  }

  const kind = preparedCases.some((entry) => entry.pairId) ? "paired" : "ordinary";
  const runManifest = {
    skill,
    runId,
    kind,
    toolchains,
    methodMarkdown,
    cases: preparedCases,
  };
  await writeJson(path.join(runRoot, "run.json"), runManifest);

  return {
    skill,
    runId,
    kind,
    runRoot,
    cases: preparedCases,
  };
}

export async function runSkillEval({
  skill,
  caseId,
  runId = timestampRunId(),
  repoRoot = process.cwd(),
  casesPath = path.join(repoRoot, "tests", skill, "cases.md"),
  methodPath = path.join(repoRoot, "tests", skill, "method.md"),
  agent = "claude",
  agentCmd,
  analyzer,
  judgeAgent,
  judgeCmd,
  setupToolchain,
  setupToolchainRunner,
  setupTimeoutMs,
  timeoutMs = 10 * 60 * 1000,
  dryRun = false,
} = {}) {
  const prepared = await prepareSkillEval({
    skill,
    caseId,
    runId,
    repoRoot,
    casesPath,
    methodPath,
    setupToolchain,
    setupToolchainRunner,
    setupTimeoutMs,
  });

  if (!dryRun) {
    for (const testCase of prepared.cases) {
      await runAgentCase({ testCase, agent, agentCmd, timeoutMs });
    }
    await analyzeRun({
      runRoot: prepared.runRoot,
      analyzer: analyzer || buildJudgeAnalyzer({ judgeAgent, judgeCmd, timeoutMs }),
    });
  }

  const summary = await summarizeRun({ runRoot: prepared.runRoot });
  await writeJson(path.join(prepared.runRoot, "summary.json"), summary);
  await writeFile(path.join(prepared.runRoot, "summary.md"), renderSummaryMarkdown(summary), "utf8");

  return {
    ...prepared,
    summary,
  };
}

export async function summarizeRun({ runRoot } = {}) {
  if (!runRoot) {
    throw new Error("summarizeRun requires runRoot");
  }

  const manifest = JSON.parse(await readFile(path.join(runRoot, "run.json"), "utf8"));
  const caseResults = [];
  const totals = {
    total: manifest.cases.length,
    pass: 0,
    fail: 0,
    notRun: 0,
    invalidEvidence: 0,
    missingEvidence: 0,
  };

  for (const testCase of manifest.cases) {
    const evidencePath = path.join(runRoot, testCase.caseId, "evidence.json");
    const analysisPath = path.join(runRoot, testCase.caseId, "analysis.json");
    const result = {
      caseId: testCase.caseId,
      pairId: testCase.pairId,
      variant: testCase.variant,
      status: "missing_evidence",
      workerStatus: "missing_evidence",
      analysisStatus: "missing_analysis",
      evidencePath,
      analysisPath,
      failureReasons: [],
    };

    try {
      const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
      result.workerStatus = VALID_STATUSES.has(evidence.status) ? evidence.status : "invalid_evidence";
      result.status = result.workerStatus;
      result.failureReasons = Array.isArray(evidence.failure_reasons) ? evidence.failure_reasons : [];
    } catch (error) {
      if (error.code !== "ENOENT") {
        result.workerStatus = "invalid_evidence";
        result.status = "invalid_evidence";
        result.failureReasons = [error.message];
      }
    }

    try {
      const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
      result.analysisStatus = VALID_STATUSES.has(analysis.analysis_status) ? analysis.analysis_status : "invalid_analysis";
      if (VALID_STATUSES.has(analysis.final_status)) {
        result.status = analysis.final_status;
      } else if (result.analysisStatus !== "invalid_analysis") {
        result.status = result.analysisStatus;
      } else {
        result.status = "invalid_evidence";
      }
      if (Array.isArray(analysis.reasons) && analysis.reasons.length > 0) {
        result.failureReasons = analysis.reasons;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        result.analysisStatus = "invalid_analysis";
        result.status = "invalid_evidence";
        result.failureReasons = [error.message];
      }
    }

    if (result.status === "pass") totals.pass += 1;
    if (result.status === "fail") totals.fail += 1;
    if (result.status === "not_run") totals.notRun += 1;
    if (result.status === "missing_evidence") totals.missingEvidence += 1;
    if (result.status === "invalid_evidence") totals.invalidEvidence += 1;
    caseResults.push(result);
  }

  return {
    skill: manifest.skill,
    runId: manifest.runId,
    kind: manifest.kind,
    ...totals,
    cases: caseResults,
    pairEffects: manifest.kind === "paired" ? summarizePairEffects(caseResults) : [],
  };
}

export async function analyzeRun({ runRoot, analyzer = defaultAnalyzer } = {}) {
  if (!runRoot) {
    throw new Error("analyzeRun requires runRoot");
  }

  const manifest = JSON.parse(await readFile(path.join(runRoot, "run.json"), "utf8"));
  const analyses = [];
  for (const testCase of manifest.cases) {
    const caseRoot = path.join(runRoot, testCase.caseId);
    const evidenceResult = await readEvidenceForAnalysis(path.join(caseRoot, "evidence.json"));
    const agentOutput = await readOptionalText(path.join(caseRoot, "agent-output.txt"));
    const agentError = await readOptionalText(path.join(caseRoot, "agent-error.txt"));
    const workspaceFiles = await readWorkspaceFiles(path.join(caseRoot, "workspace"));
    const baseAnalyzerResult = await analyzer({
      testCase,
      evidence: evidenceResult.evidence,
      evidenceError: evidenceResult.error,
      workspaceFiles,
      agentOutput,
      agentError,
    });
    const analyzerResult = mergeAnalysisWithBuiltInChecks({
      analyzerResult: baseAnalyzerResult,
      checkReasons: runBuiltInChecks({ testCase, workspaceFiles }),
    });

    const analysis = normalizeAnalysis({
      testCase,
      evidenceResult,
      analyzerResult,
    });
    await writeJson(path.join(caseRoot, "analysis.json"), analysis);
    await writeFile(path.join(caseRoot, "analysis.md"), renderCaseAnalysisMarkdown({
      testCase,
      analysis,
      agentOutput,
      agentError,
      workspaceFiles,
    }), "utf8");
    analyses.push(analysis);
  }

  return analyses;
}

function parseCases({ markdown, methodMarkdown = "", caseId }) {
  const evidenceDefaults = inferEvidenceDefaults(`${methodMarkdown}\n${markdown}`);
  const builtInChecks = parseBuiltInChecks(methodMarkdown);

  if (hasPairedCases(markdown)) {
    return parsePairedCases(markdown, caseId, { evidenceDefaults, builtInChecks });
  }

  return parseOrdinaryCases(markdown, caseId, { evidenceDefaults, builtInChecks });
}

function hasPairedCases(markdown) {
  return /^## Pair [A-Z]+-\d{3}\b/m.test(markdown);
}

function parsePairedCases(markdown, requestedCaseId, { evidenceDefaults, builtInChecks }) {
  const pairIds = listMatches(markdown, /^## Pair ([A-Z]+-\d{3})\b.*$/gm);
  const targetPairIds = requestedCaseId
    ? [requestedCaseId.replace(/[AB]$/, "")]
    : pairIds;
  const cases = [];

  for (const pairId of targetPairIds) {
    const block = extractBlock(markdown, new RegExp(`^## Pair ${escapeRegExp(pairId)}\\b.*$`, "m"), /^## Pair [A-Z]+-\d{3}\b/m, `pair ${pairId}`);
    const title = firstHeadingTitle(block);
    const fixtures = parseWorkspace(block, "Shared Initial Workspace", new RegExp(`\\n### ${escapeRegExp(pairId)}A\\b`));
    const variants = parsePairedVariants(block, pairId);
    for (const variant of variants) {
      if (requestedCaseId && requestedCaseId !== pairId && requestedCaseId !== variant.caseId) {
        continue;
      }
      cases.push({
        ...variant,
        baseCaseId: pairId,
        pairId,
        title,
        fixtures,
        caseMarkdown: block,
        checkRules: checksForCase(builtInChecks, variant.caseId, pairId),
        evidenceDefaults,
      });
    }
  }

  if (cases.length === 0) {
    throw new Error(`No paired cases found${requestedCaseId ? ` for ${requestedCaseId}` : ""}`);
  }

  return cases;
}

function parseOrdinaryCases(markdown, requestedCaseId, { evidenceDefaults, builtInChecks }) {
  const ordinaryIds = listMatches(markdown, /^## ([A-Z]+-\d{3})(?![A-Z])\b.*$/gm);
  const targetIds = requestedCaseId ? [requestedCaseId] : ordinaryIds;
  const sharedFixtures = parseSharedEnabledMemoryFixture(markdown);
  const cases = [];

  for (const id of targetIds) {
    const block = extractBlock(markdown, new RegExp(`^## ${escapeRegExp(id)}\\b.*$`, "m"), /^## [A-Z]+-\d{3}[A-Z]?\b/m, `case ${id}`);
    const title = firstHeadingTitle(block);
    const workspaceText = parseWorkspaceText(block, "Initial Workspace", /\n### Task Prompt\b/);
    const fixtures = resolveOrdinaryFixtures({
      markdown,
      workspaceText,
      sharedFixtures,
      seenCaseIds: new Set([id]),
    });
    const taskPrompt = parseTaskPrompt(block, id, "###");
    cases.push({
      caseId: id,
      baseCaseId: id,
      pairId: null,
      variant: "single",
      label: "single",
      title,
      prompt: taskPrompt,
      fixtures,
      caseMarkdown: block,
      checkRules: checksForCase(builtInChecks, id, id),
      evidenceDefaults,
    });
  }

  if (cases.length === 0) {
    throw new Error(`No ordinary cases found${requestedCaseId ? ` for ${requestedCaseId}` : ""}`);
  }

  return cases;
}

function parsePairedVariants(block, pairId) {
  const variants = [];
  const pattern = new RegExp(
    `### (${escapeRegExp(pairId)}[AB]) ([^\\n]+)\\s*([\\s\\S]*?)(?=\\n### ${escapeRegExp(pairId)}[AB] |\\n## Pair |$)`,
    "g"
  );
  let match;
  while ((match = pattern.exec(block)) !== null) {
    const variant = match[1].endsWith("A") ? "baseline_without_skill" : "with_skill";
    variants.push({
      caseId: match[1],
      variant,
      label: match[2].trim(),
      prompt: parseTaskPrompt(match[3], match[1], "####"),
    });
  }

  if (variants.length === 0) {
    throw new Error(`No variants found for ${pairId}`);
  }

  return variants;
}

function parseBuiltInChecks(markdown) {
  const block = extractOptionalSection(markdown, "Built-in Checks");
  if (!block) {
    return {};
  }

  const jsonMatch = block.match(/```json\s*\n([\s\S]*?)```/);
  if (!jsonMatch) {
    return {};
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    throw new Error(`Could not parse Built-in Checks JSON: ${error.message}`);
  }
}

function checksForCase(checks, caseId, baseCaseId) {
  const forbidden = checks?.forbidden_patterns || {};
  return [
    ...normalizeForbiddenPatternRules(forbidden[baseCaseId]),
    ...normalizeForbiddenPatternRules(forbidden[caseId]),
  ];
}

function normalizeForbiddenPatternRules(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return entries.map((entry) => {
    if (typeof entry === "string") {
      return {
        type: "forbidden_pattern",
        file: "**/*",
        pattern: entry,
        code: "forbidden_pattern",
        detail: `Matched forbidden pattern: ${entry}`,
      };
    }

    return {
      type: "forbidden_pattern",
      file: entry.file || "**/*",
      pattern: entry.pattern,
      code: entry.code || "forbidden_pattern",
      detail: entry.detail || `Matched forbidden pattern: ${entry.pattern}`,
    };
  }).filter((entry) => entry.pattern);
}

function parseWorkspace(block, heading, endPattern) {
  return parseFixtureBlocks(parseWorkspaceText(block, heading, endPattern));
}

function parseWorkspaceText(block, heading, endPattern) {
  const headingPattern = new RegExp(`### ${escapeRegExp(heading)}\\s*([\\s\\S]*?)(?=${endPattern.source})`);
  const workspaceMatch = block.match(headingPattern);
  if (!workspaceMatch) {
    throw new Error(`Could not find ${heading}`);
  }

  return workspaceMatch[1];
}

function parseFixtureBlocks(markdown) {
  const fixtures = [];
  const fileBlockPattern = /`([^`\n]+)`\s*\n\n```[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = fileBlockPattern.exec(markdown)) !== null) {
    fixtures.push({ relativePath: match[1], content: ensureTrailingNewline(match[2]) });
  }

  return fixtures;
}

function parseSharedEnabledMemoryFixture(markdown) {
  const match = markdown.match(
    /^## Shared Enabled Memory Fixture\b[\s\S]*?(?=\n## [A-Z]+-\d{3}\b|\n## Pair [A-Z]+-\d{3}\b|(?![\s\S]))/m
  );
  if (!match) {
    return [];
  }

  return parseFixtureBlocks(match[0]);
}

function resolveOrdinaryFixtures({ markdown, workspaceText, sharedFixtures, seenCaseIds }) {
  const directFixtures = parseFixtureBlocks(workspaceText);
  const referencedFixtures = parseReferencedWorkspaceFixtures({
    markdown,
    workspaceText,
    sharedFixtures,
    seenCaseIds,
  });
  const usesShared = /Use (?:the )?shared enabled memory fixture/i.test(workspaceText);
  if (!usesShared && referencedFixtures.length === 0) {
    return directFixtures;
  }

  const fixtures = new Map();
  if (usesShared) {
    for (const fixture of sharedFixtures) {
      fixtures.set(fixture.relativePath, fixture);
    }
  }
  for (const fixture of referencedFixtures) {
    fixtures.set(fixture.relativePath, fixture);
  }
  for (const fixture of directFixtures) {
    fixtures.set(fixture.relativePath, fixture);
  }

  const contextReplacement = workspaceText.match(/replace `context\.md` with:\s*```[^\n]*\n([\s\S]*?)```/i);
  if (contextReplacement) {
    fixtures.set(".wingman/memory/context.md", {
      relativePath: ".wingman/memory/context.md",
      content: ensureTrailingNewline(contextReplacement[1]),
    });
  }

  return [...fixtures.values()];
}

function parseReferencedWorkspaceFixtures({ markdown, workspaceText, sharedFixtures, seenCaseIds }) {
  const referenceMatch = workspaceText.match(/Use `?([A-Z]+-\d{3})`? initial workspace/i);
  if (!referenceMatch) {
    return [];
  }

  const referencedCaseId = referenceMatch[1];
  if (seenCaseIds.has(referencedCaseId)) {
    throw new Error(`Circular initial workspace reference: ${[...seenCaseIds, referencedCaseId].join(" -> ")}`);
  }

  const block = extractBlock(
    markdown,
    new RegExp(`^## ${escapeRegExp(referencedCaseId)}\\b.*$`, "m"),
    /^## [A-Z]+-\d{3}[A-Z]?\b/m,
    `case ${referencedCaseId}`
  );
  const referencedWorkspaceText = parseWorkspaceText(block, "Initial Workspace", /\n### Task Prompt\b/);

  return resolveOrdinaryFixtures({
    markdown,
    workspaceText: referencedWorkspaceText,
    sharedFixtures,
    seenCaseIds: new Set([...seenCaseIds, referencedCaseId]),
  });
}

function parseTaskPrompt(block, caseId, headingPrefix) {
  const promptMatch = block.match(new RegExp(`${escapeRegExp(headingPrefix)} Task Prompt\\s*\\n\\s*\`\`\`text\\n([\\s\\S]*?)\`\`\``));
  if (!promptMatch) {
    throw new Error(`Could not find Task Prompt for ${caseId}`);
  }

  return promptMatch[1].trim();
}

function buildPrompt({ skill, testCase, toolchains = {} }) {
  const guard = buildSkillGuard({ skill, testCase });
  const evidencePath = path.join("..", "evidence.json");
  const toolchainText = buildToolchainPrompt(toolchains);

  return `# ${testCase.caseId}

${guard}

Run this case in the current workspace directory. Execute only this case.
Do not read or modify files outside the current workspace directory.
Do not install dependencies. Do not run \`npm install\`, \`npm install -D\`, \`pnpm install\`, \`yarn install\`, or package-installing \`npx\` commands. If a verification tool is missing, record \`verification_missing\` in \`failure_reasons\`.
${toolchainText}

Write the completed evidence JSON to \`${evidencePath}\`. Do not overwrite \`../evidence-template.json\`.

## Task Prompt

${testCase.prompt}

## Evidence Requirements

- Use \`../evidence-template.json\` as the shape.
- Set \`status\` to \`pass\`, \`fail\`, or \`not_run\`.
- Include concrete \`files_read\`, \`files_changed\`, \`commands_run\`, \`final_answer\`, \`observed_output\`, \`expected_behavior\`, and \`failure_reasons\`.
- Return a brief final message after writing \`${evidencePath}\`.
`;
}

function buildToolchainPrompt(toolchains) {
  if (!toolchains.typescript) {
    return "";
  }

  return `TypeScript verification is available at:
\`${toolchains.typescript.binPath}\`
Use this \`tsc\` binary for TypeScript checks.`;
}

function buildSkillGuard({ skill, testCase }) {
  if (testCase.variant === "baseline_without_skill") {
    return `Do not use \`${skill}\` or any Wingman skill. This is the baseline variant.`;
  }

  if (testCase.variant === "with_skill") {
    return `Use \`${skill}\`. This is the skill variant.`;
  }

  return `Use \`${skill}\` exactly as required by this evaluation case.`;
}

function buildEvidenceTemplate({ skill, testCase }) {
  const base = {
    id: testCase.caseId,
    skill,
    status: "not_run",
    files_read: [],
    files_changed: [],
    commands_run: [],
    final_answer: "",
    observed_output: "",
    expected_behavior: "",
    failure_reasons: [],
  };

  if (testCase.variant !== "single") {
    base.variant = testCase.variant;
  }

  return addEvidenceDefaults(base, testCase.evidenceDefaults || {});
}

function inferEvidenceDefaults(markdown) {
  const defaults = {};
  for (const [field, value] of Object.entries(inferEvidenceDefaultsFromJsonExample(markdown))) {
    defaults[field] = normalizeEvidenceDefault(value);
  }
  for (const field of inferEvidenceFieldsFromEvidenceRequirements(markdown)) {
    if (!(field in defaults)) {
      defaults[field] = defaultEvidenceValue(field);
    }
  }
  for (const field of inferEvidenceFieldsFromCaseContent(markdown)) {
    if (!(field in defaults)) {
      defaults[field] = defaultEvidenceValue(field);
    }
  }

  for (const field of Object.keys(genericEvidenceDefaults())) {
    delete defaults[field];
  }

  return defaults;
}

function inferEvidenceDefaultsFromJsonExample(markdown) {
  const jsonMatch = markdown.match(/```json\n([\s\S]*?)```/);
  if (!jsonMatch) {
    return {};
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    const sampleCase = Array.isArray(parsed.cases) ? parsed.cases[0] : parsed;
    if (!sampleCase || typeof sampleCase !== "object") {
      return {};
    }
    return sampleCase;
  } catch {
    return {};
  }
}

function inferEvidenceFieldsFromEvidenceRequirements(markdown) {
  const fields = [];
  const pattern = /`([a-z][a-z0-9_]*)`/g;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    fields.push(match[1]);
  }
  return fields;
}

function inferEvidenceFieldsFromCaseContent(markdown) {
  const candidates = {
    memory_state: /\bmemory state\b/i,
    loaded_memory_files: /\bloaded_memory_files\b|loaded memory files/i,
    irrelevant_files_read: /\birrelevant_files_read\b|irrelevant file/i,
    directories_created: /\bdirectories_created\b|directories created/i,
    refused_action: /\brefused_action\b|refused action/i,
    route: /\broute\b/i,
    memory_changes: /\bmemory_changes\b|memory changes/i,
    blocked_reason: /\bblocked_reason\b|blocked reason/i,
    scope: /\bscope\b/i,
    classifications: /\bclassifications\b|classify|classified/i,
    deletion_proposals: /\bdeletion_proposals\b|deletion proposal/i,
    confirmed_deletions: /\bconfirmed_deletions\b|confirmed deletion/i,
  };

  return Object.entries(candidates)
    .filter(([, pattern]) => pattern.test(markdown))
    .map(([field]) => field);
}

function genericEvidenceDefaults() {
  return {
    id: "",
    skill: "",
    status: "not_run",
    variant: "",
    files_read: [],
    files_changed: [],
    commands_run: [],
    final_answer: "",
    observed_output: "",
    expected_behavior: "",
    failure_reasons: [],
  };
}

function addEvidenceDefaults(base, defaults) {
  const result = { ...base };
  for (const [field, value] of Object.entries(defaults)) {
    if (field in result) {
      continue;
    }
    result[field] = value;
  }
  return result;
}

function normalizeEvidenceDefault(value) {
  if (Array.isArray(value)) return [];
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return 0;
  if (value && typeof value === "object") return {};
  if (value === "pass" || value === "fail") return "not_run";
  if (typeof value === "string") return "";
  return value ?? "";
}

function defaultEvidenceValue(field) {
  if (field.endsWith("_files") || field.endsWith("_read") || field.endsWith("_changed")) return [];
  if (field.endsWith("_created") || field.endsWith("_changes")) return [];
  if (field.endsWith("_proposals") || field.endsWith("_deletions")) return [];
  if (field === "classifications" || field === "memory_changes") return [];
  if (field === "memory_state") return "unknown";
  return "";
}

async function prepareToolchains({ repoRoot, setupToolchain, setupToolchainRunner, setupTimeoutMs }) {
  const names = normalizeToolchainNames(setupToolchain);
  const toolchains = {};

  for (const name of names) {
    if (name !== "typescript") {
      throw new Error(`Unsupported toolchain: ${name}`);
    }
    toolchains.typescript = await prepareTypeScriptToolchain({
      repoRoot,
      setupToolchainRunner,
      setupTimeoutMs,
    });
  }

  return toolchains;
}

function normalizeToolchainNames(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(normalizeToolchainNames);
  }
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function prepareTypeScriptToolchain({ repoRoot, setupToolchainRunner, setupTimeoutMs }) {
  const toolchainRoot = path.join(repoRoot, ".eval-runs", ".toolchains", "typescript");
  const binPath = path.join(toolchainRoot, "node_modules", ".bin", "tsc");
  const startedAt = new Date().toISOString();
  const result = await setupToolchainRunner({
    toolchain: "typescript",
    toolchainRoot,
    binPath,
    timeoutMs: setupTimeoutMs,
  });
  const endedAt = new Date().toISOString();
  const setup = {
    toolchain: "typescript",
    toolchainRoot,
    binPath,
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    startedAt,
    endedAt,
  };

  await writeFile(path.join(toolchainRoot, "setup-output.txt"), result.stdout || "", "utf8");
  await writeFile(path.join(toolchainRoot, "setup-error.txt"), result.stderr || "", "utf8");
  await writeJson(path.join(toolchainRoot, "setup.json"), setup);

  return {
    root: toolchainRoot,
    binPath,
    setupPath: path.join(toolchainRoot, "setup.json"),
  };
}

async function setupToolchainWithNpm({ toolchainRoot, timeoutMs }) {
  await mkdir(toolchainRoot, { recursive: true });
  await writeJson(path.join(toolchainRoot, "package.json"), {
    private: true,
    dependencies: {},
  });
  const command = "npm";
  const args = ["install", "--prefix", toolchainRoot, "--no-audit", "--no-fund", "typescript"];
  const result = await spawnWithInput({
    command,
    args,
    cwd: toolchainRoot,
    input: "",
    timeoutMs,
    env: {
      ...process.env,
      npm_config_cache: path.join(path.dirname(path.dirname(toolchainRoot)), ".npm-cache"),
    },
  });

  return {
    command: [command, ...args],
    cwd: toolchainRoot,
    ...result,
  };
}

async function runAgentCase({ testCase, agent, agentCmd, timeoutMs }) {
  const prompt = await readFile(testCase.promptPath, "utf8");
  const command = resolveAgentCommand({ agent, agentCmd, prompt, workspaceRoot: testCase.workspaceRoot });
  const startedAt = new Date().toISOString();
  const result = await spawnWithInput({
    command: command.command,
    args: command.args,
    cwd: command.cwd,
    input: command.stdin,
    timeoutMs,
  });
  const endedAt = new Date().toISOString();

  await writeFile(path.join(testCase.caseRoot, "agent-output.txt"), result.stdout, "utf8");
  await writeFile(path.join(testCase.caseRoot, "agent-error.txt"), result.stderr, "utf8");
  await writeJson(path.join(testCase.caseRoot, "agent-run.json"), {
    agent,
    command: [command.command, ...command.args],
    cwd: command.cwd,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    startedAt,
    endedAt,
  });
}

async function readEvidenceForAnalysis(evidencePath) {
  try {
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    if (!VALID_STATUSES.has(evidence.status)) {
      return {
        evidence,
        error: `Invalid evidence status: ${evidence.status}`,
      };
    }
    return { evidence, error: "" };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { evidence: null, error: "Missing evidence.json" };
    }
    return { evidence: null, error: error.message };
  }
}

async function readWorkspaceFiles(workspaceRoot) {
  const files = {};
  await readWorkspaceFilesInto({ root: workspaceRoot, current: workspaceRoot, files });
  return files;
}

async function readWorkspaceFilesInto({ root, current, files }) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(root, absolutePath);
    if (entry.isDirectory()) {
      await readWorkspaceFilesInto({ root, current: absolutePath, files });
    } else if (entry.isFile()) {
      files[relativePath] = await readFile(absolutePath, "utf8");
    }
  }
}

async function defaultAnalyzer({ evidence, evidenceError }) {
  if (evidenceError) {
    return {
      status: "fail",
      reasons: [{ code: "evidence_invalid", detail: evidenceError }],
      notes: "The tested agent did not produce valid evidence.",
    };
  }

  return {
    status: evidence.status,
    reasons: Array.isArray(evidence.failure_reasons) ? evidence.failure_reasons : [],
    notes: "Default analysis mirrors worker status. Inspect analysis.md, evidence.json, agent output, and workspace files for debugging.",
  };
}

function runBuiltInChecks({ testCase, workspaceFiles }) {
  const reasons = [];
  for (const rule of testCase.checkRules || []) {
    if (rule.type !== "forbidden_pattern") {
      continue;
    }

    let pattern;
    try {
      pattern = new RegExp(rule.pattern, "m");
    } catch (error) {
      reasons.push({
        code: "checker_invalid_rule",
        detail: `Invalid forbidden pattern for ${testCase.caseId}: ${error.message}`,
      });
      continue;
    }

    for (const [file, content] of Object.entries(workspaceFiles)) {
      if (!matchesFilePattern(file, rule.file)) {
        continue;
      }
      if (pattern.test(content)) {
        reasons.push({ code: rule.code, detail: rule.detail });
        break;
      }
    }
  }

  return reasons;
}

function mergeAnalysisWithBuiltInChecks({ analyzerResult, checkReasons }) {
  if (checkReasons.length === 0) {
    return analyzerResult;
  }

  return {
    ...analyzerResult,
    status: "fail",
    reasons: [
      ...(Array.isArray(analyzerResult?.reasons) ? analyzerResult.reasons : []),
      ...checkReasons,
    ],
    notes: [analyzerResult?.notes, "Built-in checks found forbidden output in the modified workspace."]
      .filter(Boolean)
      .join("\n"),
  };
}

function buildJudgeAnalyzer({ judgeAgent, judgeCmd, timeoutMs }) {
  if (!judgeAgent && !judgeCmd) {
    return defaultAnalyzer;
  }

  return async ({ testCase, evidence, evidenceError, workspaceFiles, agentOutput, agentError }) => {
    const prompt = buildJudgePrompt({ testCase, evidence, evidenceError, workspaceFiles, agentOutput, agentError });
    const command = resolveAgentCommand({
      agent: judgeAgent || "claude",
      agentCmd: judgeCmd,
      prompt,
      workspaceRoot: testCase.workspaceRoot,
    });
    const result = await spawnWithInput({
      command: command.command,
      args: command.args,
      cwd: command.cwd,
      input: command.stdin,
      timeoutMs,
    });

    const parsed = parseJsonObject(result.stdout);
    if (!parsed || !VALID_STATUSES.has(parsed.status)) {
      return {
        status: "fail",
        reasons: [{ code: "judge_invalid_output", detail: result.stdout || result.stderr || "Judge did not return valid JSON." }],
        notes: "Judge output could not be parsed. See analysis.md for captured output.",
        judge_stdout: result.stdout,
        judge_stderr: result.stderr,
      };
    }

    return {
      status: parsed.status,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      notes: parsed.notes || "",
      judge_stdout: result.stdout,
      judge_stderr: result.stderr,
    };
  };
}

function buildJudgePrompt({ testCase, evidence, evidenceError, workspaceFiles, agentOutput, agentError }) {
  return `You are judging a Wingman skill evaluation case.

Decide whether the tested agent's result satisfies the case requirements.
Do not trust the worker's self-reported status. If the final workspace violates Forbidden Behavior or fails Pass Assertions, return fail.

Return only JSON with this shape:

{
  "status": "pass | fail | not_run",
  "reasons": [{"code": "short_code", "detail": "specific reason"}],
  "notes": "brief explanation"
}

## Case

${JSON.stringify({
    caseId: testCase.caseId,
    variant: testCase.variant,
    title: testCase.title,
  }, null, 2)}

## Case Spec

${testCase.caseMarkdown || "Not available"}

## Evidence Error

${evidenceError || "None"}

## Evidence

${JSON.stringify(evidence, null, 2)}

## Agent Output

\`\`\`text
${agentOutput}
\`\`\`

## Agent Error

\`\`\`text
${agentError}
\`\`\`

## Workspace Files After Run

${Object.entries(workspaceFiles).map(([file, content]) => `### ${file}\n\n\`\`\`\n${content}\n\`\`\``).join("\n\n")}
`;
}

function parseJsonObject(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeAnalysis({ testCase, evidenceResult, analyzerResult }) {
  const workerStatus = evidenceResult.evidence?.status || (evidenceResult.error ? "invalid_evidence" : "missing_evidence");
  const analysisStatus = VALID_STATUSES.has(analyzerResult?.status) ? analyzerResult.status : "fail";
  const finalStatus = analysisStatus;
  const reasons = Array.isArray(analyzerResult?.reasons) ? analyzerResult.reasons : [];

  return {
    id: testCase.caseId,
    variant: testCase.variant,
    worker_status: workerStatus,
    analysis_status: analysisStatus,
    final_status: finalStatus,
    reasons,
    notes: analyzerResult?.notes || "",
    judge_stdout: analyzerResult?.judge_stdout || "",
    judge_stderr: analyzerResult?.judge_stderr || "",
  };
}

function renderCaseAnalysisMarkdown({ testCase, analysis, agentOutput, agentError, workspaceFiles }) {
  return `# ${testCase.caseId} Analysis

## Status

| Field | Value |
| --- | --- |
| Worker Status | ${analysis.worker_status} |
| Analysis Status | ${analysis.analysis_status} |
| Final Status | ${analysis.final_status} |

## Reasons

${analysis.reasons.length > 0 ? analysis.reasons.map((reason) => `- ${reason.code || "reason"}: ${reason.detail || JSON.stringify(reason)}`).join("\n") : "- None"}

## Notes

${analysis.notes || "None"}

## Case Spec

${testCase.caseMarkdown || "Not available"}

## Agent Output

\`\`\`text
${agentOutput || ""}
\`\`\`

## Agent Error

\`\`\`text
${agentError || ""}
\`\`\`

## Judge Output

\`\`\`text
${analysis.judge_stdout || ""}
\`\`\`

## Judge Error

\`\`\`text
${analysis.judge_stderr || ""}
\`\`\`

## Workspace Files

${Object.keys(workspaceFiles).length > 0 ? Object.keys(workspaceFiles).sort().map((file) => `- ${file}`).join("\n") : "- None"}
`;
}

function resolveAgentCommand({ agent, agentCmd, prompt, workspaceRoot }) {
  if (agentCmd) {
    const parts = splitCommand(agentCmd);
    return {
      command: parts[0],
      args: parts.slice(1),
      cwd: workspaceRoot,
      stdin: prompt,
    };
  }

  if (agent === "codex") {
    return {
      command: "codex",
      args: ["exec", "--cd", workspaceRoot, "--sandbox", "workspace-write", "--ask-for-approval", "never", "-"],
      cwd: workspaceRoot,
      stdin: prompt,
    };
  }

  if (agent === "claude") {
    return {
      command: "claude",
      args: ["-p"],
      cwd: workspaceRoot,
      stdin: prompt,
    };
  }

  throw new Error(`Unsupported agent: ${agent}`);
}

function spawnWithInput({ command, args, cwd, input, timeoutMs, env = process.env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr, timedOut });
    });
    child.stdin.end(input);
  });
}

function summarizePairEffects(caseResults) {
  const pairs = new Map();
  for (const result of caseResults) {
    if (!result.pairId) continue;
    const pair = pairs.get(result.pairId) || { pairId: result.pairId, baseline: "missing_evidence", withSkill: "missing_evidence" };
    if (result.variant === "baseline_without_skill") {
      pair.baseline = result.status;
    }
    if (result.variant === "with_skill") {
      pair.withSkill = result.status;
    }
    pairs.set(result.pairId, pair);
  }

  return [...pairs.values()].map((pair) => ({
    ...pair,
    effect: classifyPairEffect(pair),
  }));
}

function classifyPairEffect({ baseline, withSkill }) {
  if (baseline === "fail" && withSkill === "pass") return "improved";
  if (baseline === "pass" && withSkill === "fail") return "regressed";
  if (baseline === "pass" && withSkill === "pass") return "unchanged_pass";
  if (baseline === "fail" && withSkill === "fail") return "unchanged_fail";
  return "inconclusive";
}

function renderSummaryMarkdown(summary) {
  const lines = [
    `# ${summary.skill} Eval Summary`,
    "",
    `Run ID: ${summary.runId}`,
    `Kind: ${summary.kind}`,
    "",
    "## Totals",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Total | ${summary.total} |`,
    `| Pass | ${summary.pass} |`,
    `| Fail | ${summary.fail} |`,
    `| Not Run | ${summary.notRun} |`,
    `| Missing Evidence | ${summary.missingEvidence} |`,
    `| Invalid Evidence | ${summary.invalidEvidence} |`,
    "",
    "## Cases",
    "",
    "| Case | Variant | Worker | Analysis | Final |",
    "| --- | --- | --- | --- | --- |",
    ...summary.cases.map((entry) => `| ${entry.caseId} | ${entry.variant || ""} | ${entry.workerStatus} | ${entry.analysisStatus} | ${entry.status} |`),
  ];

  if (summary.pairEffects.length > 0) {
    lines.push(
      "",
      "## Pair Effects",
      "",
      "| Pair | Baseline | With Skill | Effect |",
      "| --- | --- | --- | --- |",
      ...summary.pairEffects.map((entry) => `| ${entry.pairId} | ${entry.baseline} | ${entry.withSkill} | ${entry.effect} |`)
    );
  }

  return `${lines.join("\n")}\n`;
}

async function writeFixtures(workspaceRoot, fixtures) {
  await mkdir(workspaceRoot, { recursive: true });
  for (const fixture of fixtures) {
    const target = path.join(workspaceRoot, fixture.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, fixture.content, "utf8");
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function extractBlock(markdown, startPattern, nextPattern, label) {
  const startMatch = markdown.match(startPattern);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`Could not find ${label}`);
  }

  const rest = markdown.slice(startMatch.index);
  const afterHeading = rest.slice(startMatch[0].length);
  const nextMatch = afterHeading.match(nextPattern);
  if (!nextMatch || nextMatch.index === undefined) {
    return rest;
  }

  return rest.slice(0, startMatch[0].length + nextMatch.index);
}

function extractOptionalSection(markdown, heading) {
  const startMatch = markdown.match(new RegExp(`^## ${escapeRegExp(heading)}\\b.*$`, "m"));
  if (!startMatch || startMatch.index === undefined) {
    return "";
  }

  const rest = markdown.slice(startMatch.index);
  const nextMatch = rest.slice(startMatch[0].length).match(/\n## /);
  if (!nextMatch || nextMatch.index === undefined) {
    return rest;
  }

  return rest.slice(0, startMatch[0].length + nextMatch.index);
}

function firstHeadingTitle(block) {
  return block.split("\n", 1)[0].replace(/^##\s+/, "").trim();
}

function listMatches(markdown, pattern) {
  const values = [];
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    values.push(match[1]);
  }
  return values;
}

function splitCommand(command) {
  const matches = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  return matches.map((part) => part.replace(/^(['"])(.*)\1$/, "$2"));
}

function matchesFilePattern(file, pattern) {
  if (!pattern || pattern === "**/*") {
    return true;
  }
  if (pattern.endsWith("/**/*")) {
    return file.startsWith(pattern.slice(0, -4));
  }
  if (pattern.startsWith("**/")) {
    return file.endsWith(pattern.slice(3));
  }
  return file === pattern;
}

function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function timestampRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseArgs(argv) {
  const options = {
    agent: "claude",
    timeoutMs: 10 * 60 * 1000,
    dryRun: false,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--agent") options.agent = argv[++index];
    else if (arg === "--agent-cmd") options.agentCmd = argv[++index];
    else if (arg === "--judge-agent") options.judgeAgent = argv[++index];
    else if (arg === "--judge-cmd") options.judgeCmd = argv[++index];
    else if (arg === "--case") options.caseId = argv[++index];
    else if (arg === "--run-id") options.runId = argv[++index];
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index]);
    else if (arg === "--setup-timeout-ms") options.setupTimeoutMs = Number(argv[++index]);
    else if (arg === "--setup-toolchain") options.setupToolchain = argv[++index];
    else if (arg === "--dry-run") options.dryRun = true;
    else positional.push(arg);
  }

  options.skill = positional[0];
  if (!options.skill) {
    throw new Error("Usage: node tests/runner/run-skill-eval.mjs <skill> [--case <case-id>] [--agent claude|codex] [--dry-run]");
  }

  if (!options.agentCmd && process.env.WINGMAN_EVAL_AGENT_CMD) {
    options.agentCmd = process.env.WINGMAN_EVAL_AGENT_CMD;
  }
  if (!options.judgeCmd && process.env.WINGMAN_EVAL_JUDGE_CMD) {
    options.judgeCmd = process.env.WINGMAN_EVAL_JUDGE_CMD;
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runSkillEval(options);
  console.log(JSON.stringify({ runRoot: result.runRoot, summary: result.summary }, null, 2));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

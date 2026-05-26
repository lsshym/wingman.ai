#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function prepareMemoryRun({
  skill,
  caseId,
  runId = new Date().toISOString().replace(/[:.]/g, "-"),
  repoRoot = process.cwd(),
  casesPath = path.join(repoRoot, "tests", skill, "cases.md"),
} = {}) {
  if (!skill) {
    throw new Error("prepareMemoryRun requires skill");
  }
  if (!caseId) {
    throw new Error("prepareMemoryRun requires caseId");
  }

  const casesMarkdown = await readFile(casesPath, "utf8");
  const caseBlock = extractCaseBlock(casesMarkdown, caseId);
  const fixtures = parseInitialWorkspace(caseBlock);
  const taskPrompt = parseTaskPrompt(caseBlock, caseId);
  const caseRoot = path.join(repoRoot, ".eval-runs", skill, runId, caseId);
  const workspaceRoot = path.join(caseRoot, "workspace");

  await writeFixtures(workspaceRoot, fixtures);
  await writeFile(path.join(caseRoot, "prompt.md"), buildPrompt({ skill, caseId, taskPrompt }), "utf8");
  await writeFile(
    path.join(caseRoot, "evidence-template.json"),
    `${JSON.stringify(buildEvidenceTemplate({ skill, caseId }), null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(caseRoot, "run.json"),
    `${JSON.stringify({ skill, caseId, runId, caseRoot }, null, 2)}\n`,
    "utf8"
  );

  return { skill, caseId, runId, caseRoot };
}

export async function prepareAllMemoryRuns({
  skill,
  runId = new Date().toISOString().replace(/[:.]/g, "-"),
  repoRoot = process.cwd(),
  casesPath = path.join(repoRoot, "tests", skill, "cases.md"),
} = {}) {
  if (!skill) {
    throw new Error("prepareAllMemoryRuns requires skill");
  }

  const casesMarkdown = await readFile(casesPath, "utf8");
  const caseIds = listSingleCaseIds(casesMarkdown);
  const runs = [];

  for (const caseId of caseIds) {
    runs.push(await prepareMemoryRun({ skill, caseId, runId, repoRoot, casesPath }));
  }

  return { skill, runId, caseIds, runs };
}

function listSingleCaseIds(markdown) {
  const ids = [];
  const pattern = /^## (MEM[A-Z]+-\d{3})(?![A-Z])\b.*$/gm;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractCaseBlock(markdown, caseId) {
  const startPattern = new RegExp(`^## ${escapeRegExp(caseId)}\\b.*$`, "m");
  const startMatch = markdown.match(startPattern);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`Could not find case ${caseId}`);
  }

  const rest = markdown.slice(startMatch.index);
  const nextMatch = rest.slice(startMatch[0].length).match(/^## [A-Z]+-\d{3}/m);
  if (!nextMatch || nextMatch.index === undefined) {
    return rest;
  }

  return rest.slice(0, startMatch[0].length + nextMatch.index);
}

function parseInitialWorkspace(block) {
  const workspaceMatch = block.match(/### Initial Workspace\s*([\s\S]*?)(?=\n### Task Prompt\b)/);
  if (!workspaceMatch) {
    throw new Error("Could not find Initial Workspace");
  }

  const workspace = workspaceMatch[1];
  const fixtures = [];
  const fileBlockPattern = /`([^`\n]+)`\s*\n\n```[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = fileBlockPattern.exec(workspace)) !== null) {
    fixtures.push({ relativePath: match[1], content: ensureTrailingNewline(match[2]) });
  }

  return fixtures;
}

function parseTaskPrompt(block, caseId) {
  const promptMatch = block.match(/### Task Prompt\s*```text\n([\s\S]*?)```/);
  if (!promptMatch) {
    throw new Error(`Could not find Task Prompt for ${caseId}`);
  }

  return promptMatch[1].trim();
}

async function writeFixtures(workspaceRoot, fixtures) {
  await mkdir(workspaceRoot, { recursive: true });
  for (const fixture of fixtures) {
    const target = path.join(workspaceRoot, fixture.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, fixture.content, "utf8");
  }
}

function buildPrompt({ skill, caseId, taskPrompt }) {
  return `# ${caseId}

Use \`${skill}\` exactly as required by this memory evaluation case.

Run this case in the provided workspace directory. Execute only this case. Return evidence JSON only.

## Task Prompt

${taskPrompt}

## Required Evidence JSON

Fill \`evidence-template.json\` with the actual result shape:

- \`memory_state\`
- \`files_read\`
- \`loaded_memory_files\`
- \`files_changed\`
- \`commands_run\`
- \`final_answer\`
- \`observed_output\`
- \`expected_behavior\`
- \`failure_reasons\`
`;
}

function buildEvidenceTemplate({ skill, caseId }) {
  return {
    id: caseId,
    skill,
    status: "not_run",
    memory_state: "unknown",
    files_read: [],
    loaded_memory_files: [],
    irrelevant_files_read: [],
    files_changed: [],
    commands_run: [],
    final_answer: "",
    observed_output: "",
    expected_behavior: "",
    failure_reasons: [],
  };
}

function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const [command, skill, caseId, runId] = process.argv.slice(2);
  if (!["prepare", "all"].includes(command) || !skill || (command === "prepare" && !caseId)) {
    console.error("Usage: node tests/runner/memory/eval-memory.mjs prepare <memory-skill> <case-id> [run-id]");
    console.error("   or: node tests/runner/memory/eval-memory.mjs all <memory-skill> [run-id]");
    process.exit(1);
  }

  const result =
    command === "all"
      ? await prepareAllMemoryRuns({ skill, runId: caseId })
      : await prepareMemoryRun({ skill, caseId, runId });
  console.log(JSON.stringify(result, null, 2));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

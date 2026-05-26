#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function prepareRun({
  skill,
  caseId,
  runId = new Date().toISOString().replace(/[:.]/g, "-"),
  repoRoot = process.cwd(),
  casesPath = path.join(repoRoot, "tests", skill, "cases.md"),
} = {}) {
  if (!skill) {
    throw new Error("prepareRun requires skill");
  }
  if (!caseId) {
    throw new Error("prepareRun requires caseId");
  }

  const casesMarkdown = await readFile(casesPath, "utf8");
  const pairBlock = extractPairBlock(casesMarkdown, caseId);
  const fixtures = parseInitialWorkspace(pairBlock);
  const variants = parseVariants(pairBlock, caseId);
  const runRoot = path.join(repoRoot, ".eval-runs", skill, runId);
  const caseDirs = [];

  for (const variant of variants) {
    const caseRoot = path.join(runRoot, variant.id);
    const workspaceRoot = path.join(caseRoot, "workspace");
    await writeFixtures(workspaceRoot, fixtures);
    await writeFile(path.join(caseRoot, "prompt.md"), buildPrompt({ skill, variant }), "utf8");
    await writeFile(
      path.join(caseRoot, "evidence-template.json"),
      `${JSON.stringify(buildEvidenceTemplate({ skill, variant }), null, 2)}\n`,
      "utf8"
    );
    caseDirs.push({ caseId: variant.id, path: caseRoot });
  }

  await writeFile(
    path.join(runRoot, "run.json"),
    `${JSON.stringify({ skill, caseId, runId, caseDirs }, null, 2)}\n`,
    "utf8"
  );

  return { skill, caseId, runId, runRoot, caseDirs };
}

export async function prepareAllRuns({
  skill,
  runId = new Date().toISOString().replace(/[:.]/g, "-"),
  repoRoot = process.cwd(),
  casesPath = path.join(repoRoot, "tests", skill, "cases.md"),
} = {}) {
  if (!skill) {
    throw new Error("prepareAllRuns requires skill");
  }

  const casesMarkdown = await readFile(casesPath, "utf8");
  const pairIds = listPairIds(casesMarkdown);
  const runs = [];

  for (const caseId of pairIds) {
    runs.push(await prepareRun({ skill, caseId, runId, repoRoot, casesPath }));
  }

  return { skill, runId, caseIds: pairIds, runs };
}

function listPairIds(markdown) {
  const ids = [];
  const pattern = /^## Pair ([A-Z]+-\d{3})\b.*$/gm;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractPairBlock(markdown, caseId) {
  const startPattern = new RegExp(`^## Pair ${escapeRegExp(caseId)}\\b.*$`, "m");
  const startMatch = markdown.match(startPattern);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(`Could not find pair ${caseId}`);
  }

  const rest = markdown.slice(startMatch.index);
  const nextMatch = rest.slice(startMatch[0].length).match(/^## Pair \w+-\d+:/m);
  if (!nextMatch || nextMatch.index === undefined) {
    return rest;
  }

  return rest.slice(0, startMatch[0].length + nextMatch.index);
}

function parseInitialWorkspace(block) {
  const workspaceMatch = block.match(/### Shared Initial Workspace\s*([\s\S]*?)(?=\n### [A-Z]+-\d{3}A\b)/);
  if (!workspaceMatch) {
    throw new Error("Could not find Shared Initial Workspace");
  }

  const workspace = workspaceMatch[1];
  const fixtures = [];
  const fileBlockPattern = /`([^`\n]+)`\s*\n\n```[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = fileBlockPattern.exec(workspace)) !== null) {
    fixtures.push({ relativePath: match[1], content: ensureTrailingNewline(match[2]) });
  }

  if (fixtures.length === 0) {
    throw new Error("Shared Initial Workspace did not contain any file fixtures");
  }

  return fixtures;
}

function parseVariants(block, caseId) {
  const variants = [];
  const variantPattern = new RegExp(
    `### (${escapeRegExp(caseId)}[AB]) ([^\\n]+)\\s*([\\s\\S]*?)(?=\\n### ${escapeRegExp(caseId)}[AB] |\\n## Pair |$)`,
    "g"
  );

  let match;
  while ((match = variantPattern.exec(block)) !== null) {
    const promptMatch = match[3].match(/#### Task Prompt\s*```text\n([\s\S]*?)```/);
    if (!promptMatch) {
      throw new Error(`Could not find Task Prompt for ${match[1]}`);
    }

    variants.push({
      id: match[1],
      label: match[2].trim(),
      prompt: promptMatch[1].trim(),
    });
  }

  if (variants.length === 0) {
    throw new Error(`No A/B variants found for ${caseId}`);
  }

  return variants;
}

async function writeFixtures(workspaceRoot, fixtures) {
  for (const fixture of fixtures) {
    const target = path.join(workspaceRoot, fixture.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, fixture.content, "utf8");
  }
}

function buildPrompt({ skill, variant }) {
  const guard =
    variant.id.endsWith("A")
      ? `Do not use \`${skill}\` or any Wingman skill. This is the baseline variant.`
      : `Use \`${skill}\`. This is the skill variant.`;

  return `# ${variant.id} ${variant.label}

${guard}

Run this case in the provided workspace directory. Execute only this case. Return evidence JSON only.

## Task Prompt

${variant.prompt}

## Required Evidence JSON

Fill \`evidence-template.json\` with the actual result shape:

- \`files_read\`
- \`files_changed\`
- \`commands_run\`
- \`final_answer\`
- \`observed_output\`
- \`expected_behavior\`
- \`failure_reasons\`
`;
}

function buildEvidenceTemplate({ skill, variant }) {
  return {
    id: variant.id,
    skill,
    variant: variant.id.endsWith("A") ? "baseline_without_skill" : "with_skill",
    status: "not_run",
    files_read: [],
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
    console.error("Usage: node tests/runner/skill/eval-skill.mjs prepare <skill> <case-id> [run-id]");
    console.error("   or: node tests/runner/skill/eval-skill.mjs all <skill> [run-id]");
    process.exit(1);
  }

  const result =
    command === "all"
      ? await prepareAllRuns({ skill, runId: caseId })
      : await prepareRun({ skill, caseId, runId });
  console.log(JSON.stringify(result, null, 2));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

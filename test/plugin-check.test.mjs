import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectProjectIssues,
  parseSkillFrontmatter,
  validateClaudeMarketplace,
  validateSkillFile,
} from "../scripts/check-plugin.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("current plugin package passes all release checks", async () => {
  const issues = await collectProjectIssues(repoRoot);

  assert.deepEqual(issues, []);
});

test("Claude marketplace requires an owner with name and email", () => {
  const issues = validateClaudeMarketplace({
    name: "wingman-marketplace",
    plugins: [
      {
        name: "wingman",
        version: "1.0.0",
        source: "./",
        description: "Cross-platform AI engineering plugin.",
      },
    ],
  });

  assert.deepEqual(issues, [
    ".claude-plugin/marketplace.json: owner.name is required",
    ".claude-plugin/marketplace.json: owner.email is required",
  ]);
});

test("skill frontmatter parser returns the YAML block and body", () => {
  const parsed = parseSkillFrontmatter(`---
name: memory-load
description: Use when restoring project context before implementation
---

# Memory Load
`);

  assert.equal(parsed.frontmatter.name, "memory-load");
  assert.equal(
    parsed.frontmatter.description,
    "Use when restoring project context before implementation",
  );
  assert.match(parsed.body, /# Memory Load/);
});

test("skill files require trigger-focused frontmatter", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wingman-skill-"));
  const skillPath = path.join(root, "SKILL.md");

  await writeFile(
    skillPath,
    `---
name: Bad Skill!
description: Writes a summary of what this workflow does
---

# Bad Skill
`,
  );

  try {
    const issues = await validateSkillFile(skillPath, root);

    assert.deepEqual(issues, [
      "SKILL.md: frontmatter name must use lowercase letters, numbers, and hyphens",
      'SKILL.md: description should start with "Use when"',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("using-wingman documents every packaged skill", async () => {
  const skillsRoot = path.join(repoRoot, "skills");
  const skillNames = (
    await readdir(skillsRoot, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const usingWingman = await readFile(
    path.join(skillsRoot, "using-wingman", "SKILL.md"),
    "utf8",
  );

  for (const skillName of skillNames) {
    assert.match(
      usingWingman,
      new RegExp(`\`${skillName}\``),
      `using-wingman should mention ${skillName}`,
    );
  }
});

test("explicit workflow skills stay gated to direct user requests", async () => {
  const explicitSkills = ["memory-setup", "refactor", "refactor-types"];

  for (const skillName of explicitSkills) {
    const content = await readFile(
      path.join(repoRoot, "skills", skillName, "SKILL.md"),
      "utf8",
    );
    const { frontmatter, body } = parseSkillFrontmatter(content);

    assert.match(
      frontmatter.description,
      /explicitly|explicit/i,
      `${skillName} description should require explicit invocation`,
    );
    assert.match(
      body,
      /only .*directly|directly .*asks|explicit workflow/i,
      `${skillName} body should preserve direct-request gating`,
    );
  }
});

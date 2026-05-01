import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectProjectIssues,
  parseSkillFrontmatter,
  validateAliasCoverage,
  validateClaudeMarketplace,
  validateReadmeSkillCoverage,
  validateSkillFile,
  validateSkillTriggerContracts,
} from "../scripts/check-plugin.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("当前插件包通过全部发布前检查", async () => {
  const issues = await collectProjectIssues(repoRoot);

  assert.deepEqual(issues, []);
});

test("Claude marketplace 必须填写 owner.name 和 owner.email", () => {
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

test("skill frontmatter 解析器能拆出 YAML 区块和正文", () => {
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

test("skill 文件必须使用面向触发条件的 frontmatter", async () => {
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

test("using-wingman 必须说明所有已打包的 skill", async () => {
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

test("README 必须说明所有已打包的 skill", async () => {
  const issues = await validateReadmeSkillCoverage(repoRoot);

  assert.deepEqual(issues, []);
});

test("README 漏写已打包 skill 时必须报错", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wingman-readme-"));

  try {
    await mkdir(path.join(root, "skills", "memory-load"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Fixture\n");

    const issues = await validateReadmeSkillCoverage(root);

    assert.deepEqual(issues, [
      "README.md: should mention skill `memory-load`",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("斜杠别名必须映射到真实存在的 skill 契约", async () => {
  const issues = await validateAliasCoverage(repoRoot);

  assert.deepEqual(issues, []);
});

test("斜杠别名缺少 README 或 skill 说明时必须报错", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wingman-alias-"));

  try {
    await mkdir(path.join(root, "skills", "reuse-select"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Fixture\n");
    await writeFile(
      path.join(root, "skills", "reuse-select", "SKILL.md"),
      `---
name: reuse-select
description: Use when choosing reusable implementations
---

# Reuse Select
`,
    );

    const issues = await validateAliasCoverage(root, { "/reuse-select": "reuse-select" });

    assert.deepEqual(issues, [
      "README.md: should document alias /reuse-select",
      "skills/reuse-select/SKILL.md: should document alias /reuse-select",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("核心 skill 的触发契约必须保留在 skill 文本中", async () => {
  const issues = await validateSkillTriggerContracts(repoRoot);

  assert.deepEqual(issues, []);
});

test("skill 触发契约缺少关键触发语言时必须报错", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "wingman-trigger-"));

  try {
    await mkdir(path.join(root, "skills", "memory-load"), { recursive: true });
    await writeFile(
      path.join(root, "skills", "memory-load", "SKILL.md"),
      `---
name: memory-load
description: Use when loading memory
---

# Memory Load
`,
    );

    const issues = await validateSkillTriggerContracts(root, [
      { skill: "memory-load", phrases: ["non-trivial"] },
    ]);

    assert.deepEqual(issues, [
      'skills/memory-load/SKILL.md: trigger contract should mention "non-trivial"',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("显式 workflow skill 必须保持只在用户明确请求时触发", async () => {
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

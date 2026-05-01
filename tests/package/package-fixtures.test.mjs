import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { collectProjectIssues } from "../../scripts/check-plugin.mjs";
import { createPluginFixture } from "./helpers/plugin-fixture.mjs";

test("完整 package fixture 通过全部插件健康检查", async () => {
  const root = await createPluginFixture();

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture 缺少 Claude owner 时必须报错", async () => {
  const root = await createPluginFixture({
    claudeMarketplace: {
      owner: undefined,
    },
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      ".claude-plugin/marketplace.json: owner.name is required",
      ".claude-plugin/marketplace.json: owner.email is required",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture 缺少 skill 文件时必须报错", async () => {
  const root = await createPluginFixture({
    omitPaths: ["skills/memory-load/SKILL.md"],
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      "skills/memory-load/SKILL.md: file is required",
      "memory-load: skill file is required for trigger contract",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture manifest 路径失效时必须报错", async () => {
  const root = await createPluginFixture({
    codexPlugin: {
      interface: {
        composerIcon: "./assets/missing.svg",
        logo: "./assets/icon.svg",
      },
    },
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      ".codex-plugin/plugin.json: interface.composerIcon does not exist: assets/missing.svg",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture frontmatter 失效时必须报错", async () => {
  const root = await createPluginFixture({
    skillOverrides: {
      "memory-load": `---
name: Bad Skill!
description: Loads memory before work
---

# Memory Load
`,
    },
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      "skills/memory-load/SKILL.md: frontmatter name must use lowercase letters, numbers, and hyphens",
      'skills/memory-load/SKILL.md: description should start with "Use when"',
      'skills/memory-load/SKILL.md: trigger contract should mention "non-trivial"',
      'skills/memory-load/SKILL.md: trigger contract should mention "business logic"',
      'skills/memory-load/SKILL.md: trigger contract should mention "debugging"',
      'skills/memory-load/SKILL.md: trigger contract should mention "refactor"',
      'skills/memory-load/SKILL.md: trigger contract should mention "trivial"',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture 发布包缺少已链接 policy 文件时必须报错", async () => {
  const root = await createPluginFixture({
    packageJson: {
      files: [
        ".agents/",
        ".claude-plugin/",
        ".codex-plugin/",
        ".cursor-plugin/",
        "assets/",
        "hooks/",
        "skills/",
        "README.md",
        "LICENSE",
        "TERMS.md",
      ],
    },
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      "package.json: files should include linked policy file PRIVACY.md",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture 平台本地安装布局漂移时必须报错", async () => {
  const root = await createPluginFixture({
    cursorPlugin: {
      skills: "./cursor-skills/",
    },
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      ".cursor-plugin/plugin.json: skills path should be ./skills/ for shared local install layout",
      ".cursor-plugin/plugin.json: skills path does not exist: cursor-skills",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("完整 package fixture hook smoke test 失败时必须报错", async () => {
  const root = await createPluginFixture({
    fileOverrides: {
      "hooks/session-start": "#!/usr/bin/env sh\nexit 7\n",
    },
  });

  try {
    const issues = await collectProjectIssues(root);

    assert.deepEqual(issues, [
      "hooks/session-start: smoke test failed with exit code 7",
      "hooks/run-hook.cmd session-start: smoke test failed with exit code 7",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

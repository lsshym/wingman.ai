import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const defaultPackageJson = {
  name: "wingman",
  version: "1.0.0",
  description: "Cross-platform AI engineering plugin for execution, context, and reuse.",
};

const defaultClaudeMarketplace = {
  name: "wingman-marketplace",
  owner: {
    name: "keni",
    email: "keni@example.com",
  },
  plugins: [
    {
      name: "wingman",
      version: "1.0.0",
      source: "./",
      description: "Cross-platform AI engineering plugin for execution, context, and reuse.",
    },
  ],
};

const defaultPluginManifest = {
  name: "wingman",
  version: "1.0.0",
  description: "Cross-platform AI engineering plugin for execution, context, and reuse.",
  author: {
    name: "keni",
  },
};

const defaultCodexPlugin = {
  ...defaultPluginManifest,
  skills: "./skills/",
  interface: {
    displayName: "Wingman",
    composerIcon: "./assets/icon.svg",
    logo: "./assets/icon.svg",
  },
};

const defaultCursorPlugin = {
  ...defaultPluginManifest,
  skills: "./skills/",
  hooks: "./hooks/hooks-cursor.json",
};

const defaultCodexMarketplace = {
  name: "wingman-marketplace",
  interface: {
    displayName: "Wingman Marketplace",
  },
  plugins: [
    {
      name: "wingman",
      source: {
        source: "local",
        path: "./",
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL",
      },
      category: "Coding",
    },
  ],
};

const skillNames = [
  "align-contracts",
  "memory-load",
  "memory-setup",
  "memory-sync",
  "refactor",
  "refactor-types",
  "reuse-catalog",
  "reuse-select",
  "using-wingman",
];

export async function createPluginFixture(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "wingman-package-"));

  try {
    await writeJson(root, "package.json", merge(defaultPackageJson, options.packageJson));
    await writeJson(
      root,
      ".claude-plugin/marketplace.json",
      merge(defaultClaudeMarketplace, options.claudeMarketplace),
    );
    await writeJson(
      root,
      ".claude-plugin/plugin.json",
      merge(defaultPluginManifest, options.claudePlugin),
    );
    await writeJson(
      root,
      ".codex-plugin/plugin.json",
      merge(defaultCodexPlugin, options.codexPlugin),
    );
    await writeJson(
      root,
      ".cursor-plugin/plugin.json",
      merge(defaultCursorPlugin, options.cursorPlugin),
    );
    await writeJson(
      root,
      ".agents/plugins/marketplace.json",
      merge(defaultCodexMarketplace, options.codexMarketplace),
    );
    await writeJson(root, "hooks/hooks.json", {
      hooks: {
        SessionStart: [
          {
            command: "hooks/run-hook.cmd",
          },
        ],
      },
    });
    await writeJson(root, "hooks/hooks-cursor.json", {
      hooks: {
        sessionStart: [
          {
            command: "./hooks/session-start",
          },
        ],
      },
    });

    await writeText(root, "hooks/run-hook.cmd", "@echo off\n");
    await writeText(root, "hooks/session-start", "#!/usr/bin/env sh\nexit 0\n");
    await writeText(root, "assets/icon.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>\n");
    await writeText(root, "README.md", renderReadme());

    for (const skillName of skillNames) {
      await writeText(
        root,
        `skills/${skillName}/SKILL.md`,
        options.skillOverrides?.[skillName] ?? renderSkill(skillName),
      );
    }

    for (const rel of options.omitPaths ?? []) {
      await rm(path.join(root, rel), { recursive: true, force: true });
    }

    return root;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

function renderReadme() {
  return `# Wingman

- \`align-contracts\`
- \`memory-load\`
- \`memory-setup\`
- \`memory-sync\`
- \`refactor\`
- \`refactor-types\`
- \`reuse-catalog\`
- \`reuse-select\`
- \`using-wingman\`

Aliases: /reuse-catalog, /reuse-select, /memory-setup, /refactor, /refactor-types.
`;
}

function renderSkill(skillName) {
  const bodyBySkill = {
    "align-contracts": "Use when boundary, schema, type, or api meanings may drift. Do not use for pure formatting.\n",
    "memory-load": "Load memory for non-trivial work touching business logic, debugging, refactor, or existing behavior. Skip trivial tasks.\n",
    "memory-setup": "Use only when explicitly requested through /memory-setup. Do not use for ordinary work.\n",
    "memory-sync": "Use after meaningful work that records business rules and durable decisions.\n",
    refactor: "Use /refactor only when explicitly requested. Do not use for ordinary refactoring or direct code edits.\n",
    "refactor-types": "Use /refactor-types only when explicitly requested. Do not use for ordinary TypeScript fixes or direct type edits.\n",
    "reuse-catalog": "Use /reuse-catalog when recording exactly one reusable item into the registry.\n",
    "reuse-select": "Use /reuse-select to decide whether to reuse, extend, wrap, or create an implementation.\n",
    "using-wingman": skillNames.map((name) => `- \`${name}\``).join("\n"),
  };

  return `---
name: ${skillName}
description: Use when ${skillName} applies to a Wingman workflow
---

# ${titleCase(skillName)}

${bodyBySkill[skillName]}
`;
}

async function writeJson(root, rel, value) {
  await writeText(root, rel, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(root, rel, content) {
  const target = path.join(root, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

function merge(base, override) {
  if (override === undefined) return base;
  if (override === null || typeof override !== "object" || Array.isArray(override)) {
    return override;
  }

  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      delete result[key];
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base?.[key] !== null &&
      typeof base?.[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      result[key] = merge(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function titleCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

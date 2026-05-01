#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const requiredJsonFiles = [
  "package.json",
  ".claude-plugin/marketplace.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
  "hooks/hooks.json",
  "hooks/hooks-cursor.json",
];

const rootFromImport = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const requiredPackageFiles = [
  ".agents/",
  ".claude-plugin/",
  ".codex-plugin/",
  ".cursor-plugin/",
  "assets/",
  "hooks/",
  "skills/",
  "README.md",
  "LICENSE",
];

const defaultAliasMap = {
  "/reuse-catalog": "reuse-catalog",
  "/reuse-select": "reuse-select",
  "/memory-setup": "memory-setup",
  "/refactor": "refactor",
  "/refactor-types": "refactor-types",
};

const defaultSkillTriggerContracts = [
  {
    skill: "memory-load",
    phrases: ["non-trivial", "business logic", "debugging", "refactor", "trivial"],
  },
  {
    skill: "align-contracts",
    phrases: ["boundary", "schema", "type", "api", "pure formatting"],
  },
  {
    skill: "reuse-select",
    phrases: ["reuse", "extend", "wrap", "create", "/reuse-select"],
  },
  {
    skill: "reuse-catalog",
    phrases: ["recording", "registry", "exactly one", "/reuse-catalog"],
  },
  {
    skill: "memory-sync",
    phrases: ["meaningful work", "business rules", "durable"],
  },
  {
    skill: "memory-setup",
    phrases: ["explicitly", "ordinary work", "/memory-setup"],
  },
  {
    skill: "refactor",
    phrases: ["explicitly", "ordinary refactoring", "direct code edits"],
  },
  {
    skill: "refactor-types",
    phrases: ["explicitly", "ordinary typescript fixes", "direct type edits"],
  },
];

export function parseSkillFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content };
  }

  const frontmatter = {};
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2] };
}

export function validateClaudeMarketplace(manifest) {
  const issues = [];

  if (!isNonEmptyString(manifest?.name)) {
    issues.push(".claude-plugin/marketplace.json: name is required");
  }
  if (!isNonEmptyString(manifest?.owner?.name)) {
    issues.push(".claude-plugin/marketplace.json: owner.name is required");
  }
  if (!isNonEmptyString(manifest?.owner?.email)) {
    issues.push(".claude-plugin/marketplace.json: owner.email is required");
  }
  if (!Array.isArray(manifest?.plugins) || manifest.plugins.length === 0) {
    issues.push(".claude-plugin/marketplace.json: plugins must be a non-empty array");
    return issues;
  }

  manifest.plugins.forEach((plugin, index) => {
    const prefix = `.claude-plugin/marketplace.json: plugins[${index}]`;
    for (const key of ["name", "version", "source", "description"]) {
      if (!isNonEmptyString(plugin?.[key])) {
        issues.push(`${prefix}.${key} is required`);
      }
    }
  });

  return issues;
}

export async function validateSkillFile(skillPath, repoRoot) {
  const rel = relativePath(repoRoot, skillPath);
  const issues = [];
  const content = await readFile(skillPath, "utf8");
  const { frontmatter, body } = parseSkillFrontmatter(content);

  if (frontmatter == null) {
    return [`${rel}: missing YAML frontmatter block`];
  }

  let hasValidName = false;
  if (!isNonEmptyString(frontmatter.name)) {
    issues.push(`${rel}: frontmatter name is required`);
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(frontmatter.name)) {
    issues.push(
      `${rel}: frontmatter name must use lowercase letters, numbers, and hyphens`,
    );
  } else {
    hasValidName = true;
  }

  if (!isNonEmptyString(frontmatter.description)) {
    issues.push(`${rel}: frontmatter description is required`);
  } else if (!frontmatter.description.startsWith("Use when")) {
    issues.push(`${rel}: description should start with "Use when"`);
  }

  const directoryName = path.basename(path.dirname(skillPath));
  if (hasValidName && frontmatter.name !== directoryName) {
    issues.push(`${rel}: frontmatter name must match parent directory`);
  }

  if (!body.trim().startsWith("# ")) {
    issues.push(`${rel}: body should start with an H1 heading`);
  }

  return issues;
}

export async function collectProjectIssues(repoRoot = rootFromImport) {
  const issues = [];
  const json = {};

  for (const rel of requiredJsonFiles) {
    const absolute = path.join(repoRoot, rel);
    if (!(await exists(absolute))) {
      issues.push(`${rel}: file is required`);
      continue;
    }
    try {
      json[rel] = JSON.parse(await readFile(absolute, "utf8"));
    } catch (error) {
      issues.push(`${rel}: invalid JSON (${error.message})`);
    }
  }

  if (json[".claude-plugin/marketplace.json"]) {
    issues.push(
      ...validateClaudeMarketplace(json[".claude-plugin/marketplace.json"]),
    );
  }

  issues.push(...validatePluginManifest(".claude-plugin/plugin.json", json[".claude-plugin/plugin.json"]));
  issues.push(...validatePluginManifest(".codex-plugin/plugin.json", json[".codex-plugin/plugin.json"]));
  issues.push(...validatePluginManifest(".cursor-plugin/plugin.json", json[".cursor-plugin/plugin.json"]));
  issues.push(...validateCodexMarketplace(json[".agents/plugins/marketplace.json"]));
  issues.push(...validateCrossPlatformMetadata(json));
  issues.push(...(await validatePackageContents(repoRoot, json)));
  issues.push(...validateLocalInstallLayout(json));
  issues.push(...(await validateReferencedPaths(repoRoot, json)));
  issues.push(...(await validateSkills(repoRoot)));
  issues.push(...(await validateReadmeSkillCoverage(repoRoot)));
  issues.push(...(await validateAliasCoverage(repoRoot)));
  issues.push(...(await validateSkillTriggerContracts(repoRoot)));
  issues.push(...(await validateHookSmokeTests(repoRoot)));

  return issues;
}

export async function validatePackageContents(repoRoot, json) {
  const issues = [];
  const packageJson = json?.["package.json"];
  if (packageJson == null) return issues;

  if (!Array.isArray(packageJson.files) || packageJson.files.length === 0) {
    issues.push("package.json: files must be a non-empty array for packaging allowlist");
    return issues;
  }

  const normalizedFiles = new Set(packageJson.files.map(normalizePackageFile));
  for (const rel of requiredPackageFiles) {
    if (!normalizedFiles.has(rel)) {
      issues.push(`package.json: files should include ${rel}`);
      continue;
    }
    await requirePath(repoRoot, rel, issues, `package.json: packaged path ${rel}`);
  }

  for (const rel of collectLinkedPolicyFiles(json)) {
    if (!normalizedFiles.has(rel)) {
      issues.push(`package.json: files should include linked policy file ${rel}`);
      continue;
    }
    await requirePath(repoRoot, rel, issues, `package.json: packaged linked policy file ${rel}`);
  }

  return issues;
}

export function validateLocalInstallLayout(json) {
  const issues = [];

  requireExactJsonValue(
    json[".codex-plugin/plugin.json"]?.skills,
    "./skills/",
    ".codex-plugin/plugin.json: skills path",
    issues,
    "for shared local install layout",
  );
  requireExactJsonValue(
    json[".cursor-plugin/plugin.json"]?.skills,
    "./skills/",
    ".cursor-plugin/plugin.json: skills path",
    issues,
    "for shared local install layout",
  );
  requireExactJsonValue(
    json[".cursor-plugin/plugin.json"]?.hooks,
    "./hooks/hooks-cursor.json",
    ".cursor-plugin/plugin.json: hooks path",
    issues,
    "for local install layout",
  );

  const marketplacePlugin = json[".agents/plugins/marketplace.json"]?.plugins?.[0];
  requireExactJsonValue(
    marketplacePlugin?.source?.source,
    "local",
    ".agents/plugins/marketplace.json: plugins[0].source.source",
    issues,
    "for local install layout",
  );
  requireExactJsonValue(
    marketplacePlugin?.source?.path,
    "./",
    ".agents/plugins/marketplace.json: plugins[0].source.path",
    issues,
    "for local install layout",
  );

  return issues;
}

export async function validateHookSmokeTests(repoRoot) {
  const issues = [];

  await smokeHook(
    repoRoot,
    "hooks/session-start",
    ["hooks/session-start"],
    issues,
  );
  await smokeHook(
    repoRoot,
    "hooks/run-hook.cmd session-start",
    ["hooks/run-hook.cmd", "session-start"],
    issues,
  );

  return issues;
}

export async function validateReadmeSkillCoverage(repoRoot = rootFromImport) {
  const issues = [];
  const readmePath = path.join(repoRoot, "README.md");
  if (!(await exists(readmePath))) {
    return ["README.md: file is required"];
  }

  const readme = await readFile(readmePath, "utf8");
  const skillNames = await collectSkillNames(repoRoot);
  for (const skillName of skillNames) {
    if (!readme.includes(`\`${skillName}\``)) {
      issues.push(`README.md: should mention skill \`${skillName}\``);
    }
  }

  return issues;
}

export async function validateAliasCoverage(
  repoRoot = rootFromImport,
  aliasMap = defaultAliasMap,
) {
  const issues = [];
  const readmePath = path.join(repoRoot, "README.md");
  const readme = (await exists(readmePath)) ? await readFile(readmePath, "utf8") : "";

  for (const [alias, skillName] of Object.entries(aliasMap)) {
    const skillPath = path.join(repoRoot, "skills", skillName, "SKILL.md");
    if (!(await exists(skillPath))) {
      issues.push(`${alias}: target skill does not exist: ${skillName}`);
      continue;
    }

    if (!readme.includes(alias)) {
      issues.push(`README.md: should document alias ${alias}`);
    }

    const skillContent = await readFile(skillPath, "utf8");
    if (!skillContent.includes(alias)) {
      issues.push(`skills/${skillName}/SKILL.md: should document alias ${alias}`);
    }
  }

  return issues;
}

export async function validateSkillTriggerContracts(
  repoRoot = rootFromImport,
  contracts = defaultSkillTriggerContracts,
) {
  const issues = [];

  for (const contract of contracts) {
    const skillPath = path.join(repoRoot, "skills", contract.skill, "SKILL.md");
    if (!(await exists(skillPath))) {
      issues.push(`${contract.skill}: skill file is required for trigger contract`);
      continue;
    }

    const skillText = (await readFile(skillPath, "utf8")).toLowerCase();
    for (const phrase of contract.phrases) {
      if (!skillText.includes(phrase.toLowerCase())) {
        issues.push(
          `skills/${contract.skill}/SKILL.md: trigger contract should mention "${phrase}"`,
        );
      }
    }
  }

  return issues;
}

function validatePluginManifest(rel, manifest) {
  if (manifest == null) return [];

  const issues = [];
  for (const key of ["name", "description", "version"]) {
    if (!isNonEmptyString(manifest[key])) {
      issues.push(`${rel}: ${key} is required`);
    }
  }
  if (!isNonEmptyString(manifest.author?.name)) {
    issues.push(`${rel}: author.name is required`);
  }

  return issues;
}

function validateCodexMarketplace(manifest) {
  if (manifest == null) return [];

  const issues = [];
  if (!isNonEmptyString(manifest.name)) {
    issues.push(".agents/plugins/marketplace.json: name is required");
  }
  if (!isNonEmptyString(manifest.interface?.displayName)) {
    issues.push(".agents/plugins/marketplace.json: interface.displayName is required");
  }
  if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
    issues.push(".agents/plugins/marketplace.json: plugins must be a non-empty array");
    return issues;
  }

  manifest.plugins.forEach((plugin, index) => {
    const prefix = `.agents/plugins/marketplace.json: plugins[${index}]`;
    if (!isNonEmptyString(plugin?.name)) issues.push(`${prefix}.name is required`);
    if (plugin?.source?.source !== "local") {
      issues.push(`${prefix}.source.source must be "local"`);
    }
    if (!isNonEmptyString(plugin?.source?.path)) {
      issues.push(`${prefix}.source.path is required`);
    }
    if (!isNonEmptyString(plugin?.policy?.installation)) {
      issues.push(`${prefix}.policy.installation is required`);
    }
    if (!isNonEmptyString(plugin?.policy?.authentication)) {
      issues.push(`${prefix}.policy.authentication is required`);
    }
    if (!isNonEmptyString(plugin?.category)) {
      issues.push(`${prefix}.category is required`);
    }
  });

  return issues;
}

function validateCrossPlatformMetadata(json) {
  const issues = [];
  const packageJson = json["package.json"];
  const manifests = [
    [".claude-plugin/plugin.json", json[".claude-plugin/plugin.json"]],
    [".codex-plugin/plugin.json", json[".codex-plugin/plugin.json"]],
    [".cursor-plugin/plugin.json", json[".cursor-plugin/plugin.json"]],
  ];

  for (const [rel, manifest] of manifests) {
    if (packageJson?.name && manifest?.name && manifest.name !== packageJson.name) {
      issues.push(`${rel}: name must match package.json`);
    }
    if (
      packageJson?.version &&
      manifest?.version &&
      manifest.version !== packageJson.version
    ) {
      issues.push(`${rel}: version must match package.json`);
    }
  }

  const claudeMarketplacePlugin =
    json[".claude-plugin/marketplace.json"]?.plugins?.[0];
  if (
    packageJson?.name &&
    claudeMarketplacePlugin?.name &&
    claudeMarketplacePlugin.name !== packageJson.name
  ) {
    issues.push(".claude-plugin/marketplace.json: plugin name must match package.json");
  }
  if (
    packageJson?.version &&
    claudeMarketplacePlugin?.version &&
    claudeMarketplacePlugin.version !== packageJson.version
  ) {
    issues.push(
      ".claude-plugin/marketplace.json: plugin version must match package.json",
    );
  }

  return issues;
}

async function validateReferencedPaths(repoRoot, json) {
  const issues = [];

  await requirePath(repoRoot, "skills", issues, ".codex-plugin/plugin.json: skills path");
  await requirePath(repoRoot, "skills", issues, ".cursor-plugin/plugin.json: skills path");
  await requireJsonPath(repoRoot, json[".codex-plugin/plugin.json"]?.skills, issues, ".codex-plugin/plugin.json: skills path");
  await requireJsonPath(repoRoot, json[".cursor-plugin/plugin.json"]?.skills, issues, ".cursor-plugin/plugin.json: skills path");
  await requireJsonPath(repoRoot, json[".cursor-plugin/plugin.json"]?.hooks, issues, ".cursor-plugin/plugin.json: hooks path");
  await requireJsonPath(repoRoot, json[".codex-plugin/plugin.json"]?.interface?.composerIcon, issues, ".codex-plugin/plugin.json: interface.composerIcon");
  await requireJsonPath(repoRoot, json[".codex-plugin/plugin.json"]?.interface?.logo, issues, ".codex-plugin/plugin.json: interface.logo");

  const cursorHook = json["hooks/hooks-cursor.json"]?.hooks?.sessionStart?.[0]?.command;
  await requireJsonPath(repoRoot, cursorHook, issues, "hooks/hooks-cursor.json: sessionStart command");
  await requirePath(repoRoot, "hooks/run-hook.cmd", issues, "hooks/hooks.json: SessionStart command");

  return issues;
}

async function validateSkills(repoRoot) {
  const skillsRoot = path.join(repoRoot, "skills");
  const issues = [];
  if (!(await exists(skillsRoot))) {
    return ["skills: directory is required"];
  }

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skillDirs = entries.filter((entry) => entry.isDirectory());
  if (skillDirs.length === 0) {
    return ["skills: at least one skill directory is required"];
  }

  for (const dir of skillDirs) {
    const skillPath = path.join(skillsRoot, dir.name, "SKILL.md");
    if (!(await exists(skillPath))) {
      issues.push(`skills/${dir.name}/SKILL.md: file is required`);
      continue;
    }
    issues.push(...(await validateSkillFile(skillPath, repoRoot)));
  }

  return issues;
}

async function collectSkillNames(repoRoot) {
  const skillsRoot = path.join(repoRoot, "skills");
  if (!(await exists(skillsRoot))) return [];

  const entries = await readdir(skillsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function requireJsonPath(repoRoot, value, issues, label) {
  if (!isNonEmptyString(value)) {
    issues.push(`${label} is required`);
    return;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) return;

  await requirePath(repoRoot, normalizeRelativePath(value), issues, label);
}

function requireExactJsonValue(value, expected, label, issues, reason) {
  if (value !== expected) {
    issues.push(`${label} should be ${expected} ${reason}`);
  }
}

async function requirePath(repoRoot, rel, issues, label) {
  const absolute = path.join(repoRoot, rel);
  if (!(await exists(absolute))) {
    issues.push(`${label} does not exist: ${rel}`);
  }
}

function normalizeRelativePath(value) {
  return value.replace(/^\.\//, "").replace(/\/$/, "");
}

function collectLinkedPolicyFiles(json) {
  const links = Object.values(json ?? {}).flatMap((manifest) => [
    manifest?.privacyPolicyURL,
    manifest?.termsOfServiceURL,
    manifest?.interface?.privacyPolicyURL,
    manifest?.interface?.termsOfServiceURL,
  ]);
  const files = new Set();

  for (const link of links) {
    const rel = policyFileFromUrl(link);
    if (rel) files.add(rel);
  }

  return [...files].sort();
}

function policyFileFromUrl(value) {
  if (!isNonEmptyString(value)) return null;
  const match = value.match(/\/([^/?#]+\.md)(?:[?#].*)?$/i);
  return match?.[1] ?? null;
}

function normalizePackageFile(value) {
  const normalized = value.replace(/^\.\//, "");
  if (requiredPackageFiles.includes(`${normalized}/`)) {
    return `${normalized}/`;
  }
  return normalized;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function exists(absolute) {
  try {
    await access(absolute);
    return true;
  } catch {
    return false;
  }
}

function relativePath(repoRoot, absolute) {
  return path.relative(repoRoot, absolute).split(path.sep).join("/");
}

async function smokeHook(repoRoot, label, args, issues) {
  try {
    const { stdout } = await execFileAsync("bash", args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        WINGMAN_HOOK_SMOKE_TEST: "1",
      },
      maxBuffer: 1024 * 1024,
      timeout: 5000,
    });
    const parsed = JSON.parse(stdout);
    const context = extractHookContext(parsed);
    if (!context.includes("Wingman")) {
      issues.push(`${label}: smoke test output should include Wingman context`);
    }
  } catch (error) {
    if (typeof error?.code === "number") {
      issues.push(`${label}: smoke test failed with exit code ${error.code}`);
    } else if (error instanceof SyntaxError) {
      issues.push(`${label}: smoke test did not return valid JSON`);
    } else {
      issues.push(`${label}: smoke test failed (${error.message})`);
    }
  }
}

function extractHookContext(output) {
  return String(
    output?.additionalContext ??
      output?.additional_context ??
      output?.hookSpecificOutput?.additionalContext ??
      "",
  );
}

async function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : rootFromImport;
  const issues = await collectProjectIssues(root);

  if (issues.length > 0) {
    console.error(`Plugin checks failed with ${issues.length} issue(s):`);
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Plugin checks passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

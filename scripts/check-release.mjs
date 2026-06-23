#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginName = "wingman";
const codexMarketplaceName = "wingman-marketplace";
const codexGitUrl = "https://github.com/lsshym/wingman.ai.git";
const codexGitRef = "main";

const requiredJsonFiles = [
  "package.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  "gemini-extension.json",
];

const requiredReleaseFiles = [
  "README.md",
  "GEMINI.md",
  "LICENSE",
  "assets/icon.svg",
];

const issues = [];
const warnings = [];
const checkedScopes = [
  "package.json 的最小工具入口：name、version、type、check:release",
  "Codex / Cursor / Claude / Gemini 的插件 manifest 基础信息与版本一致性",
  "Codex Git marketplace：marketplace entry 指向本仓 Git plugin root",
  "Claude marketplace 是否包含 wingman 插件条目",
  "Gemini extension 是否声明 contextFileName 并指向 GEMINI.md",
  "manifest 中声明的 skills、hooks、icon/logo 路径是否真实存在",
  "skills/*/SKILL.md 的名称、frontmatter、Use when 描述和 H1 结构",
  "发布必备材料：README、GEMINI.md、LICENSE、assets/icon.svg",
  "Codex 分发不再提交 plugins/wingman 生成副本",
];

main().catch((error) => {
  console.error(`发布前检查异常：${error.stack || error.message}`);
  process.exit(1);
});

async function main() {
  const json = {};

  for (const rel of requiredJsonFiles) {
    json[rel] = await readJson(rel);
  }

  await checkRequiredFiles();
  checkPackage(json["package.json"]);
  checkPlatformManifests(json);
  checkCodexGitMarketplace(json[".agents/plugins/marketplace.json"]);
  checkClaudeMarketplace(json[".claude-plugin/marketplace.json"], json["package.json"]);
  checkGeminiExtension(json["gemini-extension.json"], json["package.json"]);
  await checkSkillFiles("skills");
  await checkManifestPaths(json);
  await checkNoGeneratedCodexPayload();

  printResults();
}

function checkGeminiExtension(extension, pkg) {
  if (!extension) return;
  requireString("gemini-extension.json", extension, "name", pluginName);
  requireString("gemini-extension.json", extension, "version", pkg?.version);
  requireString("gemini-extension.json", extension, "description");
  requireString("gemini-extension.json", extension, "contextFileName", "GEMINI.md");
}

async function readJson(rel) {
  const raw = await readRequiredText(rel);
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(rel, `invalid JSON: ${error.message}`);
    return null;
  }
}

async function readRequiredText(rel) {
  try {
    return await readFile(path.join(repoRoot, rel), "utf8");
  } catch {
    fail(rel, "required file is missing");
    return "";
  }
}

async function checkRequiredFiles() {
  for (const rel of requiredReleaseFiles) {
    if (!(await exists(path.join(repoRoot, rel)))) {
      fail(rel, "required release file is missing");
    }
  }
}

function checkPackage(pkg) {
  if (!pkg) return;
  requireString("package.json", pkg, "name", pluginName);
  requireString("package.json", pkg, "version");
  requireString("package.json", pkg, "type", "module");

  const scripts = pkg.scripts ?? {};
  if (scripts["check:release"] !== "node scripts/check-release.mjs") {
    fail("package.json", 'scripts.check:release must be "node scripts/check-release.mjs"');
  }
  if (Object.hasOwn(scripts, "prepare:codex-local")) {
    fail("package.json", "scripts.prepare:codex-local must be removed; Codex installs from the Git marketplace entry");
  }
}

function checkPlatformManifests(json) {
  const pkg = json["package.json"];
  for (const rel of [
    ".codex-plugin/plugin.json",
    ".cursor-plugin/plugin.json",
    ".claude-plugin/plugin.json",
  ]) {
    const manifest = json[rel];
    if (!manifest) continue;
    requireString(rel, manifest, "name", pluginName);
    requireString(rel, manifest, "version", pkg?.version);
    requireString(rel, manifest, "description", pkg?.description);
    requireString(rel, manifest, "homepage");
    requireString(rel, manifest, "repository");
    requireString(rel, manifest, "license", pkg?.license);
    requireObject(rel, manifest, "author");
  }

  const codex = json[".codex-plugin/plugin.json"];
  if (codex) {
    requireString(".codex-plugin/plugin.json", codex, "skills", "./skills/");
    const ui = codex.interface;
    requireObject(".codex-plugin/plugin.json", codex, "interface");
    if (ui) {
      for (const key of [
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "websiteURL",
        "privacyPolicyURL",
        "termsOfServiceURL",
        "brandColor",
        "composerIcon",
        "logo",
      ]) {
        requireString(".codex-plugin/plugin.json interface", ui, key);
      }
      if (!Array.isArray(ui.capabilities) || ui.capabilities.length === 0) {
        fail(".codex-plugin/plugin.json interface", "capabilities must be a non-empty array");
      }
      if (!Array.isArray(ui.defaultPrompt) || ui.defaultPrompt.length === 0) {
        fail(".codex-plugin/plugin.json interface", "defaultPrompt must be a non-empty array");
      }
    }
  }

  const cursor = json[".cursor-plugin/plugin.json"];
  if (cursor) {
    requireString(".cursor-plugin/plugin.json", cursor, "skills", "./skills/");
    requireString(".cursor-plugin/plugin.json", cursor, "hooks", "./hooks/hooks-cursor.json");
  }
}

function checkCodexGitMarketplace(marketplace) {
  if (!marketplace) return;
  requireString(".agents/plugins/marketplace.json", marketplace, "name", codexMarketplaceName);
  requireObject(".agents/plugins/marketplace.json", marketplace, "interface");
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    fail(".agents/plugins/marketplace.json", "plugins must be a non-empty array");
    return;
  }

  const entry = marketplace.plugins.find((plugin) => plugin?.name === pluginName);
  if (!entry) {
    fail(".agents/plugins/marketplace.json", `plugins must include ${pluginName}`);
    return;
  }
  if (entry.source?.source !== "url") {
    fail(".agents/plugins/marketplace.json", "wingman source.source must be url for Git-backed install support");
  }
  if (entry.source?.url !== codexGitUrl) {
    fail(".agents/plugins/marketplace.json", `wingman source.url must be ${codexGitUrl}`);
  }
  if (entry.source?.ref !== codexGitRef) {
    fail(".agents/plugins/marketplace.json", `wingman source.ref must be ${codexGitRef}`);
  }
  if (entry.policy?.installation !== "AVAILABLE") {
    fail(".agents/plugins/marketplace.json", "wingman policy.installation must be AVAILABLE");
  }
  if (entry.policy?.authentication !== "ON_INSTALL") {
    fail(".agents/plugins/marketplace.json", "wingman policy.authentication must be ON_INSTALL");
  }
  if (entry.category !== "Coding") {
    fail(".agents/plugins/marketplace.json", "wingman category must be Coding");
  }
}

function checkClaudeMarketplace(marketplace, pkg) {
  if (!marketplace) return;
  requireString(".claude-plugin/marketplace.json", marketplace, "name");
  requireObject(".claude-plugin/marketplace.json", marketplace, "owner");
  if (!marketplace.owner?.email) {
    fail(".claude-plugin/marketplace.json", "owner.email is required");
  }
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    fail(".claude-plugin/marketplace.json", "plugins must be a non-empty array");
    return;
  }
  const entry = marketplace.plugins.find((plugin) => plugin?.name === pluginName);
  if (!entry) {
    fail(".claude-plugin/marketplace.json", `plugins must include ${pluginName}`);
    return;
  }
  requireString(".claude-plugin/marketplace.json wingman", entry, "version", pkg?.version);
  requireString(".claude-plugin/marketplace.json wingman", entry, "description", pkg?.description);
  if (entry.source !== "./") {
    fail(".claude-plugin/marketplace.json wingman", "source must be ./ for repository plugin root");
  }
}

async function checkSkillFiles(rootRel) {
  const skillsRoot = path.join(repoRoot, rootRel);
  if (!(await exists(skillsRoot))) {
    fail(rootRel, "skills directory is required");
    return;
  }

  const skillDirs = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (skillDirs.length === 0) {
    fail(rootRel, "at least one skill is required");
  }

  for (const dir of skillDirs) {
    const rel = path.join(rootRel, dir, "SKILL.md");
    const content = await readRequiredText(rel);
    const parsed = parseFrontmatter(content);
    if (!parsed.frontmatter) {
      fail(rel, "missing YAML frontmatter");
      continue;
    }
    if (parsed.frontmatter.name !== dir) {
      fail(rel, "frontmatter name must match the skill directory");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.frontmatter.name ?? "")) {
      fail(rel, "frontmatter name must use lowercase hyphen-case");
    }
    const description = parsed.frontmatter.description ?? "";
    if (!description.startsWith("Use when")) {
      fail(rel, 'frontmatter description must start with "Use when"');
    }
    if (description.length < 40) {
      fail(rel, "frontmatter description is too short to define a reliable trigger");
    }
    if (!parsed.body.trimStart().startsWith("# ")) {
      fail(rel, "body must start with an H1 heading");
    }
  }
}

async function checkManifestPaths(json) {
  const checks = [
    [".codex-plugin/plugin.json", json[".codex-plugin/plugin.json"]?.skills],
    [".codex-plugin/plugin.json", json[".codex-plugin/plugin.json"]?.interface?.composerIcon],
    [".codex-plugin/plugin.json", json[".codex-plugin/plugin.json"]?.interface?.logo],
    [".cursor-plugin/plugin.json", json[".cursor-plugin/plugin.json"]?.skills],
    [".cursor-plugin/plugin.json", json[".cursor-plugin/plugin.json"]?.hooks],
  ];

  for (const [label, relPath] of checks) {
    if (!relPath) continue;
    if (!relPath.startsWith("./")) {
      fail(label, `path must be relative and start with ./: ${relPath}`);
      continue;
    }
    const resolved = path.resolve(repoRoot, relPath);
    if (!isInsideRepo(resolved)) {
      fail(label, `referenced path must not escape the repository root: ${relPath}`);
      continue;
    }
    if (!(await exists(resolved))) {
      fail(label, `referenced path does not exist: ${relPath}`);
    }
  }
}

async function checkNoGeneratedCodexPayload() {
  if (await exists(path.join(repoRoot, "plugins", pluginName))) {
    fail("plugins/wingman", "generated Codex payload must not be committed; Codex installs from the Git marketplace entry");
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  const frontmatter = {};
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
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

function requireString(label, object, key, expected) {
  const value = object?.[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(label, `${key} is required`);
    return;
  }
  if (expected !== undefined && value !== expected) {
    fail(label, `${key} must be ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
  }
}

function requireObject(label, object, key) {
  const value = object?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label, `${key} is required`);
  }
}

function fail(scope, message) {
  issues.push({ scope, message });
}

function warn(scope, message) {
  warnings.push({ scope, message });
}

async function exists(absPath) {
  try {
    await stat(absPath);
    return true;
  } catch {
    return false;
  }
}

function relative(absPath) {
  return path.relative(repoRoot, absPath) || ".";
}

function isInsideRepo(absPath) {
  const relativePath = path.relative(repoRoot, absPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function printResults() {
  console.log("Wingman 发布前规范检查");
  console.log("");
  console.log("检查范围：");
  for (const scope of checkedScopes) {
    console.log(`- ${scope}`);
  }
  console.log("");

  if (issues.length === 0) {
    console.log("结果：通过");
    if (warnings.length > 0) {
      console.log("\n警告：");
      for (const item of warnings) {
        console.log(`- ${item.scope}: ${item.message}`);
      }
    }
    return;
  }

  console.error(`结果：失败，共 ${issues.length} 个问题：`);
  for (const item of issues) {
    console.error(`- ${item.scope}: ${item.message}`);
  }
  if (warnings.length > 0) {
    console.error("\n警告：");
    for (const item of warnings) {
      console.error(`- ${item.scope}: ${item.message}`);
    }
  }
  process.exit(1);
}

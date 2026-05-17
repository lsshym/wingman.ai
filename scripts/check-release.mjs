#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginName = "wingman";
const issues = [];
const warnings = [];

const requiredJsonFiles = [
  "package.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "hooks/hooks.json",
  "hooks/hooks-cursor.json",
];

const requiredFiles = [
  "README.md",
  "assets/icon.svg",
  "hooks/session-start",
  "hooks/run-hook.cmd",
];

main().catch((error) => {
  console.error(`Release check failed unexpectedly: ${error.stack || error.message}`);
  process.exit(1);
});

async function main() {
  const json = {};

  for (const rel of requiredJsonFiles) {
    json[rel] = await readJson(rel);
  }

  await checkRequiredFiles();
  await checkSkills();
  checkPackage(json["package.json"]);
  checkPluginManifests(json);
  checkHookConfigs(json);

  printResults();
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
  for (const rel of requiredFiles) {
    try {
      await access(path.join(repoRoot, rel));
    } catch {
      fail(rel, "required release file is missing");
    }
  }
}

async function checkSkills() {
  const skillsRoot = path.join(repoRoot, "skills");
  let entries = [];
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    fail("skills", "skills directory is required");
    return;
  }

  const skillDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (skillDirs.length === 0) {
    fail("skills", "at least one skill is required");
  }

  for (const dir of skillDirs) {
    const rel = `skills/${dir}/SKILL.md`;
    const content = await readRequiredText(rel);
    if (!content.startsWith(`# `)) {
      warn(rel, "skill does not start with an H1 heading yet");
    }
  }
}

function checkPackage(pkg) {
  if (!pkg) return;
  requireString("package.json", pkg, "name", pluginName);
  requireString("package.json", pkg, "version");
  requireString("package.json", pkg, "type", "module");
  requireString("package.json", pkg, "description");
  requireString("package.json", pkg, "license");

  if (pkg.scripts?.["check:release"] !== "node scripts/check-release.mjs") {
    fail("package.json", 'scripts.check:release must be "node scripts/check-release.mjs"');
  }
}

function checkPluginManifests(json) {
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
  }

  const codex = json[".codex-plugin/plugin.json"];
  if (codex) {
    requireString(".codex-plugin/plugin.json", codex, "skills", "./skills/");
    const ui = codex.interface;
    requireObject(".codex-plugin/plugin.json", codex, "interface");
    if (ui) {
      requireString(".codex-plugin/plugin.json interface", ui, "displayName");
      requireString(".codex-plugin/plugin.json interface", ui, "shortDescription");
      requireString(".codex-plugin/plugin.json interface", ui, "brandColor");
      requireString(".codex-plugin/plugin.json interface", ui, "composerIcon", "./assets/icon.svg");
      requireString(".codex-plugin/plugin.json interface", ui, "logo", "./assets/icon.svg");
    }
  }

  const cursor = json[".cursor-plugin/plugin.json"];
  if (cursor) {
    requireString(".cursor-plugin/plugin.json", cursor, "skills", "./skills/");
    requireString(".cursor-plugin/plugin.json", cursor, "hooks", "./hooks/hooks-cursor.json");
  }

  const claudeMarketplace = json[".claude-plugin/marketplace.json"];
  if (claudeMarketplace) {
    requireObject(".claude-plugin/marketplace.json", claudeMarketplace, "owner");
    const entry = claudeMarketplace.plugins?.find((plugin) => plugin?.name === pluginName);
    if (!entry) {
      fail(".claude-plugin/marketplace.json", `plugins must include ${pluginName}`);
    } else {
      requireString(".claude-plugin/marketplace.json wingman", entry, "version", pkg?.version);
      requireString(".claude-plugin/marketplace.json wingman", entry, "description", pkg?.description);
      requireString(".claude-plugin/marketplace.json wingman", entry, "source", "./");
    }
  }
}

function checkHookConfigs(json) {
  const claudeHooks = json["hooks/hooks.json"];
  if (!claudeHooks?.hooks?.SessionStart) {
    fail("hooks/hooks.json", "SessionStart hook is required");
  }

  const cursorHooks = json["hooks/hooks-cursor.json"];
  if (!cursorHooks?.hooks?.sessionStart) {
    fail("hooks/hooks-cursor.json", "sessionStart hook is required");
  }
}

function requireString(scope, object, key, expected) {
  const value = object?.[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(scope, `${key} must be a non-empty string`);
    return;
  }
  if (expected !== undefined && value !== expected) {
    fail(scope, `${key} must be ${JSON.stringify(expected)}`);
  }
}

function requireObject(scope, object, key) {
  const value = object?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(scope, `${key} must be an object`);
  }
}

function fail(scope, message) {
  issues.push(`${scope}: ${message}`);
}

function warn(scope, message) {
  warnings.push(`${scope}: ${message}`);
}

function printResults() {
  for (const warning of warnings) {
    console.warn(`WARN ${warning}`);
  }

  if (issues.length > 0) {
    console.error("Release check found issues:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("Release check passed.");
}

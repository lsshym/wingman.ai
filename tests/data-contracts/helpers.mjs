import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
export const cliPath = path.join(
  repoRoot,
  "skills",
  "data-contracts",
  "scripts",
  "data-contracts.mjs",
);

export function fixture(name) {
  return path.join(repoRoot, "tests", "fixtures", "data-contracts", name);
}

export function runCli(args, stdin = "", { timeout = 5_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeout);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
    child.stdin.end(stdin);
  });
}

export async function runRequest(command, request, extraArgs = []) {
  return runCli(
    [command, "--request", "-", ...extraArgs],
    JSON.stringify(request),
  );
}

export function parseJson(result) {
  return JSON.parse(result.stdout);
}

export async function makeFiles(testContext, files) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "data-contracts-test-"));
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const result = {};
  for (const [name, content] of Object.entries(files)) {
    const location = path.join(directory, name);
    await writeFile(location, content);
    result[name] = location;
  }
  return result;
}

export function schema(properties, required = Object.keys(properties), additionalProperties = true) {
  return JSON.stringify({
    type: "object",
    required,
    properties,
    additionalProperties,
  });
}

export function evidence(id, filePath, kind = "json-schema", selector) {
  return {
    id,
    path: filePath,
    kind,
    ...(selector ? { selector } : {}),
  };
}

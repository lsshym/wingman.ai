#!/usr/bin/env node

import process from "node:process";
import { helpText, parseCli } from "./lib/cli.mjs";
import { buildResourceLimitEnvelope, runCommand } from "./lib/commands.mjs";
import { TOOL_VERSION } from "./lib/model.mjs";
import {
  buildErrorEnvelope,
  exitCodeFor,
  serializePayload,
} from "./lib/report.mjs";

const state = {
  command: "unknown",
  format: "json",
  detail: false,
};

main().catch(handleFailure);

async function main() {
  const parsed = parseCli(process.argv.slice(2));
  if (parsed.version) {
    process.stdout.write(`${TOOL_VERSION}\n`);
    return;
  }
  if (parsed.help) {
    process.stdout.write(helpText(parsed.command));
    return;
  }

  state.command = parsed.command;
  state.format = parsed.options.format;
  state.detail = parsed.options.detail === true;
  finish(await runCommand(parsed.command, parsed.options));
}

function handleFailure(error) {
  const command = error.command || state.command;
  if (error.limitError) {
    finish(buildResourceLimitEnvelope(command, error));
    return;
  }

  const payload = buildErrorEnvelope(command, error);
  const { output } = serializePayload(payload, {
    format: state.format,
    detail: state.detail,
  });
  process.stdout.write(output);
  if (!error.inputError && error.stack) process.stderr.write(`${error.stack}\n`);
  process.exitCode = error.inputError ? 2 : 3;
}

function finish(payload) {
  const serialized = serializePayload(payload, {
    format: state.format,
    detail: state.detail || state.command === "extract",
  });
  process.stdout.write(serialized.output);
  process.exitCode = exitCodeFor(
    serialized.payload.workflowStatus || serialized.payload.status,
  );
}

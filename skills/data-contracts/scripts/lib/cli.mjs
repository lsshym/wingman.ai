import {
  INPUT_KINDS,
  inputError,
  OUTPUT_FORMATS,
  TOOL_VERSION,
} from "./model.mjs";
import { limitsForHelp } from "./report.mjs";

const COMMAND_OPTIONS = {
  check: new Set(["request", "format", "detail"]),
  analyze: new Set(["request", "format", "detail"]),
  compare: new Set(["request", "format", "detail"]),
  extract: new Set(["input", "kind", "selector", "format"]),
  scan: new Set(["diff", "format"]),
};
const PUBLIC_COMMANDS = ["check", "compare", "extract", "scan"];

export function parseCli(argv) {
  if (argv.length === 0) {
    throw inputError("Command is required.", {
      kind: "missing_command",
      allowedValues: PUBLIC_COMMANDS,
      nextStep: "Run data-contracts.mjs --help for examples.",
    });
  }
  if (argv.length === 1 && argv[0] === "--version") return { version: true };
  if (["--help", "-h", "help"].includes(argv[0])) return { help: true };

  const command = argv[0];
  if (!Object.hasOwn(COMMAND_OPTIONS, command)) {
    throw inputError(`Unknown command: ${command}.`, {
      kind: "unknown_command",
      allowedValues: PUBLIC_COMMANDS,
      nextStep: "Use check for the normal Skill workflow.",
    });
  }

  try {
    return parseKnownCommand(command, argv.slice(1));
  } catch (error) {
    error.command = command;
    throw error;
  }
}

export function helpText(command) {
  const limits = limitsForHelp();
  const runtime = `Runtime:
  Node.js 18 or newer. No npm install or third-party packages are required.
`;
  if (command === "check") {
    return `data-contracts check

Usage:
  data-contracts.mjs check --request <file|-> [--format json|markdown] [--detail]

${runtime}
Minimal request:
  {
    "schemaVersion": 1,
    "boundaryId": "api-user-to-user-view",
    "sources": [{"id":"api","path":"openapi.json","kind":"openapi","selector":"User"}],
    "receivers": [{"id":"view","path":"src/user.ts","kind":"typescript","selector":"UserView"}],
    "diffs": [{"id":"change","path":"change.diff"}]
  }

Run once without decision to discover requiredDecisions. Then add:
  {
    "decision": {
      "semantic": {"status":"resolved","authorityRefs":[{"kind":"evidence","id":"api"}]},
      "resolutions": [],
      "binding": {"mode":"direct"}
    }
  }

Relative evidence and local-authority paths resolve from the request file directory; stdin requests use the current directory.
check reports structuralStatus, decisionStatus, and workflowStatus. It never executes or certifies project verification.
`;
  }
  if (command === "analyze") {
    return `data-contracts analyze (deprecated compatibility alias)

Usage:
  data-contracts.mjs analyze --request <file|-> [--format json|markdown] [--detail]

${runtime}
Use check for all new workflows. analyze emits the legacy structural envelope and is scheduled for removal after the 1.x compatibility cycle.
`;
  }
  if (command === "compare") {
    return `data-contracts compare

Usage:
  data-contracts.mjs compare --request <file|-> [--format json|markdown] [--detail]

${runtime}
Request:
  {
    "sources": [{"id":"api","path":"openapi.json","kind":"openapi","selector":"User"}],
    "receivers": [{"id":"view","path":"src/user.ts","kind":"typescript","selector":"UserView"}]
  }

Relative evidence paths resolve from the request file directory; stdin requests use the current directory.
compare is a structural diagnostic. Use check for the normal workflow.
`;
  }
  if (command === "extract") {
    return `data-contracts extract

Usage:
  data-contracts.mjs extract --input <file|-> --kind <kind> [--selector <selector>] [--format json|markdown]

${runtime}
Example:
  node "/absolute/path/to/data-contracts/scripts/data-contracts.mjs" extract --input openapi.json --kind openapi --selector User
`;
  }
  if (command === "scan") {
    return `data-contracts scan

Usage:
  data-contracts.mjs scan --diff <file|-> [--format json|markdown]

${runtime}
Example:
  git diff | node "/absolute/path/to/data-contracts/scripts/data-contracts.mjs" scan --diff -
`;
  }
  return `data-contracts Agent CLI ${TOOL_VERSION}

${runtime}
Normal workflow:
  node "/absolute/path/to/data-contracts/scripts/data-contracts.mjs" check --request alignment.json

Diagnostic commands:
  node "/absolute/path/to/data-contracts/scripts/data-contracts.mjs" extract --input schema.json --kind json-schema
  node "/absolute/path/to/data-contracts/scripts/data-contracts.mjs" compare --request alignment.json --detail
  git diff | node "/absolute/path/to/data-contracts/scripts/data-contracts.mjs" scan --diff -

Commands: check, extract, compare, scan
Kinds: ${INPUT_KINDS.join(", ")}
Formats: ${OUTPUT_FORMATS.join(", ")}

Exit codes:
  0 ready_to_implement or ready_to_verify
  1 needs_decision or blocked
  2 invalid invocation or input
  3 internal error
  5 needs_evidence

Diagnostic commands keep their legacy no_findings/findings/incomplete envelope and exit semantics.

Resource limits:
  request=${limits.requestBytes} bytes, input=${limits.inputBytes} bytes,
  evidence=${limits.evidencePerSide}/side (${limits.evidenceTotal} total),
  depth=${limits.contractDepth}, nodes=${limits.contractNodes}, tokens=${limits.tokens},
  findings=${limits.findings}, default output=${limits.defaultOutputBytes} bytes

The CLI is read-only, local, non-interactive, no-network, and never executes input code.
`;
}

function parseKnownCommand(command, args) {
  const options = { detail: false };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--help" || token === "-h") return { help: true, command };
    if (token === "--detail") {
      if (!COMMAND_OPTIONS[command].has("detail")) throw unknownOption(command, "detail");
      if (options.detail) {
        throw inputError("Duplicate option: --detail.", { kind: "duplicate_option" });
      }
      options.detail = true;
      continue;
    }
    if (!token.startsWith("--")) {
      throw inputError(`Unexpected positional argument: ${token}.`, {
        kind: "unexpected_argument",
        nextStep: `Run data-contracts.mjs ${command} --help for the command interface.`,
      });
    }

    const equals = token.indexOf("=");
    const key = equals === -1 ? token.slice(2) : token.slice(2, equals);
    if (!COMMAND_OPTIONS[command].has(key)) throw unknownOption(command, key);
    if (Object.hasOwn(options, key)) {
      throw inputError(`Duplicate option: --${key}.`, { kind: "duplicate_option" });
    }
    const value = equals === -1 ? args[++index] : token.slice(equals + 1);
    if (!value || (equals === -1 && value.startsWith("--"))) {
      throw inputError(`Option requires a value: --${key}.`, {
        kind: "missing_option_value",
      });
    }
    options[key] = value;
  }

  options.format ||= "json";
  validateOptionValues(options);
  return { command, options };
}

function validateOptionValues(options) {
  if (!OUTPUT_FORMATS.includes(options.format)) {
    throw inputError(`Unsupported output format: ${options.format}.`, {
      kind: "unsupported_output_format",
      allowedValues: OUTPUT_FORMATS,
      nextStep: "Use --format json for Agent consumption or --format markdown for debugging.",
    });
  }
  if (options.kind && !INPUT_KINDS.includes(options.kind)) {
    throw inputError(`Unsupported input kind: ${options.kind}.`, {
      kind: "unsupported_input_kind",
      allowedValues: INPUT_KINDS,
      nextStep: "Choose a documented supported subset or perform manual alignment.",
    });
  }
  if (options.selector && !["openapi", "typescript", "python"].includes(options.kind)) {
    throw inputError(`--selector is not supported for ${options.kind}.`, {
      kind: "selector_not_applicable",
      allowedValues: ["openapi", "typescript", "python"],
      nextStep: "Remove --selector or choose a kind with named structures.",
    });
  }
}

function unknownOption(command, key) {
  return inputError(`Unknown option for ${command}: --${key}.`, {
    kind: "unknown_option",
    allowedValues: [...COMMAND_OPTIONS[command]].sort(),
    nextStep: `Run data-contracts.mjs ${command} --help for an example.`,
  });
}

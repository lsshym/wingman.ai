import { access, open } from "node:fs/promises";
import path from "node:path";
import {
  REQUEST_SCHEMA_VERSION,
  diagnostic,
  estimateTokenCount,
  INPUT_KINDS,
  inputError,
  isRecord,
  MAX_DIFFS,
  MAX_EVIDENCE_PER_SIDE,
  MAX_EVIDENCE_TOTAL,
  MAX_INPUT_BYTES,
  MAX_REQUEST_BYTES,
  MAX_TOKENS,
  node,
  parseJsonInput,
  withProvenance,
} from "./model.mjs";
import { extractContract } from "./extract.mjs";

const REQUEST_KEYS = new Set([
  "schemaVersion",
  "boundaryId",
  "sources",
  "receivers",
  "diffs",
  "decision",
]);
const EVIDENCE_KEYS = new Set(["id", "path", "kind", "selector"]);
const DIFF_KEYS = new Set(["id", "path"]);
const DECISION_KEYS = new Set(["semantic", "resolutions", "binding"]);
const SEMANTIC_KEYS = new Set(["status", "authorityRefs"]);
const RESOLUTION_KEYS = new Set(["decisionId", "status", "authorityRefs"]);
const BINDING_KEYS = new Set(["mode", "location"]);
const AUTHORITY_KEYS = new Set(["kind", "id", "path", "selector"]);
const DECISION_STATUSES = ["unresolved", "resolved", "blocked"];
const BINDING_MODES = ["blocked", "direct", "translate", "change_receiver"];
const AUTHORITY_KINDS = ["evidence", "local", "user_decision"];

export async function loadRequest(location, { workflow = false } = {}) {
  const text = await readBoundedText(location, MAX_REQUEST_BYTES, "request");
  const request = parseJsonInput(text, location);
  const validated = validateRequest(request, { workflow });
  const baseDirectory = location === "-"
    ? process.cwd()
    : path.dirname(path.resolve(location));
  return {
    schemaVersion: validated.schemaVersion,
    boundaryId: validated.boundaryId,
    sources: validated.sources.map((item) => resolveItemPath(item, baseDirectory)),
    receivers: validated.receivers.map((item) => resolveItemPath(item, baseDirectory)),
    diffs: validated.diffs.map((item) => resolveItemPath(item, baseDirectory)),
    decision: await resolveDecisionPaths(validated.decision, baseDirectory),
  };
}

export function validateRequest(request, { workflow = false } = {}) {
  if (!isRecord(request)) {
    throw inputError("Request must be a JSON object.", {
      kind: "invalid_request",
      nextStep: "Provide sources, receivers, and optional diffs arrays.",
    });
  }
  rejectUnknownKeys(request, REQUEST_KEYS, "request");

  if (workflow && request.schemaVersion === undefined) {
    throw inputError("request.schemaVersion is required for check.", {
      kind: "missing_schema_version",
      allowedValues: [REQUEST_SCHEMA_VERSION],
      nextStep: `Set request.schemaVersion to ${REQUEST_SCHEMA_VERSION}.`,
    });
  }
  if (
    request.schemaVersion !== undefined &&
    request.schemaVersion !== REQUEST_SCHEMA_VERSION
  ) {
    throw inputError(`Unsupported request schemaVersion: ${request.schemaVersion}.`, {
      kind: "unsupported_schema_version",
      allowedValues: [REQUEST_SCHEMA_VERSION],
      nextStep: `Use request schemaVersion ${REQUEST_SCHEMA_VERSION}.`,
    });
  }
  if (workflow && request.boundaryId === undefined) {
    throw inputError("request.boundaryId is required for check.", {
      kind: "missing_boundary_id",
      nextStep: "Assign one stable boundaryId to this Source-to-Receiver handoff.",
    });
  }
  const boundaryId = request.boundaryId === undefined
    ? undefined
    : validateBoundaryId(request.boundaryId);

  const sources = validateEvidenceList(request.sources, "sources");
  const receivers = validateEvidenceList(request.receivers, "receivers");
  const diffs = validateDiffList(request.diffs ?? []);
  const decision = request.decision === undefined
    ? undefined
    : validateDecision(request.decision);

  if (sources.length > MAX_EVIDENCE_PER_SIDE || receivers.length > MAX_EVIDENCE_PER_SIDE) {
    throw limitError(
      "evidence_count_limit",
      `A request may contain at most ${MAX_EVIDENCE_PER_SIDE} Source and ${MAX_EVIDENCE_PER_SIDE} Receiver evidence items.`,
    );
  }
  if (sources.length + receivers.length > MAX_EVIDENCE_TOTAL) {
    throw limitError(
      "evidence_total_limit",
      `A request may contain at most ${MAX_EVIDENCE_TOTAL} Source and Receiver evidence items in total.`,
    );
  }
  if (diffs.length > MAX_DIFFS) {
    throw limitError("diff_count_limit", `A request may contain at most ${MAX_DIFFS} diffs.`);
  }

  const allIds = [...sources, ...receivers, ...diffs].map((item) => item.id);
  const duplicateId = allIds.find((id, index) => allIds.indexOf(id) !== index);
  if (duplicateId) {
    throw inputError(`Evidence id must be unique within the request: ${duplicateId}.`, {
      kind: "duplicate_evidence_id",
      nextStep: "Assign a distinct stable id to every Source, Receiver, and diff item.",
    });
  }
  return {
    schemaVersion: request.schemaVersion,
    boundaryId,
    sources,
    receivers,
    diffs,
    decision,
  };
}

export async function loadEvidenceDocument(item, side) {
  let text;
  try {
    text = await readBoundedText(
      item.resolvedPath || item.path,
      MAX_INPUT_BYTES,
      `${side} evidence`,
    );
  } catch (error) {
    if (!error.limitError) throw error;
    return incompleteEvidenceDocument(item, side, error.kind, error.message);
  }

  const tokenCount = estimateTokenCount(text);
  if (tokenCount > MAX_TOKENS) {
    return incompleteEvidenceDocument(
      item,
      side,
      "token_limit_exceeded",
      `${item.path} contains approximately ${tokenCount} tokens; the limit is ${MAX_TOKENS}.`,
      tokenCount,
    );
  }

  const assurance = item.kind === "json" ? "observed" : "declared";
  const extracted = extractContract(text, {
    inputPath: item.path,
    kind: item.kind,
    symbol: item.selector,
  });
  const root = withProvenance(extracted.root, item.id, assurance);
  return {
    ...extracted,
    input: {
      id: item.id,
      side,
      path: item.path,
      kind: item.kind,
      selector: extracted.input.symbol || item.selector,
      evidenceType: assurance,
    },
    root,
    assurance,
    tokenCount,
    diagnostics: (extracted.diagnostics || []).map((itemDiagnostic) => ({
      ...itemDiagnostic,
      evidenceIds: [...new Set([...(itemDiagnostic.evidenceIds || []), item.id])].sort(),
    })),
  };
}

export async function loadDiff(item) {
  try {
    const text = await readBoundedText(item.resolvedPath || item.path, MAX_INPUT_BYTES, "diff");
    const tokenCount = estimateTokenCount(text);
    if (tokenCount > MAX_TOKENS) {
      return {
        input: diffInput(item),
        text: "",
        tokenCount,
        diagnostics: [diagnostic(
          "token_limit_exceeded",
          `${item.path} contains approximately ${tokenCount} tokens; the limit is ${MAX_TOKENS}.`,
          {
            path: item.path,
            source: "resource",
            evidenceIds: [item.id],
          },
        )],
      };
    }
    return {
      input: diffInput(item),
      text,
      tokenCount,
      diagnostics: [],
    };
  } catch (error) {
    if (!error.limitError) throw error;
    return {
      input: diffInput(item),
      text: "",
      tokenCount: 0,
      diagnostics: [diagnostic(error.kind, error.message, {
        path: item.path,
        source: "resource",
        evidenceIds: [item.id],
      })],
    };
  }
}

export async function readDirectInput(location, label = "input") {
  return readBoundedText(location, MAX_INPUT_BYTES, label);
}

export async function readBoundedText(location, maxBytes, label) {
  if (location === "-") return readStdin(maxBytes, label);
  let handle;
  try {
    handle = await open(location, "r");
  } catch (error) {
    throw inputError(`Cannot read ${location}: ${error.message}`, {
      kind: "input_unreadable",
      nextStep: `Confirm that ${location} is a readable local file and retry.`,
    });
  }
  try {
    const metadata = await handle.stat();
    if (metadata.size > maxBytes) {
      throw limitError(
        `${label.replace(/\s+/g, "_")}_size_limit`,
        `${location} is ${metadata.size} bytes; the ${label} limit is ${maxBytes} bytes.`,
      );
    }

    const buffer = Buffer.alloc(maxBytes + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > maxBytes) {
      throw limitError(
        `${label.replace(/\s+/g, "_")}_size_limit`,
        `${location} grew beyond the ${label} limit of ${maxBytes} bytes while being read.`,
      );
    }
    return buffer.subarray(0, offset).toString("utf8");
  } catch (error) {
    if (error.limitError) throw error;
    throw inputError(`Cannot read ${location}: ${error.message}`, {
      kind: "input_unreadable",
      nextStep: `Confirm that ${location} remains a readable local file and retry.`,
    });
  } finally {
    await handle.close().catch(() => {});
  }
}

export function limitError(kind, message) {
  const error = new Error(message);
  error.limitError = true;
  error.kind = kind;
  return error;
}

function validateEvidenceList(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw inputError(`${label} must be a non-empty array.`, {
      kind: "invalid_request",
      nextStep: `Add at least one evidence item to ${label}.`,
    });
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw inputError(`${label}[${index}] must be an object.`, {
        kind: "invalid_evidence",
      });
    }
    rejectUnknownKeys(item, EVIDENCE_KEYS, `${label}[${index}]`);
    requireNonEmptyString(item, "id", `${label}[${index}]`);
    requireLocalPath(item, `${label}[${index}]`);
    if (!INPUT_KINDS.includes(item.kind)) {
      throw inputError(`${label}[${index}].kind is unsupported: ${item.kind}.`, {
        kind: "unsupported_input_kind",
        allowedValues: INPUT_KINDS,
        nextStep: "Choose a documented supported kind or use manual alignment for unsupported evidence.",
      });
    }
    if (item.selector !== undefined && (
      typeof item.selector !== "string" || item.selector.trim() === ""
    )) {
      throw inputError(`${label}[${index}].selector must be a non-empty string when present.`, {
        kind: "invalid_selector",
      });
    }
    if (item.selector && !["openapi", "typescript", "python"].includes(item.kind)) {
      throw inputError(`${label}[${index}].selector is not supported for ${item.kind}.`, {
        kind: "selector_not_applicable",
        allowedValues: ["openapi", "typescript", "python"],
        nextStep: "Remove selector or choose the evidence kind that contains named structures.",
      });
    }
    return {
      id: item.id,
      path: item.path,
      kind: item.kind,
      ...(item.selector ? { selector: item.selector } : {}),
    };
  });
}

function validateDiffList(value) {
  if (!Array.isArray(value)) {
    throw inputError("diffs must be an array when present.", {
      kind: "invalid_request",
    });
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw inputError(`diffs[${index}] must be an object.`, {
        kind: "invalid_diff",
      });
    }
    rejectUnknownKeys(item, DIFF_KEYS, `diffs[${index}]`);
    requireNonEmptyString(item, "id", `diffs[${index}]`);
    requireLocalPath(item, `diffs[${index}]`);
    return { id: item.id, path: item.path };
  });
}

function validateBoundaryId(value) {
  if (
    typeof value !== "string" ||
    value.length > 128 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  ) {
    throw inputError("request.boundaryId must be a stable 1-128 character identifier.", {
      kind: "invalid_boundary_id",
      nextStep: "Use letters, numbers, dots, underscores, colons, or hyphens.",
    });
  }
  return value;
}

function validateDecision(value) {
  if (!isRecord(value)) {
    throw inputError("request.decision must be an object when present.", {
      kind: "invalid_decision",
    });
  }
  rejectUnknownKeys(value, DECISION_KEYS, "request.decision");
  return {
    semantic: value.semantic === undefined
      ? undefined
      : validateSemantic(value.semantic),
    resolutions: value.resolutions === undefined
      ? []
      : validateResolutions(value.resolutions),
    binding: value.binding === undefined
      ? undefined
      : validateBinding(value.binding),
  };
}

function validateSemantic(value) {
  if (!isRecord(value)) {
    throw inputError("request.decision.semantic must be an object.", {
      kind: "invalid_decision",
    });
  }
  rejectUnknownKeys(value, SEMANTIC_KEYS, "request.decision.semantic");
  return {
    status: value.status === undefined
      ? undefined
      : validateDecisionStatus(value.status, "request.decision.semantic.status"),
    authorityRefs: value.authorityRefs === undefined
      ? []
      : validateAuthorityRefs(value.authorityRefs, "request.decision.semantic.authorityRefs"),
  };
}

function validateResolutions(value) {
  if (!Array.isArray(value)) {
    throw inputError("request.decision.resolutions must be an array.", {
      kind: "invalid_decision",
    });
  }
  return value.map((item, index) => {
    const label = `request.decision.resolutions[${index}]`;
    if (!isRecord(item)) {
      throw inputError(`${label} must be an object.`, { kind: "invalid_decision" });
    }
    rejectUnknownKeys(item, RESOLUTION_KEYS, label);
    if (typeof item.decisionId !== "string" || item.decisionId.trim() === "") {
      throw inputError(`${label}.decisionId must be a non-empty string.`, {
        kind: "invalid_decision",
      });
    }
    return {
      decisionId: item.decisionId,
      status: item.status === undefined
        ? undefined
        : validateDecisionStatus(item.status, `${label}.status`),
      authorityRefs: item.authorityRefs === undefined
        ? []
        : validateAuthorityRefs(item.authorityRefs, `${label}.authorityRefs`),
    };
  });
}

function validateBinding(value) {
  if (!isRecord(value)) {
    throw inputError("request.decision.binding must be an object.", {
      kind: "invalid_decision",
    });
  }
  rejectUnknownKeys(value, BINDING_KEYS, "request.decision.binding");
  if (value.mode !== undefined && !BINDING_MODES.includes(value.mode)) {
    throw inputError(`Unsupported binding mode: ${value.mode}.`, {
      kind: "invalid_binding_mode",
      allowedValues: BINDING_MODES,
    });
  }
  if (value.location !== undefined) {
    validateLocalLocation(value.location, "request.decision.binding.location");
  }
  return {
    mode: value.mode,
    location: value.location,
  };
}

function validateDecisionStatus(value, label) {
  if (!DECISION_STATUSES.includes(value)) {
    throw inputError(`${label} is unsupported: ${value}.`, {
      kind: "invalid_decision_status",
      allowedValues: DECISION_STATUSES,
    });
  }
  return value;
}

function validateAuthorityRefs(value, label) {
  if (!Array.isArray(value)) {
    throw inputError(`${label} must be an array.`, { kind: "invalid_decision" });
  }
  return value.map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    if (!isRecord(item)) {
      throw inputError(`${itemLabel} must be an object.`, { kind: "invalid_authority_ref" });
    }
    rejectUnknownKeys(item, AUTHORITY_KEYS, itemLabel);
    if (!AUTHORITY_KINDS.includes(item.kind)) {
      throw inputError(`${itemLabel}.kind is unsupported: ${item.kind}.`, {
        kind: "invalid_authority_kind",
        allowedValues: AUTHORITY_KINDS,
      });
    }
    if (item.kind === "local") {
      validateLocalLocation(item.path, `${itemLabel}.path`);
      if (item.id !== undefined) {
        throw inputError(`${itemLabel}.id is not supported for local authority.`, {
          kind: "invalid_authority_ref",
        });
      }
    } else {
      if (typeof item.id !== "string" || item.id.trim() === "") {
        throw inputError(`${itemLabel}.id must be a non-empty string.`, {
          kind: "invalid_authority_ref",
        });
      }
      if (item.path !== undefined || item.selector !== undefined) {
        throw inputError(`${itemLabel} may not include path or selector for ${item.kind}.`, {
          kind: "invalid_authority_ref",
        });
      }
    }
    if (item.selector !== undefined && (
      typeof item.selector !== "string" || item.selector.trim() === ""
    )) {
      throw inputError(`${itemLabel}.selector must be a non-empty string when present.`, {
        kind: "invalid_authority_ref",
      });
    }
    return {
      kind: item.kind,
      id: item.id,
      path: item.path,
      selector: item.selector,
    };
  });
}

function validateLocalLocation(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw inputError(`${label} must be a non-empty local path.`, {
      kind: "invalid_local_path",
    });
  }
  if (value === "-" || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    throw inputError(`${label} must be a local filesystem path.`, {
      kind: "invalid_local_path",
    });
  }
}

function rejectUnknownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length === 0) return;
  throw inputError(`${label} contains unsupported fields: ${unknown.sort().join(", ")}.`, {
    kind: "unsupported_request_field",
    allowedValues: [...allowed].sort(),
    nextStep: "Remove unsupported fields; record workflow decisions only under request.decision.",
  });
}

function requireNonEmptyString(value, key, label) {
  if (typeof value[key] === "string" && value[key].trim() !== "") return;
  throw inputError(`${label}.${key} must be a non-empty string.`, {
    kind: "invalid_evidence",
  });
}

function requireLocalPath(item, label) {
  requireNonEmptyString(item, "path", label);
  if (item.path === "-") {
    throw inputError(`${label}.path cannot be stdin; only --request or direct diagnostic input may use "-".`, {
      kind: "evidence_stdin_unsupported",
      nextStep: "Write the evidence to a local file and reference that file from the request.",
    });
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(item.path)) {
    throw inputError(`${label}.path must be a local filesystem path, not ${item.path}.`, {
      kind: "remote_input_unsupported",
      nextStep: "Save the evidence locally. The CLI never fetches URLs.",
    });
  }
}

function incompleteEvidenceDocument(item, side, kind, message, tokenCount = 0) {
  const assurance = item.kind === "json" ? "observed" : "declared";
  return {
    input: {
      id: item.id,
      side,
      path: item.path,
      kind: item.kind,
      selector: item.selector,
      evidenceType: assurance,
    },
    root: withProvenance(node({ path: "$", kind: "unknown" }), item.id, assurance),
    completeness: "partial",
    assurance,
    tokenCount,
    diagnostics: [diagnostic(kind, message, {
      path: "$",
      source: "resource",
      evidenceIds: [item.id],
    })],
  };
}

function diffInput(item) {
  return {
    id: item.id,
    side: "diff",
    path: item.path,
    kind: "diff",
    evidenceType: "heuristic",
  };
}

function resolveItemPath(item, baseDirectory) {
  return {
    ...item,
    resolvedPath: path.isAbsolute(item.path)
      ? item.path
      : path.resolve(baseDirectory, item.path),
  };
}

async function resolveDecisionPaths(decision, baseDirectory) {
  if (!decision) return undefined;
  const resolveRefs = (refs) => Promise.all((refs || []).map(async (ref) => {
    if (ref.kind !== "local") return ref;
    const resolvedPath = path.isAbsolute(ref.path)
      ? ref.path
      : path.resolve(baseDirectory, ref.path);
    let available = true;
    try {
      await access(resolvedPath);
    } catch {
      available = false;
    }
    return { ...ref, resolvedPath, available };
  }));
  return {
    semantic: decision.semantic
      ? {
          ...decision.semantic,
          authorityRefs: await resolveRefs(decision.semantic.authorityRefs),
        }
      : undefined,
    resolutions: await Promise.all((decision.resolutions || []).map(async (item) => ({
      ...item,
      authorityRefs: await resolveRefs(item.authorityRefs),
    }))),
    binding: decision.binding,
  };
}

function readStdin(maxBytes, label) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let byteLength = 0;
    process.stdin.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += buffer.byteLength;
      if (byteLength > maxBytes) {
        reject(limitError(
          `${label.replace(/\s+/g, "_")}_size_limit`,
          `stdin exceeds the ${label} limit of ${maxBytes} bytes.`,
        ));
        process.stdin.pause();
        return;
      }
      chunks.push(buffer);
    });
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

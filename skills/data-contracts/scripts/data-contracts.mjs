#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const VERSION = 1;
const LIMITS = [
  "This CLI reports structural and anti-pattern evidence; it does not decide business meaning.",
  "Treat requiresSemanticDecision=true as a stop sign for guessing. Check source truth from code, schemas, docs, memory, or the user.",
  "The CLI is read-only and never rewrites source or receiver code.",
];

const CHECKPOINT_FIELDS = [
  ["source", "Source"],
  ["receiver", "Receiver"],
  ["owner", "Owner/source of truth"],
  ["gap", "Gap"],
  ["bindingLocation", "Binding location"],
  ["verification", "Verification"],
];

const CONTRACT_RISKS = {
  unsafe_cast: "A type assertion hides missing, renamed, optional, or semantically different fields.",
  claimed_unproven_source_field:
    "A source-facing type claims a field exists without schema, fixture, generated type, sample, or runtime evidence.",
  fake_default: "Missing source data is represented as misleading data.",
  semantic_rename_suspect:
    "A source field is assigned to a receiver concept that may have a different business meaning.",
  guessed_multi_field_fallback:
    "Multiple aliases guess at possible source contracts and can hide API, SDK, fixture, or generated-type drift.",
  vendor_shape_leak:
    "A stable receiver contract appears coupled to an external/vendor payload shape.",
  scattered_mapper:
    "The same source-to-receiver translation appears to be repeated across call sites.",
  overbuilt_adapter_for_local_naming:
    "An adapter may exist only to preserve local naming style for a local receiver.",
  optionality_drift:
    "The receiver assumes a stricter presence/nullability guarantee than the source evidence provides.",
  enum_status_collapse:
    "Source enum/status values are collapsed or cast into receiver values without explicit mapping.",
  receiver_overreach:
    "A contract change appears to alter unrelated receiver behavior, UI, copy, or handlers.",
  missing_field: "The receiver expects a field that source evidence does not prove.",
  extra_field: "The source supplies a field that is not consumed by the receiver contract.",
  structural_mismatch: "The source and receiver shapes differ in nesting, container kind, or primitive type.",
  source_conflict: "Multiple source evidences disagree about the same contract path.",
  checkpoint_incomplete: "The required data-contracts checkpoint is missing one or more fields.",
};

main().catch((error) => {
  const payload = {
    version: VERSION,
    command: "unknown",
    error: {
      kind: error?.inputError ? "input_error" : "internal_error",
      message: error?.message || String(error),
    },
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(error?.inputError ? 2 : 3);
});

async function main() {
  const { command, options } = parseCli(process.argv.slice(2));

  if (options.help || command === "help") {
    process.stdout.write(helpText());
    return;
  }

  if (!command) {
    return finish(
      {
        version: VERSION,
        command: "unknown",
        error: {
          kind: "input_error",
          message: "Command is required. Use analyze, scan, extract, compare, checkpoint, or verify.",
        },
      },
      2,
      "json",
    );
  }

  if (command === "scan") {
    const payload = await runScan(options);
    return finish(payload, payload.findings.length > 0 ? 1 : 0, options.format);
  }

  if (command === "extract") {
    const payload = await runExtractCommand(options);
    return finish(payload, 0, options.format);
  }

  if (command === "compare") {
    const payload = await runCompareCommand(options);
    return finish(payload, payload.gaps.length > 0 ? 1 : 0, options.format);
  }

  if (command === "checkpoint") {
    const payload = runCheckpoint(options, "checkpoint");
    const exitCode = checkpointComplete(payload.checkpoint) ? 0 : 4;
    return finish(payload, exitCode, options.format);
  }

  if (command === "verify") {
    const payload = await runVerifyCommand(options);
    return finish(payload, 0, options.format);
  }

  if (command === "analyze") {
    const payload = await runAnalyze(options);
    let exitCode = 0;
    if (!checkpointComplete(payload.checkpoint)) exitCode = 4;
    if (payload.findings.length > 0 || payload.gaps.length > 0) exitCode = 1;
    return finish(payload, exitCode, options.format);
  }

  return finish(
    {
      version: VERSION,
      command,
      error: {
        kind: "input_error",
        message: `Unknown command: ${command}`,
      },
    },
    2,
    options.format,
  );
}

function parseCli(argv) {
  const command = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      if (!options._) options._ = [];
      options._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = normalizeOptionKey(rawKey);
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  if (!options.format) options.format = "json";
  return { command, options };
}

function normalizeOptionKey(key) {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function helpText() {
  return `data-contracts agent CLI

Usage:
  node skills/data-contracts/scripts/data-contracts.mjs analyze --source <file> --receiver <file> [--diff <file|->] [--format json|md]
  node skills/data-contracts/scripts/data-contracts.mjs scan --diff <file|-> [--format json|md]
  node skills/data-contracts/scripts/data-contracts.mjs extract --input <file|-> --kind <json|json-schema|openapi|typescript|python> [--symbol <name>]
  node skills/data-contracts/scripts/data-contracts.mjs compare --source <file> --receiver <file> [--source-kind <kind>] [--receiver-kind <kind>]
  node skills/data-contracts/scripts/data-contracts.mjs checkpoint --source <text> --receiver <text> --owner <text> --gap <text> --binding <text> --verification <text>
  node skills/data-contracts/scripts/data-contracts.mjs verify [--from-json <file|->]

Defaults:
  --format json
  --source-kind/--receiver-kind inferred from file extension when possible

Exit codes:
  0 clean analysis
  1 contract risks or gaps found
  2 bad input
  3 internal error
  4 checkpoint evidence incomplete
`;
}

async function runScan(options) {
  const input = await readScanInput(options);
  const findings = scanText(input.text, input.label, input.mode);
  return {
    version: VERSION,
    command: "scan",
    inputs: {
      diff: options.diff ? input.label : undefined,
      files: normalizeList(options.file || options.files),
    },
    findings,
    gaps: [],
    questions: buildQuestions([], findings),
    verification: buildVerification(findings, []),
    limits: LIMITS,
  };
}

async function readScanInput(options) {
  if (options.diff) {
    return {
      text: await readText(options.diff),
      label: options.diff,
      mode: "diff",
    };
  }
  const files = normalizeList(options.file || options.files);
  if (files.length === 0) {
    throw inputError("scan requires --diff <file|-> or --file <file>");
  }
  const parts = [];
  for (const file of files) {
    parts.push(`+++ ${file}\n${await readText(file)}`);
  }
  return {
    text: parts.join("\n"),
    label: files.join(","),
    mode: "files",
  };
}

function scanText(text, label, mode) {
  const lines = mode === "diff" ? parseDiffLines(text, label) : parsePlainLines(text, label);
  const findings = [];
  const mappingCounts = new Map();

  for (const line of lines) {
    const code = line.text.trim();
    if (!code) continue;

    if (/\bas\s+unknown\s+as\b/.test(code) || /\bas\s+[A-Z][A-Za-z0-9_]*(?:View|Model|Entity|Dto|DTO|Contract)\b/.test(code)) {
      findings.push(makeFinding("unsafe_cast", "error", line, code, true));
    }

    if (/\bas\s+[A-Za-z0-9_]*Status\b/.test(code) || /\bstatus\s*:\s*[^,;]+?\bas\s+[A-Za-z0-9_]+/.test(code)) {
      findings.push(makeFinding("enum_status_collapse", "error", line, code, true));
    }

    if (/(?:^|[,{]\s*)[A-Za-z0-9_]*[Uu]rl[A-Za-z0-9_]*\??\s*:\s*(?:["'][^"']*["']|[A-Za-z][A-Za-z0-9_<>"' |[\]]*)/.test(code) && /(type|interface|Response|Payload|Api|API)/.test(lines.slice(Math.max(0, line.index - 6), line.index + 1).map((item) => item.text).join("\n"))) {
      findings.push(makeFinding("claimed_unproven_source_field", "warning", line, code, true));
    }

    if (/(^|[,{]\s*)[A-Za-z0-9_]+\s*:\s*(?:""|''|0|null|\[\])\s*[,}]/.test(code)) {
      findings.push(makeFinding("fake_default", "warning", line, code, false));
    }

    if (/\b[A-Za-z0-9_]+\.[A-Za-z0-9_]+\s*(?:\|\||\?\?)\s*[A-Za-z0-9_]+\.[A-Za-z0-9_]+/.test(code)) {
      findings.push(makeFinding("guessed_multi_field_fallback", "warning", line, code, true));
    }

    if (/\b(?:workflowKind|kind|category|type)\s*:\s*[A-Za-z0-9_]+\.status\b/.test(code)) {
      findings.push(makeFinding("semantic_rename_suspect", "error", line, code, true));
    }

    if (/\btype\s+[A-Z][A-Za-z0-9_]*(?:View|Model|Entity|Domain)\s*=\s*(?:Vendor|SDK|Sdk|Api|API)[A-Z]/.test(code)) {
      findings.push(makeFinding("vendor_shape_leak", "warning", line, code, true));
    }

    if (/\bto[A-Z][A-Za-z0-9_]*\s*\(/.test(code) && /View|Dto|DTO|Model/.test(code)) {
      findings.push(makeFinding("overbuilt_adapter_for_local_naming", "info", line, code, false));
    }

    if (/\b(?:render|setState|navigate|alert|confirm|toast|className|style|innerText|textContent)\b/.test(code)) {
      findings.push(makeFinding("receiver_overreach", "info", line, code, false));
    }

    const mapping = code.match(/\b([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\b/g);
    if (mapping && mapping.length >= 2) {
      const normalized = mapping.sort().join("|");
      mappingCounts.set(normalized, (mappingCounts.get(normalized) || 0) + 1);
    }
  }

  for (const [pattern, count] of mappingCounts.entries()) {
    if (count >= 2) {
      findings.push({
        kind: "scattered_mapper",
        severity: "warning",
        file: label,
        line: null,
        evidence: pattern,
        contractRisk: CONTRACT_RISKS.scattered_mapper,
        requiresSemanticDecision: false,
      });
    }
  }

  return dedupeFindings(findings);
}

function parseDiffLines(text, fallbackFile) {
  const result = [];
  let file = fallbackFile;
  let newLine = null;
  const rawLines = text.split(/\r?\n/);
  for (const raw of rawLines) {
    const fileMatch = raw.match(/^\+\+\+\s+(?:b\/)?(.+)$/);
    if (fileMatch) {
      file = fileMatch[1];
      continue;
    }
    const hunkMatch = raw.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunkMatch) {
      newLine = Number(hunkMatch[1]);
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      result.push({
        file,
        line: newLine,
        text: raw.slice(1),
        index: result.length,
      });
      if (newLine !== null) newLine += 1;
      continue;
    }
    if (raw.startsWith(" ") && newLine !== null) {
      newLine += 1;
    }
  }
  return result;
}

function parsePlainLines(text, file) {
  return text.split(/\r?\n/).map((line, index) => ({
    file,
    line: index + 1,
    text: line,
    index,
  }));
}

function makeFinding(kind, severity, line, evidence, requiresSemanticDecision) {
  return {
    kind,
    severity,
    file: line.file,
    line: line.line,
    evidence,
    contractRisk: CONTRACT_RISKS[kind],
    requiresSemanticDecision,
  };
}

function dedupeFindings(findings) {
  const seen = new Set();
  const result = [];
  for (const finding of findings) {
    const key = `${finding.kind}:${finding.file}:${finding.line}:${finding.evidence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(finding);
  }
  return result;
}

async function runExtractCommand(options) {
  if (!options.input) throw inputError("extract requires --input <file|->");
  const kind = options.kind || inferKind(options.input);
  const shape = await extractShapeFromInput(options.input, kind, options.symbol);
  return {
    version: VERSION,
    command: "extract",
    input: {
      path: options.input,
      kind,
      symbol: options.symbol,
    },
    shape,
    limits: LIMITS,
  };
}

async function runCompareCommand(options) {
  const { sourceShape, receiverShape } = await extractCompareShapes(options);
  const gaps = compareShapes(sourceShape, receiverShape);
  const findings = gapsToFindings(gaps);
  return {
    version: VERSION,
    command: "compare",
    inputs: {
      source: shapeInputSummary(sourceShape),
      receiver: shapeInputSummary(receiverShape),
    },
    evidence: {
      sourceShape,
      receiverShape,
    },
    findings,
    gaps,
    questions: buildQuestions(gaps, findings),
    verification: buildVerification(findings, gaps),
    limits: LIMITS,
  };
}

async function extractCompareShapes(options) {
  if (!options.source) throw inputError("compare requires --source <file|->");
  if (!options.receiver) throw inputError("compare requires --receiver <file|->");
  const sourceKind = options.sourceKind || inferKind(options.source);
  const receiverKind = options.receiverKind || inferKind(options.receiver);
  const sourceShape = await extractShapeFromInput(options.source, sourceKind, options.sourceSymbol);
  const receiverShape = await extractShapeFromInput(options.receiver, receiverKind, options.receiverSymbol);
  return { sourceShape, receiverShape };
}

async function extractShapeFromInput(input, kind, symbol) {
  const text = await readText(input);
  return extractShape(text, kind, {
    path: input,
    symbol,
  });
}

function extractShape(text, kind, meta = {}) {
  if (kind === "json") {
    return shapeFromJson(parseJson(text, meta.path), { ...meta, kind });
  }
  if (kind === "json-schema") {
    return shapeFromJsonSchema(parseJson(text, meta.path), { ...meta, kind });
  }
  if (kind === "openapi") {
    return shapeFromOpenApi(parseJson(text, meta.path), { ...meta, kind });
  }
  if (kind === "typescript") {
    return shapeFromTypeScript(text, { ...meta, kind });
  }
  if (kind === "python") {
    return shapeFromPython(text, { ...meta, kind });
  }
  throw inputError(`Unsupported input kind: ${kind}`);
}

function shapeFromJson(value, meta) {
  const object = isRecord(value) ? value : {};
  return {
    kind: meta.kind,
    source: meta.path,
    symbol: meta.symbol,
    fields: Object.fromEntries(
      Object.entries(object).map(([name, fieldValue]) => [
        name,
        {
          path: name,
          name,
          normalizedName: normalizeFieldName(name),
          type: inferValueType(fieldValue),
          required: true,
          nullable: fieldValue === null,
          enum: sampleEnum(name, fieldValue),
          sample: fieldValue,
          item: Array.isArray(fieldValue) ? inferArrayItem(fieldValue) : undefined,
          fields: isRecord(fieldValue) ? shapeFromJson(fieldValue, meta).fields : undefined,
        },
      ]),
    ),
  };
}

function shapeFromJsonSchema(schema, meta) {
  return {
    kind: meta.kind,
    source: meta.path,
    symbol: meta.symbol,
    fields: fieldsFromJsonSchema(schema, ""),
  };
}

function fieldsFromJsonSchema(schema, prefix) {
  const required = new Set(Array.isArray(schema?.required) ? schema.required : []);
  const properties = isRecord(schema?.properties) ? schema.properties : {};
  return Object.fromEntries(
    Object.entries(properties).map(([name, property]) => {
      const typeInfo = typeFromSchema(property);
      return [
        name,
        {
          path: prefix ? `${prefix}.${name}` : name,
          name,
          normalizedName: normalizeFieldName(name),
          type: typeInfo.type,
          required: required.has(name),
          nullable: typeInfo.nullable,
          enum: Array.isArray(property?.enum) ? property.enum.map(String) : undefined,
          item: property?.items ? typeFromSchema(property.items) : undefined,
          fields: isRecord(property?.properties)
            ? fieldsFromJsonSchema(property, prefix ? `${prefix}.${name}` : name)
            : undefined,
        },
      ];
    }),
  );
}

function shapeFromOpenApi(document, meta) {
  const schemas = document?.components?.schemas;
  if (!isRecord(schemas)) throw inputError("OpenAPI input does not include components.schemas");
  let schema = meta.symbol ? schemas[meta.symbol] : undefined;
  if (!schema) {
    const entries = Object.entries(schemas);
    if (entries.length === 1) {
      meta.symbol = entries[0][0];
      schema = entries[0][1];
    }
  }
  if (!schema) throw inputError("OpenAPI extraction requires --symbol <schemaName> when multiple schemas exist");
  const shape = shapeFromJsonSchema(schema, meta);
  shape.kind = "openapi";
  return shape;
}

function shapeFromTypeScript(text, meta) {
  const body = extractTypeScriptBody(text, meta.symbol);
  const fields = {};
  const fieldPattern = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:\s*([^;,\n]+)[;,]?/gm;
  let match;
  while ((match = fieldPattern.exec(body))) {
    const name = match[1];
    const rawType = match[2].trim();
    const parsed = parseTypeText(rawType);
    fields[name] = {
      path: name,
      name,
      normalizedName: normalizeFieldName(name),
      type: parsed.type,
      required: !/\b\??\s*:/.test(match[0]) || !match[0].includes("?"),
      nullable: parsed.nullable,
      enum: parsed.enum,
      item: parsed.item,
      rawType,
    };
  }
  return {
    kind: meta.kind,
    source: meta.path,
    symbol: meta.symbol,
    fields,
  };
}

function extractTypeScriptBody(text, symbol) {
  if (symbol) {
    const interfaceMatch = text.match(new RegExp(`(?:export\\s+)?interface\\s+${escapeRegExp(symbol)}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
    if (interfaceMatch) return interfaceMatch[1];
    const typeMatch = text.match(new RegExp(`(?:export\\s+)?type\\s+${escapeRegExp(symbol)}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
    if (typeMatch) return typeMatch[1];
    throw inputError(`TypeScript symbol not found: ${symbol}`);
  }
  const firstInterface = text.match(/(?:export\s+)?interface\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\{([\s\S]*?)\n\}/m);
  if (firstInterface) return firstInterface[1];
  const firstType = text.match(/(?:export\s+)?type\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*\{([\s\S]*?)\n\}/m);
  if (firstType) return firstType[1];
  throw inputError("No TypeScript interface or object type found");
}

function shapeFromPython(text, meta) {
  const body = extractPythonClassBody(text, meta.symbol);
  const fields = {};
  const fieldPattern = /^[ \t]{4,}([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([^\n=#]+)(?:=.*)?$/gm;
  let match;
  while ((match = fieldPattern.exec(body))) {
    const name = match[1];
    const rawType = match[2].trim();
    const parsed = parseTypeText(rawType);
    fields[name] = {
      path: name,
      name,
      normalizedName: normalizeFieldName(name),
      type: parsed.type,
      required: !parsed.nullable,
      nullable: parsed.nullable,
      enum: parsed.enum,
      item: parsed.item,
      rawType,
    };
  }
  return {
    kind: meta.kind,
    source: meta.path,
    symbol: meta.symbol,
    fields,
  };
}

function extractPythonClassBody(text, symbol) {
  const lines = text.split(/\r?\n/);
  const classPattern = symbol
    ? new RegExp(`^class\\s+${escapeRegExp(symbol)}\\s*(?:\\([^)]*\\))?\\s*:`)
    : /^class\s+[A-Za-z_][A-Za-z0-9_]*\s*(?:\([^)]*\))?\s*:/;
  const start = lines.findIndex((line) => classPattern.test(line));
  if (start === -1) throw inputError(symbol ? `Python class not found: ${symbol}` : "No Python class found");
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") {
      body.push(line);
      continue;
    }
    if (/^\s+/.test(line)) {
      body.push(line);
      continue;
    }
    break;
  }
  return body.join("\n");
}

function parseTypeText(rawType) {
  const text = rawType.trim();
  const enumValues = [...text.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  const nullable = /\bnull\b|\bNone\b|Optional\[|\|\s*None|\|\s*null/.test(text);
  let type = "unknown";
  let item;

  if (/\[\]$/.test(text) || /^Array</.test(text) || /^list\[|^List\[/.test(text)) {
    type = "array";
    item = { type: "unknown" };
  } else if (/\bstring\b|\bstr\b/.test(text) || enumValues.length > 0) {
    type = "string";
  } else if (/\bnumber\b|\bint\b|\bfloat\b/.test(text)) {
    type = "number";
  } else if (/\bboolean\b|\bbool\b/.test(text)) {
    type = "boolean";
  } else if (/\bRecord\b|\bdict\b|\bDict\b|^\{/.test(text)) {
    type = "object";
  }

  return {
    type,
    nullable,
    enum: enumValues.length > 0 ? enumValues : undefined,
    item,
  };
}

function compareShapes(sourceShape, receiverShape) {
  const gaps = [];
  const sourceFields = sourceShape.fields || {};
  const receiverFields = receiverShape.fields || {};
  const usedSource = new Set();

  for (const receiverField of Object.values(receiverFields)) {
    const sourceField = findMatchingField(receiverField, sourceFields);
    if (!sourceField) {
      gaps.push(makeGap("missing_field", {
        sourcePath: null,
        receiverPath: receiverField.path,
        message: `Receiver expects ${receiverField.path} but source evidence does not prove it exists.`,
        requiresSemanticDecision: true,
      }));
      continue;
    }

    usedSource.add(sourceField.name);

    if ((sourceField.nullable || sourceField.required === false) && receiverField.required !== false && !receiverField.nullable) {
      gaps.push(makeGap("optionality_drift", {
        sourcePath: sourceField.path,
        receiverPath: receiverField.path,
        message: `Receiver requires ${receiverField.path}, but source ${sourceField.path} may be absent or null.`,
        requiresSemanticDecision: false,
      }));
    }

    if (sourceField.type !== "unknown" && receiverField.type !== "unknown" && sourceField.type !== receiverField.type) {
      gaps.push(makeGap("structural_mismatch", {
        sourcePath: sourceField.path,
        receiverPath: receiverField.path,
        message: `Source ${sourceField.path} is ${sourceField.type}, but receiver ${receiverField.path} is ${receiverField.type}.`,
        requiresSemanticDecision: false,
      }));
    }

    const sourceEnum = Array.isArray(sourceField.enum) ? sourceField.enum : undefined;
    const receiverEnum = Array.isArray(receiverField.enum) ? receiverField.enum : undefined;
    if (sourceEnum && receiverEnum && !sameStringSet(sourceEnum, receiverEnum)) {
      gaps.push(makeGap("enum_status_collapse", {
        sourcePath: sourceField.path,
        receiverPath: receiverField.path,
        message: `Source values ${sourceEnum.join(", ")} do not match receiver values ${receiverEnum.join(", ")}.`,
        requiresSemanticDecision: true,
      }));
    }
  }

  for (const sourceField of Object.values(sourceFields)) {
    if (usedSource.has(sourceField.name)) continue;
    if (findMatchingField(sourceField, receiverFields)) continue;
    gaps.push(makeGap("extra_field", {
      sourcePath: sourceField.path,
      receiverPath: null,
      message: `Source supplies ${sourceField.path}, but receiver does not declare a matching field.`,
      requiresSemanticDecision: false,
    }));
  }

  return gaps;
}

function makeGap(kind, details) {
  return {
    kind,
    severity: kind === "extra_field" ? "info" : "warning",
    contractRisk: CONTRACT_RISKS[kind],
    ...details,
  };
}

function findMatchingField(field, fields) {
  if (fields[field.name]) return fields[field.name];
  return Object.values(fields).find((candidate) => candidate.normalizedName === field.normalizedName);
}

function gapsToFindings(gaps) {
  return gaps
    .filter((gap) => gap.kind !== "extra_field")
    .map((gap) => ({
      kind: gap.kind,
      severity: gap.severity,
      file: null,
      line: null,
      evidence: [gap.sourcePath, gap.receiverPath].filter(Boolean).join(" -> "),
      contractRisk: gap.contractRisk,
      requiresSemanticDecision: gap.requiresSemanticDecision,
    }));
}

function runCheckpoint(options, command) {
  const checkpoint = {
    source: presence(options.source),
    receiver: presence(options.receiver),
    owner: presence(options.owner),
    gap: presence(options.gap),
    bindingLocation: presence(options.bindingLocation || options.binding),
    verification: presence(options.verification),
  };
  const values = {
    source: options.source,
    receiver: options.receiver,
    owner: options.owner,
    gap: options.gap,
    bindingLocation: options.bindingLocation || options.binding,
    verification: options.verification,
  };
  const missing = Object.entries(checkpoint)
    .filter(([, status]) => status === "missing")
    .map(([key]) => key);
  return {
    version: VERSION,
    command,
    checkpoint,
    values,
    findings:
      missing.length > 0
        ? [
            {
              kind: "checkpoint_incomplete",
              severity: "error",
              file: null,
              line: null,
              evidence: missing.join(", "),
              contractRisk: CONTRACT_RISKS.checkpoint_incomplete,
              requiresSemanticDecision: missing.some((field) => ["owner", "gap", "bindingLocation"].includes(field)),
            },
          ]
        : [],
    gaps: [],
    questions: missing.map((field) => `Provide checkpoint field: ${field}`),
    verification: options.verification ? [options.verification] : [],
    limits: LIMITS,
  };
}

async function runVerifyCommand(options) {
  let payload = null;
  if (options.fromJson) {
    payload = parseJson(await readText(options.fromJson), options.fromJson);
  }
  const findings = payload?.findings || [];
  const gaps = payload?.gaps || [];
  return {
    version: VERSION,
    command: "verify",
    findings,
    gaps,
    verification: buildVerification(findings, gaps),
    limits: LIMITS,
  };
}

async function runAnalyze(options) {
  const findings = [];
  let gaps = [];
  let sourceShape = null;
  let receiverShape = null;

  if (options.diff || options.file || options.files) {
    const scanPayload = await runScan(options);
    findings.push(...scanPayload.findings);
  }

  if (options.source && options.receiver) {
    const comparePayload = await runCompareCommand(options);
    sourceShape = comparePayload.evidence.sourceShape;
    receiverShape = comparePayload.evidence.receiverShape;
    findings.push(...comparePayload.findings);
    gaps = comparePayload.gaps;
  } else if (options.source) {
    const sourceKind = options.sourceKind || inferKind(options.source);
    sourceShape = await extractShapeFromInput(options.source, sourceKind, options.sourceSymbol);
  } else if (options.receiver) {
    const receiverKind = options.receiverKind || inferKind(options.receiver);
    receiverShape = await extractShapeFromInput(options.receiver, receiverKind, options.receiverSymbol);
  }

  const preliminaryFindings = dedupeFindings(findings);
  const generatedVerification = buildVerification(preliminaryFindings, gaps, options.verification);
  const checkpointPayload = runCheckpoint(
    {
      ...options,
      gap: options.gap || summarizeGaps(gaps),
      verification: options.verification || generatedVerification[0],
    },
    "analyze",
  );
  const allFindings = dedupeFindings([...preliminaryFindings, ...checkpointPayload.findings]);
  const checkpoint = checkpointPayload.checkpoint;
  const questions = uniqueStrings([...buildQuestions(gaps, allFindings), ...checkpointPayload.questions]);
  const verification = buildVerification(allFindings, gaps, checkpointPayload.values.verification);

  return {
    version: VERSION,
    command: "analyze",
    summary: {
      severity: summarizeSeverity(allFindings, gaps, checkpoint),
      findingCount: allFindings.length,
      gapCount: gaps.length,
      requiresSemanticDecision:
        allFindings.some((finding) => finding.requiresSemanticDecision) ||
        gaps.some((gap) => gap.requiresSemanticDecision),
    },
    inputs: {
      source: sourceShape ? [shapeInputSummary(sourceShape)] : [],
      receiver: receiverShape ? [shapeInputSummary(receiverShape)] : [],
      diff: options.diff,
    },
    evidence: {
      sourceShape,
      receiverShape,
    },
    findings: allFindings,
    gaps,
    checkpoint,
    questions,
    verification,
    limits: LIMITS,
  };
}

function summarizeGaps(gaps) {
  if (!Array.isArray(gaps) || gaps.length === 0) return undefined;
  return gaps
    .filter((gap) => gap.kind !== "extra_field")
    .map((gap) => gap.message)
    .join(" ");
}

function summarizeSeverity(findings, gaps, checkpoint) {
  if (!checkpointComplete(checkpoint)) return "error";
  if (findings.some((finding) => finding.severity === "error")) return "error";
  if (findings.length > 0 || gaps.some((gap) => gap.severity !== "info")) return "warning";
  if (gaps.length > 0) return "info";
  return "clean";
}

function buildQuestions(gaps, findings) {
  const questions = [];
  for (const gap of gaps) {
    if (gap.kind === "missing_field") {
      questions.push(`Should ${gap.receiverPath} be optional, fetched from another source, rejected at the boundary, or removed from the receiver?`);
    }
    if (gap.kind === "enum_status_collapse") {
      questions.push(`Which side owns the lifecycle/status meaning for ${gap.sourcePath} -> ${gap.receiverPath}?`);
    }
    if (gap.requiresSemanticDecision && gap.kind !== "missing_field" && gap.kind !== "enum_status_collapse") {
      questions.push(`Resolve semantic ownership for ${gap.sourcePath || "source"} -> ${gap.receiverPath || "receiver"}.`);
    }
  }
  for (const finding of findings) {
    if (finding.kind === "semantic_rename_suspect") {
      questions.push("Confirm whether the source field and receiver concept are the same business meaning before mapping.");
    }
    if (finding.kind === "claimed_unproven_source_field") {
      questions.push("Find schema, fixture, generated type, sample, or runtime evidence before claiming this source field exists.");
    }
  }
  return uniqueStrings(questions);
}

function buildVerification(findings, gaps, explicitVerification) {
  const suggestions = [];
  if (explicitVerification) suggestions.push(explicitVerification);
  if (gaps.some((gap) => gap.kind === "missing_field")) {
    suggestions.push("Add or update a fixture covering the missing receiver field.");
  }
  if (gaps.some((gap) => gap.kind === "optionality_drift")) {
    suggestions.push("Add a sample or parser test for absent/null source values.");
  }
  if (gaps.some((gap) => gap.kind === "enum_status_collapse") || findings.some((finding) => finding.kind === "enum_status_collapse")) {
    suggestions.push("Test each known source enum/status value and the unknown-value path.");
  }
  if (findings.some((finding) => finding.kind === "unsafe_cast")) {
    suggestions.push("Replace assertions with a boundary parser, mapper, or schema check and run the smallest typecheck.");
  }
  if (findings.some((finding) => finding.kind === "fake_default")) {
    suggestions.push("Verify missing source data is represented explicitly or rejected at the boundary.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Run the smallest focused test, schema parse, typecheck, fixture check, or render path that exercises this boundary.");
  }
  return uniqueStrings(suggestions);
}

function checkpointComplete(checkpoint) {
  return Object.values(checkpoint || {}).every((status) => status === "present");
}

function presence(value) {
  return typeof value === "string" && value.trim() !== "" ? "present" : "missing";
}

function shapeInputSummary(shape) {
  return {
    path: shape.source,
    kind: shape.kind,
    symbol: shape.symbol,
    fieldCount: Object.keys(shape.fields || {}).length,
  };
}

function finish(payload, exitCode, format) {
  if (format === "md" || format === "markdown") {
    process.stdout.write(toMarkdown(payload));
  } else {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  }
  process.exitCode = exitCode;
}

function toMarkdown(payload) {
  if (payload.command === "checkpoint" || payload.command === "analyze") {
    return checkpointMarkdown(payload);
  }

  const lines = [`## Data Contracts ${titleCase(payload.command || "result")}`, ""];
  if (payload.summary) {
    lines.push(`- Severity: ${payload.summary.severity}`);
    lines.push(`- Findings: ${payload.summary.findingCount}`);
    lines.push(`- Gaps: ${payload.summary.gapCount}`);
    lines.push("");
  }
  if (payload.findings?.length) {
    lines.push("### Findings", "");
    for (const finding of payload.findings) {
      lines.push(`- ${finding.kind}: ${finding.evidence || finding.contractRisk}`);
    }
    lines.push("");
  }
  if (payload.gaps?.length) {
    lines.push("### Gaps", "");
    for (const gap of payload.gaps) {
      lines.push(`- ${gap.kind}: ${gap.message}`);
    }
    lines.push("");
  }
  if (payload.verification?.length) {
    lines.push("### Verification", "");
    for (const item of payload.verification) lines.push(`- ${item}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function checkpointMarkdown(payload) {
  const values = payload.values || {};
  const checkpoint = payload.checkpoint || {};
  const lines = ["## Data Contracts Checkpoint", ""];
  for (const [key, label] of CHECKPOINT_FIELDS) {
    const status = checkpoint[key] === "present" ? "" : " _(missing)_";
    lines.push(`- **${label}**: ${values[key] || ""}${status}`);
  }
  if (payload.findings?.length) {
    lines.push("", "### Findings", "");
    for (const finding of payload.findings) {
      lines.push(`- ${finding.kind}: ${finding.evidence}`);
    }
  }
  if (payload.gaps?.length) {
    lines.push("", "### Gaps", "");
    for (const gap of payload.gaps) lines.push(`- ${gap.kind}: ${gap.message}`);
  }
  if (payload.verification?.length) {
    lines.push("", "### Verification", "");
    for (const item of payload.verification) lines.push(`- ${item}`);
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw inputError(`Invalid JSON in ${label || "input"}: ${error.message}`);
  }
}

async function readText(location) {
  if (location === "-") {
    return await readStdin();
  }
  return await readFile(location, "utf8");
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      text += chunk;
    });
    process.stdin.on("end", () => resolve(text));
    process.stdin.on("error", reject);
  });
}

function inferKind(file) {
  if (file === "-") return "json";
  const basename = path.basename(file).toLowerCase();
  if (basename.endsWith(".schema.json")) return "json-schema";
  if (basename.endsWith(".openapi.json") || basename === "openapi.json") return "openapi";
  if (basename.endsWith(".json")) return "json";
  if (basename.endsWith(".ts") || basename.endsWith(".tsx")) return "typescript";
  if (basename.endsWith(".py")) return "python";
  return "json";
}

function inferValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  return typeof value;
}

function inferArrayItem(values) {
  const firstDefined = values.find((value) => value !== null && value !== undefined);
  if (firstDefined === undefined) return { type: "unknown", nullable: values.some((value) => value === null) };
  return {
    type: inferValueType(firstDefined),
    nullable: values.some((value) => value === null),
  };
}

function sampleEnum(name, value) {
  if (typeof value !== "string") return undefined;
  if (!/status|state|kind|type|mode|role/i.test(name)) return undefined;
  return [value];
}

function typeFromSchema(schema) {
  const rawType = schema?.type;
  const types = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];
  const nullable = Boolean(schema?.nullable) || types.includes("null");
  const nonNullTypes = types.filter((type) => type !== "null");
  return {
    type: nonNullTypes[0] || (schema?.properties ? "object" : "unknown"),
    nullable,
  };
}

function normalizeFieldName(name) {
  return String(name).replace(/[_-]/g, "").toLowerCase();
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sameStringSet(left, right) {
  const leftSet = new Set(left.map(String));
  const rightSet = new Set(right.map(String));
  if (leftSet.size !== rightSet.size) return false;
  for (const item of leftSet) {
    if (!rightSet.has(item)) return false;
  }
  return true;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function titleCase(value) {
  return String(value).replace(/^\w/, (letter) => letter.toUpperCase());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function inputError(message) {
  const error = new Error(message);
  error.inputError = true;
  return error;
}

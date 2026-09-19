import {
  boundSnippet,
  dedupeBy,
  FINDING_MESSAGES,
  inputError,
} from "./model.mjs";

const QUALIFYING_CONFIDENCE = new Set(["medium", "high"]);

export function scanDiff(text, fallbackFile = "-") {
  const lines = parseDiffLines(text, fallbackFile);
  if (lines.some((line) =>
    line.scan && (!line.targetFile || !Number.isInteger(line.line))
  )) {
    throw inputError(
      "Added diff lines require a target file header and unified-diff hunk location.",
      {
        kind: "invalid_diff_location",
        nextStep: "Provide a unified diff containing +++ target-file and @@ hunk headers.",
      },
    );
  }
  const findings = [];
  const mappingLocations = new Map();
  const lexicalStates = new Map();

  for (const line of lines) {
    const original = line.text.trim();
    const lexicalState = lexicalStates.get(line.file) || {
      blockComment: false,
      template: false,
    };
    const code = stripCommentsAndLiterals(line.text, lexicalState).trim();
    line.lexicalText = code;
    lexicalStates.set(line.file, lexicalState);
    if (line.scan === false || !original || !code) continue;

    const nearby = lines
      .slice(Math.max(0, line.index - 7), line.index + 3)
      .filter((item) => item.file === line.file)
      .map((item) => item.lexicalText || item.text || "")
      .join("\n");
    const boundaryRelated = hasBoundaryAnchor(`${nearby}\n${code}`);

    if (
      boundaryRelated &&
      (/\bas\s+unknown\s+as\s+[A-Za-z_$][A-Za-z0-9_$]*/.test(code) ||
        /\b(?:api|payload|response|row|vendor|sdk|external)[A-Za-z0-9_$]*\.[A-Za-z_$][A-Za-z0-9_$]*!/.test(code) ||
        /\b(?:api|payload|response|row|vendor|sdk|external)[A-Za-z0-9_$.[\]]*\s+as\s+(?!const\b|unknown\b)[A-Za-z_$][A-Za-z0-9_$]*/.test(code))
    ) {
      findings.push(finding("unsafe_cast", "error", "high", line, original, true));
    }
    if (
      boundaryRelated &&
      (/\bas\s+[A-Za-z0-9_$]*Status\b/.test(code) ||
        /\bstatus\s*:\s*[^,;]+\bas\s+[A-Za-z0-9_$]+/.test(code))
    ) {
      findings.push(finding("enum_status_collapse", "error", "high", line, original, true));
    }

    const memberAccesses = [
      ...code.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\.([A-Za-z_$][A-Za-z0-9_$]*)\b/g),
    ];
    const fallbackOperators = (code.match(/\|\||\?\?/g) || []).length;
    const mappingFallback =
      /^\s*[A-Za-z_$][A-Za-z0-9_$]*\s*:/.test(code) ||
      /^\s*(?:(?:const|let|var)\s+)?(?:displayName|avatarUrl|email|status|price|permission|role)\s*=/.test(code) ||
      /^\s*(?:[A-Za-z_$][A-Za-z0-9_$]*\.)+[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(code);
    if (boundaryRelated && mappingFallback && fallbackOperators >= 2 && memberAccesses.length >= 3) {
      const bases = new Set(memberAccesses.slice(0, 3).map((match) => match[1]));
      const names = new Set(memberAccesses.slice(0, 3).map((match) => match[2]));
      if (bases.size === 1 && names.size >= 2) {
        findings.push(finding(
          "guessed_multi_field_fallback",
          "warning",
          "high",
          line,
          original,
          true,
        ));
      }
    }

    if (
      boundaryRelated &&
      /\b(?:workflowKind|category|permissionLevel)\s*:\s*[A-Za-z_$][A-Za-z0-9_$]*\.status\b/.test(code)
    ) {
      findings.push(finding(
        "semantic_rename_suspect",
        "error",
        "high",
        line,
        original,
        true,
      ));
    }

    const semanticDefault =
      /(?:^|[,{]\s*)[A-Za-z0-9_$]*(?:Url|URL|Name|Email|Status|Price|Permission|Role)[A-Za-z0-9_$]*\s*:\s*(?:""|''|null)\s*[,}]/i.test(original);
    const propertyInCode =
      /(?:^|[,{]\s*)[A-Za-z0-9_$]*(?:Url|URL|Name|Email|Status|Price|Permission|Role)[A-Za-z0-9_$]*\s*:\s*(?:null\s*)?[,}]/i.test(code);
    if (
      boundaryRelated &&
      semanticDefault &&
      propertyInCode &&
      !isTestLikeFile(line.file)
    ) {
      findings.push(finding("fake_default", "warning", "medium", line, original, true));
    }
    const semanticFallback =
      mappingFallback &&
      fallbackOperators >= 1 &&
      memberAccesses.length >= 1 &&
      /(?:\?\?|\|\|)\s*(?:""|''|null|false|0|\[\]|\{\})\s*[,;}]?\s*$/.test(original);
    if (
      boundaryRelated &&
      semanticFallback &&
      !isTestLikeFile(line.file)
    ) {
      findings.push(finding("fake_default", "warning", "medium", line, original, true));
    }

    const mapping = code.match(
      /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*([A-Za-z_$][A-Za-z0-9_$]*\.[A-Za-z_$][A-Za-z0-9_$]*)\s*,?$/,
    );
    if (
      mapping &&
      /^(?:api|payload|row|vendor|sdk|response|external)/i.test(mapping[2].split(".")[0])
    ) {
      const key = `${mapping[1]}:${mapping[2]}`;
      const locations = mappingLocations.get(key) || [];
      locations.push(line);
      mappingLocations.set(key, locations);
    }
  }

  for (const [mapping, locations] of mappingLocations) {
    const files = new Set(locations.map((item) => item.file));
    if (files.size < 2) continue;
    findings.push(finding(
      "scattered_mapper",
      "warning",
      "medium",
      locations[0],
      mapping,
      false,
    ));
  }

  return dedupeBy(
    findings.filter((item) => QUALIFYING_CONFIDENCE.has(item.confidence)),
    (item) => `${item.kind}:${item.file}:${item.line}:${item.evidence}`,
  ).sort((left, right) =>
    `${left.file}:${String(left.line).padStart(10, "0")}:${left.kind}`.localeCompare(
      `${right.file}:${String(right.line).padStart(10, "0")}:${right.kind}`,
    ));
}

function finding(kind, severity, confidence, line, evidence, requiresSemanticDecision) {
  return {
    kind,
    severity,
    confidence,
    scope: "heuristic",
    file: line.file,
    line: line.line,
    evidence: boundSnippet(evidence),
    message: FINDING_MESSAGES[kind],
    dataRisk: FINDING_MESSAGES[kind],
    requiresSemanticDecision,
  };
}

function parseDiffLines(text, fallbackFile) {
  const result = [];
  let file = fallbackFile;
  let newLine = null;
  let targetFile = false;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith("diff --git ")) {
      newLine = null;
      targetFile = false;
      continue;
    }
    const fileMatch = raw.match(/^\+\+\+\s+(?:b\/)?(.+)$/);
    if (fileMatch) {
      file = fileMatch[1];
      targetFile = file !== "/dev/null";
      continue;
    }
    const hunk = raw.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      result.push({
        file,
        line: newLine,
        text: raw.slice(1),
        index: result.length,
        scan: true,
        targetFile,
      });
      if (newLine !== null) newLine += 1;
    } else if (raw.startsWith(" ") && newLine !== null) {
      result.push({
        file,
        line: newLine,
        text: raw.slice(1),
        index: result.length,
        scan: false,
        targetFile,
      });
      newLine += 1;
    }
  }
  return result;
}

function hasBoundaryAnchor(text) {
  return /\b(?:api|payload|response|row|vendor|sdk|external|schema|dto|webhook|adapter|mapper|parse|deserialize|serialize|contract)\b/i.test(
    text,
  );
}

function stripCommentsAndLiterals(text, state = { blockComment: false, template: false }) {
  let result = "";
  let quote = state.template ? "`" : null;
  let escaped = false;
  let regex = false;
  let regexClass = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (state.blockComment) {
      result += " ";
      if (char === "*" && text[index + 1] === "/") {
        result += " ";
        state.blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      result += " ";
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) {
        quote = null;
        if (char === "`") state.template = false;
      }
      continue;
    }
    if (regex) {
      result += " ";
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "[") regexClass = true;
      else if (char === "]") regexClass = false;
      else if (char === "/" && !regexClass) {
        regex = false;
        while (/[A-Za-z]/.test(text[index + 1] || "")) {
          result += " ";
          index += 1;
        }
      }
      continue;
    }
    if (["\"", "'", "`"].includes(char)) {
      quote = char;
      if (char === "`") state.template = true;
      result += " ";
      continue;
    }
    if (char === "/" && text[index + 1] === "/") break;
    if (char === "/" && text[index + 1] === "*") {
      result += "  ";
      state.blockComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && looksLikeRegexStart(result)) {
      regex = true;
      regexClass = false;
      escaped = false;
      result += " ";
      continue;
    }
    result += char;
  }
  return result;
}

function looksLikeRegexStart(result) {
  const previous = result.trimEnd();
  if (!previous) return true;
  if (/[=(:,[!&|?{};]$/.test(previous)) return true;
  return /(?:\b(?:return|throw|case|delete|typeof|void|yield)|=>)\s*$/.test(previous);
}

function isTestLikeFile(file) {
  return /(?:^|\/)(?:test|tests|__tests__|fixtures)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i.test(
    String(file),
  );
}

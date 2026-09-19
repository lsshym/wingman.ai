import {
  arrayItemPath,
  contractDepthExceeded,
  contractDocument,
  diagnostic,
  inputError,
  MAX_CONTRACT_DEPTH,
  node,
  propertyPath,
  sameContractConstraint,
} from "./model.mjs";

export function extractPythonContract(text, input) {
  const parser = new PythonParser(text);
  parser.readClasses();
  const symbol = input.symbol || parser.classes.keys().next().value;
  if (!symbol) throw inputError("No Python class with annotated fields found");
  if (!parser.classes.has(symbol)) throw inputError(`Python class not found: ${symbol}`);
  return contractDocument({
    input: { ...input, symbol },
    root: parser.resolveReference(symbol, "$", true, []),
    diagnostics: parser.diagnostics,
    assurance: "declared",
  });
}

class PythonParser {
  constructor(text) {
    this.lines = text.split(/\r?\n/);
    this.classes = new Map();
    this.diagnostics = [];
  }

  readClasses() {
    for (let index = 0; index < this.lines.length; index += 1) {
      const classMatch = this.lines[index].match(/^(\s*)class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?\s*:/);
      if (!classMatch) continue;
      const classIndent = classMatch[1].length;
      const name = classMatch[2];
      const bases = classMatch[3] ? splitTopLevel(classMatch[3], ",") : [];
      const fields = [];
      let bodyIndent = null;
      for (let bodyIndex = index + 1; bodyIndex < this.lines.length; bodyIndex += 1) {
        const raw = this.lines[bodyIndex];
        if (!raw.trim()) continue;
        const indent = raw.match(/^\s*/)[0].length;
        if (indent <= classIndent) break;
        if (bodyIndent === null) bodyIndent = indent;
        if (indent !== bodyIndent) continue;
        const field = parseField(raw.trim());
        if (field) fields.push(field);
        else if (!raw.trim().startsWith("#") && !raw.trim().startsWith('"""')) {
          if (/^(?:async\s+)?def\s+/.test(raw.trim())) continue;
          this.diagnostics.push(diagnostic(
            "python_member_unsupported",
            `Unsupported Python class member in ${name}: ${raw.trim()}`,
            { path: `$.${name}` },
          ));
        }
      }
      this.classes.set(name, { fields, bases });
    }
  }

  resolveReference(name, path, required, stack, depth = 0) {
    if (contractDepthExceeded(depth, path, this.diagnostics)) {
      return node({ path, required });
    }
    if (stack.includes(name)) {
      this.diagnostics.push(diagnostic(
        "cyclic_type_reference",
        `Cyclic Python type reference: ${[...stack, name].join(" -> ")}.`,
        { path },
      ));
      return node({ path, required });
    }
    const definition = this.classes.get(name);
    if (!definition) {
      this.diagnostics.push(diagnostic("unresolved_type_reference", `Python type not found: ${name}.`, { path }));
      return node({ path, required, rawType: name });
    }
    const properties = Object.create(null);
    for (const base of definition.bases) {
      const baseName = base.trim();
      if (["object", "BaseModel", "TypedDict"].includes(baseName)) continue;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(baseName)) {
        this.diagnostics.push(diagnostic("python_inheritance_unsupported", `Unsupported Python base type: ${baseName}.`, { path }));
        continue;
      }
      if (!this.classes.has(baseName)) {
        this.diagnostics.push(diagnostic("unresolved_type_reference", `Python base type not found: ${baseName}.`, { path }));
        continue;
      }
      const resolvedBase = this.resolveReference(baseName, path, true, [...stack, name], depth);
      this.mergeInheritedProperties(properties, resolvedBase.properties || {}, path);
    }
    for (const field of definition.fields) {
      const resolvedField = this.resolveAst(
        parseAnnotation(field.annotation),
        propertyPath(path, field.name),
        field.required,
        [...stack, name],
        depth + 1,
      );
      this.mergeInheritedProperties(properties, { [field.name]: resolvedField }, path);
    }
    return node({ path, required, kind: "object", properties });
  }

  mergeInheritedProperties(properties, incoming, path) {
    for (const [name, candidate] of Object.entries(incoming)) {
      const existing = properties[name];
      if (existing && !sameContractConstraint(existing, candidate)) {
        this.diagnostics.push(diagnostic(
          "python_inheritance_field_conflict",
          `Inherited Python declarations disagree on ${propertyPath(path, name)}.`,
          { path: propertyPath(path, name) },
        ));
        continue;
      }
      properties[name] = candidate;
    }
  }

  resolveAst(ast, path, required, stack, depth = 0) {
    if (contractDepthExceeded(depth, path, this.diagnostics)) {
      return node({ path, required });
    }
    if (ast.kind === "reference") return this.resolveReference(ast.name, path, required, stack, depth);
    if (ast.kind === "array") {
      return node({
        path,
        required,
        kind: "array",
        nullable: ast.nullable || false,
        items: this.resolveAst(ast.items, arrayItemPath(path), true, stack, depth + 1),
      });
    }
    if (ast.kind === "object") {
      if (ast.keys && !pythonMappingKeySupported(ast.keys)) {
        this.diagnostics.push(diagnostic(
          "python_mapping_key_unsupported",
          "Mapping key annotation cannot be normalized safely as JSON object keys.",
          { path },
        ));
      }
      return node({
        path,
        required,
        kind: "object",
        nullable: ast.nullable || false,
        properties: {},
        additionalProperties: ast.values ? this.resolveAst(ast.values, `${path}{}`, true, stack, depth + 1) : true,
      });
    }
    if (ast.kind === "literal") {
      return node({
        path,
        required,
        kind: ast.valueType,
        nullable: ast.nullable || false,
        enumValues: ast.values,
      });
    }
    if (ast.kind === "object_keyword") {
      this.diagnostics.push(diagnostic(
        "python_object_unsupported",
        "Python object does not provide a deterministic JSON value shape.",
        { path },
      ));
      return node({ path, required, nullable: ast.nullable || false, rawType: "object" });
    }
    if (["string", "number", "integer", "boolean", "unknown"].includes(ast.kind)) {
      return node({ path, required, kind: ast.kind, nullable: ast.nullable || false });
    }
    this.diagnostics.push(diagnostic(
      ast.diagnosticKind || "python_type_unsupported",
      ast.diagnosticKind === "contract_depth_limit"
        ? `Contract nesting exceeds ${MAX_CONTRACT_DEPTH} levels.`
        : `Unsupported Python annotation: ${ast.raw}.`,
      { path },
    ));
    return node({ path, required, nullable: ast.nullable || false, rawType: ast.raw });
  }

}

function parseField(line) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
  if (!match) return null;
  const { annotation, defaultValue } = splitDefault(match[2]);
  return { name: match[1], annotation: annotation.trim(), required: pythonFieldRequired(defaultValue) };
}

function splitDefault(text) {
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (["\"", "'"].includes(char)) quote = char;
    else if (["[", "(", "{"].includes(char)) depth += 1;
    else if (["]", ")", "}"].includes(char)) depth -= 1;
    else if (char === "=" && depth === 0) {
      return { annotation: text.slice(0, index), defaultValue: text.slice(index + 1).trim() };
    }
  }
  return { annotation: text };
}

function parseAnnotation(raw, depth = 0) {
  if (depth > MAX_CONTRACT_DEPTH) {
    return { kind: "unsupported", raw: "depth-limit", diagnosticKind: "contract_depth_limit" };
  }
  const text = raw.trim().replace(/^typing\./, "");
  const pipeParts = splitTopLevel(text, "|");
  if (pipeParts.length > 1) return parseUnion(pipeParts, depth + 1);
  const generic = text.match(/^([A-Za-z_][A-Za-z0-9_.]*)\[(.*)\]$/);
  if (generic) {
    const name = generic[1].replace(/^typing\./, "");
    const body = generic[2];
    if (name === "Optional") return { ...parseAnnotation(body, depth + 1), nullable: true };
    if (name === "Union") return parseUnion(splitTopLevel(body, ","), depth + 1);
    if (name === "Literal") {
      const parsedValues = splitTopLevel(body, ",").map(parseLiteralValue);
      if (parsedValues.some((value) => !value.ok)) {
        return { kind: "unsupported", raw: text, diagnosticKind: "python_literal_unsupported" };
      }
      const nullable = parsedValues.some((item) => item.value === null);
      const values = parsedValues.map((item) => item.value).filter((value) => value !== null);
      const valueTypes = new Set(values.map(literalKind));
      if (values.length === 0 || valueTypes.size !== 1) {
        return { kind: "unsupported", raw: text, nullable, diagnosticKind: "python_literal_unsupported" };
      }
      return {
        kind: "literal",
        values,
        valueType: valueTypes.values().next().value,
        nullable,
      };
    }
    if (["list", "List", "Sequence", "Iterable", "set", "Set"].includes(name)) {
      return { kind: "array", items: parseAnnotation(body, depth + 1) };
    }
    if (["dict", "Dict", "Mapping"].includes(name)) {
      const parts = splitTopLevel(body, ",");
      if (parts.length !== 2) {
        return { kind: "unsupported", raw: text, diagnosticKind: "python_mapping_arity" };
      }
      return {
        kind: "object",
        keys: parseAnnotation(parts[0], depth + 1),
        values: parseAnnotation(parts[1], depth + 1),
      };
    }
    return { kind: "unsupported", raw: text };
  }

  const primitives = {
    str: "string",
    int: "integer",
    float: "number",
    bool: "boolean",
    Any: "unknown",
    object: "object_keyword",
  };
  if (primitives[text]) return { kind: primitives[text] };
  if (text === "None") return { kind: "null", nullable: true };
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) return { kind: "reference", name: text };
  return { kind: "unsupported", raw: text };
}

function parseUnion(parts, depth = 0) {
  const parsed = parts.map((part) => parseAnnotation(part, depth));
  const nullable = parsed.some((item) => item.kind === "null");
  const members = parsed.filter((item) => item.kind !== "null");
  if (members.length === 1) return { ...members[0], nullable: members[0].nullable || nullable };
  if (members.length > 0 && members.every((item) => item.kind === "literal")) {
    const kinds = new Set(members.map((item) => item.valueType));
    if (kinds.size !== 1) {
      return { kind: "unsupported", raw: parts.join(" | "), nullable, diagnosticKind: "python_literal_unsupported" };
    }
    return {
      kind: "literal",
      values: members.flatMap((item) => item.values),
      valueType: members[0].valueType,
      nullable,
    };
  }
  const kinds = new Set(members.map((item) => item.kind));
  if (kinds.size === 1 && members.length > 0 && members.every((item) => astEqual(item, members[0]))) {
    return { ...members[0], nullable: members.some((item) => item.nullable) || nullable };
  }
  return { kind: "unsupported", raw: parts.join(" | "), nullable, diagnosticKind: "python_union_unsupported" };
}

function splitTopLevel(text, delimiter) {
  const result = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (["\"", "'"].includes(char)) quote = char;
    else if (["[", "(", "{"].includes(char)) depth += 1;
    else if (["]", ")", "}"].includes(char)) depth -= 1;
    else if (char === delimiter && depth === 0) {
      result.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(text.slice(start).trim());
  return result.filter(Boolean);
}

function parseLiteralValue(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return { ok: true, value: value.slice(1, -1) };
  }
  if (value === "True") return { ok: true, value: true };
  if (value === "False") return { ok: true, value: false };
  if (value === "None") return { ok: true, value: null };
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return { ok: true, value: Number(value) };
  return { ok: false, value };
}

function literalKind(value) {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (typeof value === "boolean") return "boolean";
  return "unknown";
}

function pythonFieldRequired(defaultValue) {
  if (defaultValue === undefined) return true;
  const value = defaultValue.trim();
  if (value === "...") return true;
  const field = value.match(/^Field\((.*)\)$/);
  if (!field) return false;
  const argumentsList = splitTopLevel(field[1], ",");
  const defaultArgument = argumentsList.find((item) => /^default\s*=/.test(item));
  if (defaultArgument) return /^default\s*=\s*\.\.\.$/.test(defaultArgument);
  if (argumentsList.some((item) => /^default_factory\s*=/.test(item))) return false;
  const firstPositional = argumentsList.find((item) => !item.includes("="));
  if (firstPositional) return firstPositional.trim() === "...";
  return true;
}

function astEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pythonMappingKeySupported(ast) {
  if (!ast) return false;
  if (ast.kind === "string") return true;
  if (ast.kind === "literal") return ast.valueType === "string";
  return false;
}

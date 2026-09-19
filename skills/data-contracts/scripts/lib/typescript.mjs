import {
  arrayItemPath,
  contractDepthExceeded,
  contractDocument,
  diagnostic,
  inputError,
  node,
  propertyPath,
  sameContractConstraint,
  unique,
} from "./model.mjs";

export function extractTypeScriptContract(text, input) {
  const parser = new TypeScriptParser(text);
  parser.readDeclarations();
  const symbol = input.symbol || parser.declarations.keys().next().value;
  if (!symbol) throw inputError("No TypeScript interface or type declaration found");
  if (!parser.declarations.has(symbol)) throw inputError(`TypeScript symbol not found: ${symbol}`);
  return contractDocument({
    input: { ...input, symbol },
    root: parser.resolveReference(symbol, "$", true, []),
    diagnostics: parser.diagnostics,
    assurance: "declared",
  });
}

class TypeScriptParser {
  constructor(text) {
    this.tokens = tokenize(text);
    this.index = 0;
    this.declarations = new Map();
    this.diagnostics = [];
    for (const token of this.tokens) {
      if (token.unterminated) {
        this.diagnostics.push(diagnostic(
          "typescript_string_unterminated",
          "TypeScript string literal is not terminated.",
          { path: "$" },
        ));
      }
      if (token.invalidEscape) {
        this.diagnostics.push(diagnostic(
          "typescript_string_escape_unsupported",
          "TypeScript string literal contains an unsupported escape sequence.",
          { path: "$" },
        ));
      }
    }
  }

  readDeclarations() {
    while (!this.atEnd()) {
      while (["export", "declare", "default"].includes(this.peek().value)) this.advance();
      if (this.matchValue("interface")) {
        this.readInterface();
        continue;
      }
      if (this.matchValue("type")) {
        this.readTypeAlias();
        continue;
      }
      this.advance();
    }
  }

  readInterface() {
    const name = this.consumeIdentifier("Expected interface name");
    if (!name) return;
    if (this.peek().value === "<") this.skipBalanced("<", ">", "generic_interface");
    const bases = [];
    if (this.matchValue("extends")) {
      while (!this.atEnd() && this.peek().value !== "{") {
        if (this.peek().type === "identifier") bases.push(this.advance().value);
        else this.advance();
        this.matchValue(",");
      }
    }
    const ast = this.readObjectType(0);
    ast.bases = bases;
    this.setDeclaration(name, ast);
  }

  readTypeAlias() {
    const name = this.consumeIdentifier("Expected type alias name");
    if (!name) return;
    if (this.peek().value === "<") this.skipBalanced("<", ">", "generic_type_alias");
    if (!this.matchValue("=")) {
      this.addDiagnostic("typescript_parse_error", `Expected '=' after type alias ${name}.`);
      return;
    }
    const ast = this.readType(0);
    if (this.peek().value === "&") {
      this.addDiagnostic("typescript_intersection_unsupported", `Type alias ${name} uses an unsupported intersection.`);
      while (!this.atEnd() && this.peek().value !== ";") this.advance();
    } else if (!this.atEnd() && this.peek().value !== ";") {
      this.addDiagnostic(
        "typescript_type_expression_unsupported",
        `Type alias ${name} contains unsupported syntax beginning with ${this.peek().value}.`,
      );
      while (!this.atEnd() && this.peek().value !== ";") this.advance();
    }
    this.setDeclaration(name, ast);
    this.matchValue(";");
  }

  readType(depth = 0) {
    const members = [this.readPostfixType(depth)];
    while (this.matchValue("|")) members.push(this.readPostfixType(depth));
    return members.length === 1 ? members[0] : { kind: "union", members };
  }

  readPostfixType(depth = 0) {
    let value = this.readPrimaryType(depth);
    while (this.peek().value === "[" && this.peek(1).value === "]") {
      this.advance();
      this.advance();
      value = { kind: "array", items: value };
    }
    return value;
  }

  readPrimaryType(depth = 0) {
    if (contractDepthExceeded(depth, "$", this.diagnostics)) {
      this.skipCurrentType();
      return { kind: "unsupported", raw: "depth-limit" };
    }
    if (this.matchValue("readonly")) return this.readPostfixType(depth);
    if (this.matchValue("(")) {
      const inner = this.readType(depth + 1);
      if (!this.matchValue(")")) this.addDiagnostic("typescript_parse_error", "Unclosed parenthesized type.");
      return inner;
    }
    if (this.peek().value === "{") return this.readObjectType(depth);
    if (this.peek().value === "[") {
      this.skipBalanced("[", "]", "typescript_tuple_unsupported");
      return { kind: "unsupported", raw: "tuple" };
    }

    const token = this.advance();
    if (token.type === "string") return { kind: "literal", value: token.value, valueType: "string" };
    if (token.type === "number") {
      const value = Number(token.value);
      if (!/^\d+(?:\.\d*)?$/.test(token.value) || !Number.isFinite(value)) {
        this.addDiagnostic("typescript_parse_error", `Invalid numeric literal ${token.value}.`);
        return { kind: "unsupported", raw: token.value };
      }
      return { kind: "literal", value, valueType: "number" };
    }
    if (token.type !== "identifier") {
      this.addDiagnostic("typescript_parse_error", `Unexpected token ${token.value || "<eof>"} in type.`);
      return { kind: "unsupported", raw: token.value };
    }

    const primitives = {
      string: "string",
      number: "number",
      boolean: "boolean",
      bigint: "integer",
      null: "null",
      undefined: "undefined",
      unknown: "unknown",
      any: "unknown",
      object: "object_keyword",
    };
    if (primitives[token.value]) return { kind: primitives[token.value] };
    if (["Array", "ReadonlyArray"].includes(token.value) && this.matchValue("<")) {
      const items = this.readType(depth + 1);
      if (!this.matchValue(">")) this.addDiagnostic("typescript_parse_error", `Unclosed ${token.value} type.`);
      return { kind: "array", items };
    }
    if (["Record", "Readonly"].includes(token.value) && this.matchValue("<")) {
      if (token.value === "Readonly") {
        const inner = this.readType(depth + 1);
        if (!this.matchValue(">")) this.addDiagnostic("typescript_parse_error", "Unclosed Readonly type.");
        return inner;
      }
      const keys = this.readType(depth + 1);
      if (!this.matchValue(",")) this.addDiagnostic("typescript_parse_error", "Record requires key and value types separated by a comma.");
      const values = this.readType(depth + 1);
      if (!this.matchValue(">")) this.addDiagnostic("typescript_parse_error", "Unclosed Record type.");
      return { kind: "record", keys, values };
    }
    if (this.peek().value === "<") {
      this.skipBalanced("<", ">", "typescript_generic_unsupported");
      return { kind: "unsupported", raw: token.value };
    }
    return { kind: "reference", name: token.value };
  }

  readObjectType(depth = 0) {
    if (!this.matchValue("{")) {
      this.addDiagnostic("typescript_parse_error", "Expected object type body.");
      return { kind: "object", properties: [] };
    }
    const properties = [];
    while (!this.atEnd() && this.peek().value !== "}") {
      this.matchValue("readonly");
      const key = this.advance();
      if (!["identifier", "string"].includes(key.type)) {
        this.addDiagnostic("typescript_member_unsupported", `Unsupported object member near ${key.value}.`);
        this.skipMember();
        continue;
      }
      const optional = this.matchValue("?");
      if (!this.matchValue(":")) {
        this.addDiagnostic("typescript_member_unsupported", `Only property signatures are supported (${key.value}).`);
        this.skipMember();
        continue;
      }
      properties.push({ name: key.value, optional, type: this.readType(depth + 1) });
      this.matchValue(";");
      this.matchValue(",");
    }
    if (!this.matchValue("}")) this.addDiagnostic("typescript_parse_error", "Unclosed object type body.");
    return { kind: "object", properties };
  }

  resolveReference(name, path, required, stack, depth = 0) {
    if (contractDepthExceeded(depth, path, this.diagnostics)) {
      return node({ path, required });
    }
    if (stack.includes(name)) {
      this.diagnostics.push(diagnostic(
        "cyclic_type_reference",
        `Cyclic TypeScript type reference: ${[...stack, name].join(" -> ")}.`,
        { path },
      ));
      return node({ path, required });
    }
    const ast = this.declarations.get(name);
    if (!ast) {
      this.diagnostics.push(diagnostic("unresolved_type_reference", `TypeScript type not found: ${name}.`, { path }));
      return node({ path, required, rawType: name });
    }
    return this.resolveAst(ast, path, required, [...stack, name], depth);
  }

  resolveAst(ast, path, required, stack, depth = 0) {
    if (contractDepthExceeded(depth, path, this.diagnostics)) {
      return node({ path, required });
    }
    if (!ast) return node({ path, required });
    if (ast.kind === "reference") return this.resolveReference(ast.name, path, required, stack, depth);
    if (ast.kind === "literal") {
      return node({ path, required, kind: ast.valueType, enumValues: [ast.value] });
    }
    if (ast.kind === "union") return this.resolveUnion(ast, path, required, stack, depth);
    if (ast.kind === "array") {
      return node({
        path,
        required,
        kind: "array",
        items: this.resolveAst(ast.items, arrayItemPath(path), true, stack, depth + 1),
      });
    }
    if (ast.kind === "record") {
      if (!typescriptRecordKeySupported(ast.keys)) {
        this.diagnostics.push(diagnostic(
          "typescript_record_key_unsupported",
          "Record key type cannot be normalized safely as JSON object keys.",
          { path },
        ));
      }
      return node({
        path,
        required,
        kind: "object",
        properties: {},
        additionalProperties: this.resolveAst(ast.values, `${path}{}`, true, stack, depth + 1),
      });
    }
    if (ast.kind === "object") {
      const properties = Object.create(null);
      for (const base of ast.bases || []) {
        const resolved = this.resolveReference(base, path, true, stack, depth);
        if (resolved.kind === "object") {
          this.mergeInheritedProperties(
            properties,
            resolved.properties || {},
            path,
          );
        }
        else this.diagnostics.push(diagnostic("typescript_extends_non_object", `Interface extends non-object type ${base}.`, { path }));
      }
      for (const field of ast.properties || []) {
        const resolvedField = this.resolveAst(
          field.type,
          propertyPath(path, field.name),
          !field.optional,
          stack,
          depth + 1,
        );
        this.mergeInheritedProperties(
          properties,
          { [field.name]: resolvedField },
          path,
        );
      }
      return node({ path, required, kind: "object", properties });
    }
    if (ast.kind === "object_keyword") {
      this.diagnostics.push(diagnostic(
        "typescript_object_unsupported",
        "TypeScript object does not provide a deterministic JSON object shape.",
        { path },
      ));
      return node({ path, required, rawType: "object" });
    }
    if (["string", "number", "integer", "boolean", "unknown"].includes(ast.kind)) {
      return node({ path, required, kind: ast.kind });
    }
    if (ast.kind === "null") {
      return node({ path, required, nullable: true, rawType: ast.kind });
    }
    if (ast.kind === "undefined") {
      this.diagnostics.push(diagnostic(
        "typescript_undefined_unsupported",
        "undefined cannot be represented as JSON nullability or required-field evidence.",
        { path },
      ));
      return node({ path, required, rawType: ast.kind });
    }
    this.diagnostics.push(diagnostic("typescript_type_unsupported", `Unsupported TypeScript type ${ast.raw || ast.kind}.`, { path }));
    return node({ path, required, rawType: ast.raw || ast.kind });
  }

  resolveUnion(ast, path, required, stack, depth) {
    const nullable = ast.members.some((member) => member.kind === "null");
    if (ast.members.some((member) => member.kind === "undefined")) {
      this.diagnostics.push(diagnostic(
        "typescript_undefined_unsupported",
        "undefined cannot be represented as JSON nullability or required-field evidence.",
        { path },
      ));
    }
    const members = ast.members.filter((member) => !["null", "undefined"].includes(member.kind));
    const literals = members.filter((member) => member.kind === "literal");
    if (members.length > 0 && literals.length === members.length) {
      const kinds = new Set(literals.map((member) => member.valueType));
      if (kinds.size === 1) {
        return node({
          path,
          required,
          kind: literals[0].valueType,
          nullable,
          enumValues: literals.map((member) => member.value),
        });
      }
    }
    if (members.length === 1) {
      const resolved = this.resolveAst(members[0], path, required, stack, depth);
      return node({ ...resolved, path, required, nullable: resolved.nullable || nullable });
    }
    const resolved = members.map((member) => this.resolveAst(member, path, required, stack, depth));
    const kinds = new Set(resolved.map((member) => member.kind));
    if (kinds.size === 1 && resolved.length > 0) {
      const kind = resolved[0].kind;
      const combinedNullable = resolved.some((member) => member.nullable) || nullable;
      if (["string", "number", "integer", "boolean"].includes(kind)) {
        const everyMemberIsClosed = resolved.every((member) => Array.isArray(member.enumValues));
        return node({
          path,
          required,
          kind,
          nullable: combinedNullable,
          enumValues: everyMemberIsClosed ? unique(resolved.flatMap((member) => member.enumValues)) : undefined,
        });
      }
      if (resolved.every((member) => structurallyEqual(member, resolved[0]))) {
        return node({ ...resolved[0], path, required, nullable: combinedNullable });
      }
    }
    this.diagnostics.push(diagnostic("typescript_union_unsupported", "Union contains incompatible non-literal member types.", { path }));
    return node({ path, required, nullable, rawType: "union" });
  }

  addDiagnostic(kind, message) {
    this.diagnostics.push(diagnostic(kind, message));
  }

  mergeInheritedProperties(properties, incoming, path) {
    for (const [name, candidate] of Object.entries(incoming)) {
      const existing = properties[name];
      if (existing && !sameContractConstraint(existing, candidate)) {
        this.diagnostics.push(diagnostic(
          "typescript_inheritance_field_conflict",
          `Inherited TypeScript declarations disagree on ${propertyPath(path, name)}.`,
          { path: propertyPath(path, name) },
        ));
        continue;
      }
      properties[name] = candidate;
    }
  }

  setDeclaration(name, ast) {
    if (this.declarations.has(name)) {
      this.diagnostics.push(diagnostic(
        "typescript_duplicate_declaration",
        `Multiple TypeScript declarations named ${name} cannot be merged safely by the best-effort parser.`,
        { path: "$" },
      ));
    }
    this.declarations.set(name, ast);
  }

  skipMember() {
    while (!this.atEnd() && ![";", ",", "}"].includes(this.peek().value)) this.advance();
    if (this.peek().value !== "}") this.advance();
  }

  skipBalanced(open, close, kind) {
    if (this.skipBalancedTokens(open, close)) {
      this.addDiagnostic(kind, `Unsupported TypeScript syntax beginning with ${open}.`);
    }
  }

  skipCurrentType() {
    while (this.matchValue("readonly")) {
      // Continue to the actual type token without recursing.
    }
    const open = this.peek().value;
    const closeByOpen = { "{": "}", "[": "]", "(": ")", "<": ">" };
    if (closeByOpen[open]) {
      this.skipBalancedTokens(open, closeByOpen[open]);
      return;
    }
    if (this.peek().type === "identifier" && this.peek(1).value === "<") {
      this.advance();
      this.skipBalancedTokens("<", ">");
      return;
    }
    this.advance();
  }

  skipBalancedTokens(open, close) {
    if (!this.matchValue(open)) return false;
    const closeByOpen = { "{": "}", "[": "]", "(": ")", "<": ">" };
    const expected = [close];
    while (!this.atEnd() && expected.length > 0) {
      const value = this.advance().value;
      if (closeByOpen[value]) expected.push(closeByOpen[value]);
      else if (value === expected[expected.length - 1]) expected.pop();
    }
    return true;
  }

  consumeIdentifier(message) {
    if (this.peek().type === "identifier") return this.advance().value;
    this.addDiagnostic("typescript_parse_error", message);
    return null;
  }

  matchValue(value) {
    if (this.peek().value !== value) return false;
    this.advance();
    return true;
  }

  peek(offset = 0) {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  advance() {
    const current = this.peek();
    if (!this.atEnd()) this.index += 1;
    return current;
  }

  atEnd() {
    return this.peek().type === "eof";
  }
}

function tokenize(text) {
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      index = text.indexOf("\n", index + 2);
      if (index === -1) break;
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      continue;
    }
    if (["\"", "'"].includes(char)) {
      const quote = char;
      let value = "";
      let closed = false;
      let invalidEscape = false;
      index += 1;
      while (index < text.length) {
        if (text[index] === quote) {
          closed = true;
          index += 1;
          break;
        }
        if (text[index] === "\\" && index + 1 < text.length) {
          const escaped = text[index + 1];
          const escapes = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "0": "\0", "\\": "\\", "\"": "\"", "'": "'" };
          if (Object.hasOwn(escapes, escaped)) value += escapes[escaped];
          else {
            invalidEscape = true;
            value += escaped;
          }
          index += 2;
        } else {
          value += text[index];
          index += 1;
        }
      }
      tokens.push({ type: "string", value, unterminated: !closed, invalidEscape });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      index += 1;
      while (index < text.length && /[A-Za-z0-9_$]/.test(text[index])) index += 1;
      tokens.push({ type: "identifier", value: text.slice(start, index) });
      continue;
    }
    if (/[0-9]/.test(char)) {
      const start = index;
      index += 1;
      while (index < text.length && /[0-9.]/.test(text[index])) index += 1;
      tokens.push({ type: "number", value: text.slice(start, index) });
      continue;
    }
    tokens.push({ type: "punct", value: char });
    index += 1;
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

function structurallyEqual(left, right) {
  if (left.kind !== right.kind || left.nullable !== right.nullable) return false;
  if (JSON.stringify(left.enumValues || null) !== JSON.stringify(right.enumValues || null)) return false;
  if (left.kind === "array") return Boolean(left.items && right.items) && structurallyEqual(left.items, right.items);
  if (left.kind !== "object") return true;
  const leftNames = Object.keys(left.properties || {}).sort();
  const rightNames = Object.keys(right.properties || {}).sort();
  if (JSON.stringify(leftNames) !== JSON.stringify(rightNames)) return false;
  return leftNames.every((name) =>
    left.properties[name].required === right.properties[name].required &&
    structurallyEqual(left.properties[name], right.properties[name]),
  );
}

function typescriptRecordKeySupported(ast) {
  if (!ast) return false;
  if (["string", "number"].includes(ast.kind)) return true;
  if (ast.kind === "literal") return ["string", "number"].includes(ast.valueType);
  if (ast.kind === "union") return ast.members.length > 0 && ast.members.every(typescriptRecordKeySupported);
  return false;
}

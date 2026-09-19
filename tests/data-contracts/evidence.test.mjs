import assert from "node:assert/strict";
import test from "node:test";
import {
  evidence,
  fixture,
  makeFiles,
  parseJson,
  runCli,
  runRequest,
  schema,
} from "./helpers.mjs";

test("extract supports documented JSON Schema, OpenAPI, TypeScript, and Python subsets", async () => {
  const cases = [
    ["json-schema", fixture("user-schema.json"), undefined, "object"],
    ["openapi", fixture("openapi-ref.json"), "#/components/schemas/ApiEnvelope", "object"],
    ["typescript", fixture("advanced-types.ts"), "UserList", "array"],
    ["python", fixture("advanced-models.py"), "UserView", "object"],
  ];
  for (const [kind, input, selector, expectedKind] of cases) {
    const args = ["extract", "--input", input, "--kind", kind];
    if (selector) args.push("--selector", selector);
    const result = await runCli(args);
    assert.equal(result.code, 0, result.stdout);
    const payload = parseJson(result);
    assert.equal(payload.status, "no_findings");
    assert.equal(payload.normalizedEvidence.root.kind, expectedKind);
    assert.deepEqual(payload.normalizedEvidence.root.provenance, ["extract-input"]);
  }
});

test("unsupported or insufficient observations are incomplete", async () => {
  for (const [input, kind, diagnostic] of [
    [fixture("empty-array.json"), "json", "empty_array_items"],
    [fixture("heterogeneous-array.json"), "json", "heterogeneous_array_items"],
    [fixture("openapi-unresolved-ref.json"), "openapi", "unresolved_ref"],
  ]) {
    const args = ["extract", "--input", input, "--kind", kind];
    if (kind === "openapi") args.push("--selector", "ApiEnvelope");
    const result = await runCli(args);
    assert.equal(result.code, 5, result.stdout);
    const payload = parseJson(result);
    assert.equal(payload.status, "incomplete");
    assert.ok(payload.diagnostics.some((item) => item.kind === diagnostic));
  }

  const unsupported = await runCli([
    "extract",
    "--input",
    "-",
    "--kind",
    "typescript",
    "--selector",
    "Combined",
  ], "interface A { id: string }\ninterface B { name: string }\ntype Combined = A & B;\n");
  assert.equal(unsupported.code, 5);
  assert.ok(parseJson(unsupported).diagnostics.some((item) =>
    item.kind === "typescript_intersection_unsupported"
  ));
});

test("matching declared and observed evidence becomes mixed with provenance", async () => {
  const request = {
    sources: [
      evidence("schema", fixture("user-schema.json")),
      evidence("sample", fixture("api-user.json"), "json"),
    ],
    receivers: [evidence("receiver", fixture("user-schema.json"))],
  };
  const result = await runRequest("analyze", request, ["--detail"]);
  assert.equal(result.code, 0, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.status, "no_findings");
  assert.equal(payload.summary.assurance, "mixed");
  assert.deepEqual(
    payload.normalizedEvidence.source.root.properties.status.provenance,
    ["sample", "schema"],
  );
  assert.deepEqual(
    payload.normalizedEvidence.source.root.properties.status.enumValues,
    ["active", "disabled"],
  );
  assert.deepEqual(
    payload.normalizedEvidence.source.root.properties.status.observedValues,
    ["active"],
  );
});

test("multiple observations can resolve a null-only sample without proving requiredness", async (t) => {
  const files = await makeFiles(t, {
    "null.json": JSON.stringify({ email: null }),
    "value.json": JSON.stringify({ email: "ada@example.com" }),
    "receiver.schema.json": JSON.stringify({
      type: "object",
      properties: { email: { type: ["string", "null"] } },
    }),
  });
  const result = await runRequest("analyze", {
    sources: [
      evidence("null-sample", files["null.json"], "json"),
      evidence("value-sample", files["value.json"], "json"),
    ],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  }, ["--detail"]);
  assert.equal(result.code, 0, result.stdout);
  const email = parseJson(result).normalizedEvidence.source.root.properties.email;
  assert.equal(email.kind, "string");
  assert.equal(email.nullable, true);
  assert.equal(email.required, null);
});

test("observations do not manufacture required fields or closed enums", async () => {
  const result = await runCli([
    "extract",
    "--input",
    fixture("api-user.json"),
    "--kind",
    "json",
  ]);
  assert.equal(result.code, 5, "null-only email intentionally keeps this sample incomplete");
  const root = parseJson(result).normalizedEvidence.root;
  assert.equal(root.properties.id.required, null);
  assert.equal(root.properties.status.enumValues, undefined);
  assert.deepEqual(root.properties.status.observedValues, ["active"]);
});

test("an observed field cannot prove a required Receiver field is always present", async (t) => {
  const files = await makeFiles(t, {
    "sample.json": JSON.stringify({ name: "Ada" }),
    "receiver.schema.json": schema({ name: { type: "string" } }),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("sample", files["sample.json"], "json")],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 5, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.status, "incomplete");
  assert.ok(payload.diagnostics.some((item) =>
    item.kind === "source_presence_unproven" && item.path === "$.name"
  ));
});

test("all observed scalar values are checked against Receiver enums", async (t) => {
  const files = await makeFiles(t, {
    "sample.json": JSON.stringify({ tier: "enterprise" }),
    "receiver.schema.json": schema(
      { tier: { type: "string", enum: ["basic", "pro"] } },
      [],
    ),
  });
  const result = await runRequest("analyze", {
    sources: [evidence("sample", files["sample.json"], "json")],
    receivers: [evidence("receiver", files["receiver.schema.json"])],
  });
  assert.equal(result.code, 1, result.stdout);
  assert.ok(parseJson(result).findings.some((item) =>
    item.kind === "observed_value_rejected" &&
    item.sourcePath === "$.tier"
  ));
});

test("declaration conflicts and declaration/observation conflicts block analysis", async (t) => {
  const files = await makeFiles(t, {
    "open.schema.json": schema({ status: { type: "string" } }),
    "closed.schema.json": schema({
      status: { type: "string", enum: ["active", "disabled"] },
    }),
    "sample.json": JSON.stringify({ status: "archived" }),
    "integer.schema.json": schema({ count: { type: "integer" } }),
    "decimal.json": JSON.stringify({ count: 1.5 }),
  });

  const declarationConflict = await runRequest("analyze", {
    sources: [
      evidence("open", files["open.schema.json"]),
      evidence("closed", files["closed.schema.json"]),
    ],
    receivers: [evidence("receiver", files["closed.schema.json"])],
  });
  assert.equal(declarationConflict.code, 5);
  assert.ok(parseJson(declarationConflict).diagnostics.some((item) =>
    item.kind === "evidence_enum_constraint_conflict"
  ));

  const observationConflict = await runRequest("analyze", {
    sources: [
      evidence("closed", files["closed.schema.json"]),
      evidence("sample", files["sample.json"], "json"),
    ],
    receivers: [evidence("receiver", files["closed.schema.json"])],
  });
  assert.equal(observationConflict.code, 5);
  assert.ok(parseJson(observationConflict).diagnostics.some((item) =>
    item.kind === "declared_observed_value_conflict"
  ));

  const numericConflict = await runRequest("analyze", {
    sources: [
      evidence("integer", files["integer.schema.json"]),
      evidence("decimal", files["decimal.json"], "json"),
    ],
    receivers: [evidence("receiver", files["integer.schema.json"])],
  });
  assert.equal(numericConflict.code, 5);
  assert.ok(parseJson(numericConflict).diagnostics.some((item) =>
    item.kind === "declared_observed_kind_conflict"
  ));
});

test("typed additional properties validate explicit fields in observed evidence", async (t) => {
  const mapValue = {
    type: "object",
    required: ["label"],
    properties: {
      label: { type: "string" },
    },
  };
  const files = await makeFiles(t, {
    "source.schema.json": JSON.stringify({
      type: "object",
      additionalProperties: mapValue,
    }),
    "sample.json": JSON.stringify({
      extra: { label: 5 },
    }),
  });
  const result = await runRequest("analyze", {
    sources: [
      evidence("schema", files["source.schema.json"]),
      evidence("sample", files["sample.json"], "json"),
    ],
    receivers: [evidence("receiver", files["source.schema.json"])],
  });
  assert.equal(result.code, 5, result.stdout);
  assert.ok(parseJson(result).diagnostics.some((item) =>
    item.kind === "declared_observed_kind_conflict" &&
    item.path === "$.extra.label"
  ));
});

test("open declarations may contribute compatible fields while closed declarations conflict", async (t) => {
  const nestedMapValue = {
    type: "object",
    required: ["label", "tags"],
    properties: {
      label: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
  };
  const files = await makeFiles(t, {
    "base-open.schema.json": schema({ id: { type: "string" } }),
    "extended-open.schema.json": schema({
      id: { type: "string" },
      nickname: { type: "string" },
    }),
    "base-closed.schema.json": schema(
      { id: { type: "string" } },
      ["id"],
      false,
    ),
    "extended-closed.schema.json": schema(
      {
        id: { type: "string" },
        nickname: { type: "string" },
      },
      ["id", "nickname"],
      false,
    ),
    "typed-map.schema.json": schema(
      { id: { type: "string" } },
      ["id"],
      { type: "string" },
    ),
    "typed-map-explicit.schema.json": schema(
      {
        id: { type: "string" },
        nickname: { type: "string" },
      },
      ["id"],
      { type: "string" },
    ),
    "typed-nested-map.schema.json": schema(
      { id: { type: "string" } },
      ["id"],
      nestedMapValue,
    ),
    "typed-nested-map-explicit.schema.json": schema(
      {
        id: { type: "string" },
        profile: {
          type: "object",
          properties: {},
        },
      },
      ["id"],
      nestedMapValue,
    ),
    "typed-nested-map-receiver.schema.json": schema(
      {
        id: { type: "string" },
        profile: nestedMapValue,
      },
      ["id"],
      nestedMapValue,
    ),
  });

  const compatible = await runRequest("analyze", {
    sources: [
      evidence("base", files["base-open.schema.json"]),
      evidence("extended", files["extended-open.schema.json"]),
    ],
    receivers: [evidence("receiver", files["extended-open.schema.json"])],
  });
  assert.equal(compatible.code, 0, compatible.stdout);

  const optionalFieldAcceptedByTypedMap = await runRequest("analyze", {
    sources: [
      evidence("typed-map", files["typed-map.schema.json"]),
      evidence("typed-map-explicit", files["typed-map-explicit.schema.json"]),
    ],
    receivers: [
      evidence("receiver", files["typed-map-explicit.schema.json"]),
    ],
  });
  assert.equal(optionalFieldAcceptedByTypedMap.code, 0, optionalFieldAcceptedByTypedMap.stdout);
  assert.ok(!parseJson(optionalFieldAcceptedByTypedMap).diagnostics.some((item) =>
    item.kind === "evidence_presence_conflict"
  ));

  const nestedMap = await runRequest("analyze", {
    sources: [
      evidence("typed-nested-map", files["typed-nested-map.schema.json"]),
      evidence("typed-nested-map-explicit", files["typed-nested-map-explicit.schema.json"]),
    ],
    receivers: [
      evidence("receiver", files["typed-nested-map-receiver.schema.json"]),
    ],
  }, ["--detail"]);
  assert.equal(nestedMap.code, 0, nestedMap.stdout);
  const profile = parseJson(nestedMap).normalizedEvidence.source.root.properties.profile;
  assert.equal(profile.required, false);
  assert.equal(profile.path, "$.profile");
  assert.equal(profile.properties.label.path, "$.profile.label");
  assert.equal(profile.properties.tags.path, "$.profile.tags");
  assert.equal(profile.properties.tags.items.path, "$.profile.tags[]");

  const conflict = await runRequest("analyze", {
    sources: [
      evidence("base", files["base-closed.schema.json"]),
      evidence("extended", files["extended-closed.schema.json"]),
    ],
    receivers: [evidence("receiver", files["extended-closed.schema.json"])],
  });
  assert.equal(conflict.code, 5, conflict.stdout);
  assert.ok(parseJson(conflict).diagnostics.some((item) =>
    item.kind === "evidence_field_presence_conflict"
  ));
});

test("TypeScript and Python depth budgets count real shape nesting once", async () => {
  const typescript = [
    "interface N0 { value: string }",
    ...Array.from({ length: 60 }, (_, index) =>
      `interface N${index + 1} { child: N${index} }`
    ),
    "",
  ].join("\n");
  const tsResult = await runCli([
    "extract",
    "--input",
    "-",
    "--kind",
    "typescript",
    "--selector",
    "N60",
  ], typescript);
  assert.equal(tsResult.code, 0, tsResult.stdout);

  const python = [
    "class N0:",
    "    value: str",
    "",
    ...Array.from({ length: 60 }, (_, index) => [
      `class N${index + 1}:`,
      `    child: N${index}`,
      "",
    ]).flat(),
  ].join("\n");
  const pyResult = await runCli([
    "extract",
    "--input",
    "-",
    "--kind",
    "python",
    "--selector",
    "N60",
  ], python);
  assert.equal(pyResult.code, 0, pyResult.stdout);
});

test("JSON Schema ref indirection does not consume structural depth", async () => {
  const definitions = {};
  for (let index = 0; index < 70; index += 1) {
    definitions[`D${index}`] = index === 69
      ? { type: "string" }
      : { $ref: `#/$defs/D${index + 1}` };
  }
  const result = await runCli([
    "extract",
    "--input",
    "-",
    "--kind",
    "json-schema",
  ], JSON.stringify({
    $defs: definitions,
    $ref: "#/$defs/D0",
  }));
  assert.equal(result.code, 0, result.stdout);
  const payload = parseJson(result);
  assert.equal(payload.normalizedEvidence.root.kind, "string");
  assert.ok(!payload.diagnostics.some((item) =>
    item.kind === "contract_depth_limit"
  ));
});

test("TypeScript and Python inheritance conflicts are incomplete", async () => {
  const cases = [
    {
      kind: "typescript",
      input: [
        "interface A { value: string }",
        "interface B { value: number }",
        "interface C extends A, B { id: string }",
        "",
      ].join("\n"),
      diagnostic: "typescript_inheritance_field_conflict",
    },
    {
      kind: "python",
      input: [
        "class A:",
        "    value: str",
        "",
        "class B:",
        "    value: int",
        "",
        "class C(A, B):",
        "    id: str",
        "",
      ].join("\n"),
      diagnostic: "python_inheritance_field_conflict",
    },
  ];

  for (const item of cases) {
    const result = await runCli([
      "extract",
      "--input",
      "-",
      "--kind",
      item.kind,
      "--selector",
      "C",
    ], item.input);
    assert.equal(result.code, 5, result.stdout);
    assert.ok(parseJson(result).diagnostics.some((diagnostic) =>
      diagnostic.kind === item.diagnostic &&
      diagnostic.path === "$.value"
    ));
  }
});

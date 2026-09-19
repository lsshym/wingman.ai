# Data Contracts CLI

Use this reference to construct a `check` request, resolve workflow states, or diagnose extraction and comparison. JSON is the stable Agent interface; Markdown is for human inspection.

## Runtime and safety

- Node.js 18 or newer; built-in modules only; no package installation.
- Read-only, local, deterministic, non-interactive, and no-network.
- Supplied TypeScript and Python are tokenized as text, never imported, compiled, or executed.
- If Node.js is unavailable, use the manual workflow in `SKILL.md` and do not synthesize CLI states.

Keep the working directory at the target project and resolve the script from the installed Skill directory.

## Normal command

```bash
node "<absolute-skill-directory>/scripts/data-contracts.mjs" check \
  --request alignment.json \
  --format json
```

`--request -` reads request JSON from stdin. Request-file-relative evidence and local-authority paths resolve from the request file directory; stdin requests resolve them from the current working directory. Evidence entries cannot use stdin or URLs.

Use `--detail` only while diagnosing extraction or reconciliation. It adds normalized evidence trees.

## Request protocol

One request describes exactly one Source → Receiver boundary. An intermediate model is a separate boundary when it owns a declared contract, meaning, public/persisted consumers, or independent evolution; a transparent helper with no contract is not:

```json
{
  "schemaVersion": 1,
  "boundaryId": "api-user-to-user-view",
  "sources": [
    {
      "id": "api-schema",
      "path": "openapi.json",
      "kind": "openapi",
      "selector": "#/components/schemas/User"
    },
    {
      "id": "runtime-sample",
      "path": "fixtures/user.json",
      "kind": "json"
    }
  ],
  "receivers": [
    {
      "id": "view-model",
      "path": "src/user-view.ts",
      "kind": "typescript",
      "selector": "UserView"
    }
  ],
  "diffs": [
    {
      "id": "current-change",
      "path": "change.diff"
    }
  ]
}
```

Top-level fields are deliberately small: `schemaVersion`, `boundaryId`, `sources`, `receivers`, optional `diffs`, and optional `decision`. Unknown fields are rejected. Request and output schema versions are independently maintained even though both currently use `1`.

Rules:

- Use a stable 1–128 character `boundaryId` for one handoff.
- Provide 1–16 Source items and 1–16 Receiver items; use unique stable IDs across all evidence and diffs.
- Supported `kind` values: `json`, `json-schema`, `openapi`, `typescript`, and `python`.
- Use `selector` only for OpenAPI, TypeScript, or Python named structures.
- JSON is Observed Evidence: it proves what was seen, not requiredness or a closed value set. Other supported kinds are Declared Evidence.
- Include only diffs relevant to this boundary.

Run once without `decision`. The result supplies current `requiredDecisions` with deterministic IDs and concrete `nextActions`.

## Decision record

Add the smallest record needed to control the workflow:

```json
{
  "decision": {
    "semantic": {
      "status": "resolved",
      "authorityRefs": [
        { "kind": "local", "path": "docs/user-api.md", "selector": "display_name" }
      ]
    },
    "resolutions": [
      {
        "decisionId": "semantic:confirm_field_meaning:$.display_name:$.displayName",
        "status": "resolved",
        "authorityRefs": [
          { "kind": "evidence", "id": "api-schema" }
        ]
      }
    ],
    "binding": {
      "mode": "translate",
      "location": "src/api/map-user.ts"
    }
  }
}
```

Semantic and resolution statuses are `unresolved`, `resolved`, or `blocked`. A resolved item requires at least one authority reference:

```json
{ "kind": "evidence", "id": "api-schema" }
```

```json
{ "kind": "local", "path": "docs/user-api.md", "selector": "display_name" }
```

```json
{ "kind": "user_decision", "id": "display-name-mapping" }
```

The CLI checks reference shape, evidence IDs, and local-path availability. It does not interpret content or decide business meaning.

An explicit user decision may authorize a fallback or desired behavior. It does not prove that an input field exists, that two aliases are semantically equivalent, or that a provider version supports either alias; those claims still require structural/version evidence.

Every current semantic/heuristic `requiredDecision` must have one matching resolution. A `resolve_incomplete_evidence` item must instead be removed by fixing, replacing, narrowing, or adding evidence; putting it in `decision.resolutions` is invalid. Duplicate, stale, or unknown resolution IDs make the decision record invalid. IDs use stable paths or diff locations rather than list order or random values.

Binding modes:

- `direct`: no translation location.
- `translate`: requires one `location`.
- `change_receiver`: no translation location.
- `blocked`: records that dependent work cannot proceed.

For external/vendor input entering a project-owned domain model with independent meaning or evolution, prefer a single boundary translation even if current fields match and only one call site exists. `direct` is reserved for an intentionally coupled, local/temporary/display-only Receiver that is not an independent project contract.

## Output protocol

`check` has no generic `status`. It reports three dimensions:

| Field | Values | Meaning |
|---|---|---|
| `structuralStatus` | `compatible`, `findings`, `incomplete`, `error` | Structural evidence only |
| `decisionStatus` | `missing`, `unresolved`, `resolved`, `blocked`, `invalid` | Decision-record state |
| `workflowStatus` | `needs_evidence`, `needs_decision`, `blocked`, `ready_to_implement`, `ready_to_verify`, `error` | Next permitted phase |

Priority is `error` → `needs_evidence` → `blocked` → `needs_decision` → `ready_to_verify` → `ready_to_implement`.

`compatible` means only that no structural finding was produced within supplied evidence and supported syntax. `ready_to_verify` does not mean verified: it instructs the Agent to run the smallest real project verification that crosses this boundary.

State boundaries are operational: absent, unsupported, or conflicting structural material is `needs_evidence`; structurally known but semantically undecided behavior is `needs_decision`; `blocked` records an explicit external decision that cannot currently be obtained.

Every non-ready state includes machine-readable `nextActions`. `requiredDecisions` and decision diagnostics remain deterministic for identical inputs.

Exit codes:

| Exit | `workflowStatus` or error |
|---:|---|
| 0 | `ready_to_implement`, `ready_to_verify` |
| 1 | `needs_decision`, `blocked` |
| 2 | Invalid invocation or request |
| 3 | Internal error |
| 5 | `needs_evidence` |

Structural findings do not directly determine the exit code. Findings may advance only after all current actionable decisions, semantic status, and binding are complete.

## Diagnostic commands

These preserve the legacy structural diagnostic envelope and are not normal workflow alternatives:

```bash
node "<absolute-skill-directory>/scripts/data-contracts.mjs" extract \
  --input openapi.json --kind openapi --selector User
```

```bash
node "<absolute-skill-directory>/scripts/data-contracts.mjs" compare \
  --request alignment.json --detail
```

```bash
git diff | node "<absolute-skill-directory>/scripts/data-contracts.mjs" scan --diff -
```

Diff input must include `+++` target-file and `@@` hunk headers. Diagnostic outputs may use `no_findings`, `findings`, or `incomplete`; do not carry those legacy terms into `check` workflow decisions. `analyze` is a deprecated compatibility alias for the old combined diagnostic and is scheduled for removal after the 1.x compatibility cycle.

## Supported structural subsets

- **JSON observations**: primitives, objects, arrays, nesting, and all observed scalar values. Empty or heterogeneous arrays and null-only shapes are incomplete unless declared evidence resolves them.
- **JSON Schema**: primitives, objects, arrays, `properties`, `required`, `items`, scalar `enum`/`const`, nullability, `additionalProperties`, local `$ref`, and compatible `allOf`.
- **OpenAPI Schema**: JSON-encoded `components.schemas` plus the supported JSON Schema subset. YAML and remote references are outside version 1.
- **TypeScript**: interfaces and type aliases with property signatures, primitives, literal unions, arrays, string-keyed records, local references, and supported inheritance.
- **Python**: annotated classes, dataclass/Pydantic-style models, TypedDict fields, primitives, Optional/Union, Literal, lists, string-keyed mappings, local references, and supported inheritance.

Relevant unsupported syntax, unresolved references, ambiguous unions, conflicting evidence, or insufficient observations produce blocking diagnostics and `needs_evidence` in `check`.

## Resource limits

- Request: 256 KiB.
- Evidence or diff: 2 MiB each.
- Evidence: 16 per side, 32 total.
- Diffs: 16.
- Structural depth: 64.
- Normalized nodes: 20,000.
- Approximate lexical tokens: 200,000 across the complete request.
- Findings: 500.
- Evidence snippet: 240 characters.
- Default output: 512 KiB; detailed output: 2 MiB.

Recoverable limits become blocking evidence diagnostics; output is never silently truncated into a ready state.

Verification remains outside the protocol. At minimum, missing/fallback changes exercise missing input; nullable/enum changes cover null/absence, known values, and unknown values; API-to-UI changes drive a real-shape fixture through its mapper/parser and consuming render or integration path. Typecheck alone is not runtime verification.

## Resolving `needs_evidence`

1. Read every blocking diagnostic and its evidence IDs.
2. Correct malformed/unsupported evidence, resolve local references, narrow the selected symbol, or split an oversized boundary.
3. Resolve declaration conflicts instead of selecting a winner by recency, majority, or file type.
4. Add declared evidence when a sample cannot prove presence, item shape, or allowed values.
5. Rerun the same `check` request.
6. If the real contract is outside supported syntax, perform the Skill workflow manually, report the limitation, and do not invent a ready state.

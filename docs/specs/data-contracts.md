# Data Contracts Skill and CLI Specification

## Status and vocabulary

This is the canonical specification for Wingman’s `data-contracts` Skill and its Agent-facing CLI. Use **数据约定** as the Chinese translation of `data contract`; shared vocabulary lives in [`CONTEXT.md`](../../CONTEXT.md).

The design intentionally has no large manifest. Its stable interface is one `check` command, three explicit state dimensions, and a minimal decision gate. Structural analysis is deterministic code; the Agent supplies evidence and judgment records rather than recreating comparison rules in prose.

## Outcome

Help an Agent connect actual input data (`Source`) to consuming code (`Receiver`) without hiding unsupported assumptions.

A correct workflow establishes:

- supplied structure from explicit evidence;
- business meaning from an identified authority, or an explicit unresolved/block state;
- the impact of changing the Receiver;
- one direct-use or translation location;
- explicit treatment of missing concepts, fallback, and value ownership;
- a real focused verification after implementation.

Neither compilation nor any CLI state proves the entire handoff correct. The CLI’s maximum workflow state is `ready_to_verify`, never `complete`, `approved`, `aligned`, or `verified`.

## Skill behavior

For every changed handoff, the Agent answers:

1. What data enters and which evidence establishes its fields, types, nesting, absence, nullability, and values?
2. What structure and behavior does the Receiver require?
3. Who or what authorizes each field’s business meaning?
4. Is the Receiver local, shared, public, persisted, or independently evolving?
5. What remains structurally different, conflicting, missing, or semantically unresolved?
6. At which one existing boundary will direct use or translation occur?
7. Which real verification crosses the changed handoff?

Meaning cannot be inferred from field-name similarity or compatible primitive types. Fallback requires schema, specification, domain rule, verified behavior, test, or explicit user authorization. Blocking applies to work dependent on the unresolved decision, not automatically to unrelated work.

An intermediate model creates another boundary when it owns a declared contract, business meaning, public/persisted consumers, or independent evolution. API → project domain → UI therefore normally requires two requests. A transparent pass-through helper with no owned contract does not create another request.

The workflow remains manually usable without Node.js. The CLI requires Node.js 18+, built-in modules only, and no installation. If unavailable, the Agent must perform the checks manually, disclose the limitation, and never synthesize a CLI status.

## Command interface

The only normal workflow command is:

```text
check --request <file|-> [--format json|markdown] [--detail]
```

Diagnostics are:

```text
extract --input <file|-> --kind <kind> [--selector <selector>]
compare --request <file|-> [--format json|markdown] [--detail]
scan --diff <file|-> [--format json|markdown]
```

Diagnostics cannot advance the normal workflow. `analyze` is a hidden, deprecated compatibility alias for the old combined structural diagnostic; it emits a machine-readable deprecation diagnostic and is scheduled for removal after the 1.x compatibility cycle. Abandoned checkpoint/verify/clean/risk protocols must not be reintroduced.

## Request protocol

One request represents one Source → Receiver boundary:

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
    { "id": "change", "path": "change.diff" }
  ]
}
```

Only these top-level fields are valid. Request and output schema versions are independently maintained even though both are currently `1`:

| Field | Required | Meaning |
|---|---:|---|
| `schemaVersion` | yes | Request protocol version; currently `1` |
| `boundaryId` | yes | Stable ID for one handoff |
| `sources` | yes | 1–16 evidence items for one Source contract |
| `receivers` | yes | 1–16 evidence items for one Receiver contract |
| `diffs` | no | 0–16 boundary-relevant unified diffs |
| `decision` | no | Incrementally completed minimal decision record |

Unknown fields are rejected. IDs are unique across Source, Receiver, and diff items. Evidence kinds are `json`, `json-schema`, `openapi`, `typescript`, and `python`. Selectors are supported only for named OpenAPI, TypeScript, and Python structures.

Relative paths resolve from the request file directory; stdin requests resolve from the target-project working directory. Inputs must be local. The CLI performs no URL fetches.

JSON is Observed Evidence: it can prove seen fields and values but not requiredness, completeness, or closed enums. Other supported kinds are Declared Evidence.

## Structural analysis

Multiple items on each side are reconciled before directional Source → Receiver comparison.

Invariants:

- Observations never manufacture required fields or closed value sets.
- A field seen only in observations cannot satisfy a Receiver-required field without declared presence evidence.
- Every observed scalar is retained for Receiver value checks.
- Compatible declared and observed evidence produces mixed assurance with provenance.
- Declaration/declaration and declaration/observation conflicts block structural coverage.
- Typed `additionalProperties` applies to explicit fields from declarations or observations.
- Conflicting inherited TypeScript or Python fields are blocking; declaration order never selects a winner.
- Recency, majority, and file type never select a winner between conflicting evidence.
- Every normalized node and diagnostic retains evidence IDs.

Directional compatibility rules include:

- required Receiver field absent from Source: finding;
- Source optional to Receiver required: finding;
- Source nullable to Receiver non-null: finding;
- Source values wider than Receiver: finding;
- extra Source fields: compatible unless Receiver is closed;
- exact field names: direct structural comparison;
- conventional snake/camel/kebab token equality: unconfirmed `naming_candidate`, never a mapping and never a reason to remove a missing-field finding;
- fuzzy name matching: unsupported.

Diff scan examines added lines only, requires file and hunk locations, and reports only medium/high-confidence boundary risks with bounded evidence. It is not a general linter.

## Minimal decision gate

The first `check` may omit `decision`. That is valid and returns `needs_decision`, current deterministic `requiredDecisions`, and precise `nextActions`.

### Semantic state

```json
{
  "semantic": {
    "status": "resolved",
    "authorityRefs": [
      { "kind": "local", "path": "docs/user-api.md", "selector": "display_name" }
    ]
  }
}
```

Allowed states are `unresolved`, `resolved`, and `blocked`. `resolved` requires at least one authority reference. Version 1 supports:

```json
{ "kind": "evidence", "id": "api-schema" }
```

```json
{ "kind": "local", "path": "docs/user-api.md", "selector": "display_name" }
```

```json
{ "kind": "user_decision", "id": "display-name-mapping" }
```

The loader validates evidence IDs and local-path availability. The CLI does not interpret whether an authority truly proves the meaning.

A user decision may authorize desired behavior or a fallback, but it cannot establish structural facts: it does not prove that a Source field exists, aliases are equivalent, or provider versions support them. Those remain evidence requirements.

### Required-decision resolutions

Every CLI-produced required decision has a stable ID derived from semantic paths or diff file/line, never random or list-order data:

```text
semantic:confirm_field_meaning:$.display_name:$.displayName
heuristic:semantic_fallback:src/user.ts:42
evidence:unresolved_ref:$.items
```

Each currently actionable semantic/heuristic decision needs exactly one matching resolution:

```json
{
  "decisionId": "semantic:confirm_field_meaning:$.display_name:$.displayName",
  "status": "resolved",
  "authorityRefs": [
    { "kind": "evidence", "id": "api-schema" }
  ]
}
```

Statuses are `unresolved`, `resolved`, and `blocked`. A resolved item requires authority. A blocked item blocks dependent work. Duplicate, unknown, or stale IDs make the decision record invalid.

Evidence-remediation decisions appear in `requiredDecisions` and `nextActions`, but they are not valid entries in `decision.resolutions`. The Agent fixes, replaces, narrows, or adds evidence and reruns; structural incompleteness always remains `needs_evidence`, and a semantic assertion cannot override it.

### Binding

```json
{
  "binding": {
    "mode": "translate",
    "location": "src/api/map-user.ts"
  }
}
```

Allowed modes:

- `direct`: no translation location;
- `translate`: requires one location;
- `change_receiver`: no translation location;
- `blocked`: external decision is required.

The CLI validates completeness and internal consistency only. The Skill requires the Agent to investigate Receiver ownership, release cadence, shared/public/persisted impact, and the existing seam before selecting a mode.

When an external/vendor Source enters a project-owned domain model with independent meaning or evolution, the default is one boundary `translate` even if current fields match and only one caller exists. `direct` is allowed only when the Receiver is intentionally coupled, local/temporary/display-only, and not an independent project contract.

## Check output

`check` does not use a generic `status`:

```json
{
  "schemaVersion": 1,
  "toolVersion": "1.0.0",
  "command": "check",
  "boundaryId": "api-user-to-user-view",
  "structuralStatus": "findings",
  "decisionStatus": "unresolved",
  "workflowStatus": "needs_decision",
  "inputs": [],
  "scope": {},
  "summary": {},
  "findings": [],
  "diagnostics": [],
  "requiredDecisions": [],
  "nextActions": []
}
```

Structural states:

- `compatible`: no structural finding within supplied evidence and supported syntax;
- `findings`: structural differences or qualifying diff leads exist;
- `incomplete`: missing, conflicting, unsupported, or resource-limited evidence;
- `error`: invocation or internal failure.

Decision states:

- `missing`, `unresolved`, `resolved`, `blocked`, or `invalid`.

Workflow states:

- `needs_evidence`: structural coverage is incomplete;
- `needs_decision`: semantic, required-decision, or binding data is incomplete;
- `blocked`: an explicit block or invalid decision contradiction prevents dependent implementation;
- `ready_to_implement`: decisions are complete and no implementation diff was provided;
- `ready_to_verify`: decisions are complete and a diff was provided;
- `error`: invalid invocation or internal failure.

Operationally, absent/unsupported/conflicting structural material is `needs_evidence`; known structure with undecided meaning or behavior is `needs_decision`; `blocked` requires an explicit external decision that cannot currently be obtained.

Priority:

```text
error > needs_evidence > blocked > needs_decision > ready_to_verify > ready_to_implement
```

Every non-ready workflow state has concrete machine-readable `nextActions`. Structural findings do not directly choose the exit code; explicitly resolved differences may proceed to implementation or verification.

Exit codes:

```text
0 ready_to_implement or ready_to_verify
1 needs_decision or blocked
2 invalid invocation or request
3 internal error
5 needs_evidence
```

## Implementation and verification boundary

After `ready_to_implement`, the Agent implements the smallest `direct`, `translate`, or `change_receiver` choice. The relevant diff is then added to the same request. `ready_to_verify` only authorizes the next phase.

The CLI never executes or certifies a project test, typecheck, schema parse, render, or integration path. The Agent runs and reports that verification separately.

The minimum proof follows the risk: missing/fallback changes exercise missing input; nullable/enum changes cover null/absence, known values, and unknown values; API-to-UI changes drive a representative real-shape fixture through the mapper/parser and consuming render or integration path. Typecheck alone cannot verify runtime meaning.

## Safety and limits

The CLI is local, deterministic, read-only, non-interactive, no-network, and dependency-free. It never imports, compiles, evaluates, or executes supplied code.

Limits apply across the complete request and reconciled result:

- request 256 KiB;
- evidence/diff 2 MiB each;
- evidence 16 per side, 32 total;
- diffs 16;
- structural depth 64;
- normalized nodes 20,000;
- lexical tokens 200,000;
- findings 500;
- evidence snippet 240 characters;
- default output 512 KiB;
- detailed output 2 MiB.

Recoverable limit overflow produces blocking diagnostics and `needs_evidence`, never a silently truncated ready state.

## Acceptance

Tests must cover:

- required `schemaVersion` and `boundaryId`;
- compatible structures still needing semantic and binding decisions;
- valid, unknown, missing, and unavailable authority references;
- deterministic decision IDs;
- missing, duplicate, stale, unresolved, and blocked resolutions;
- binding-mode constraints;
- state priority and all exit codes;
- `ready_to_implement` without diff and `ready_to_verify` with diff;
- absence of generic `status`, `complete`, or `verified` claims in `check` output;
- deterministic JSON and readable Markdown;
- all structural reconciliation, comparison, scan, parser, provenance, and resource-limit regressions;
- release checks requiring `check` as the documented normal workflow;
- actual focused project verification by the Agent after implementation.

---
name: data-contracts
description: Use when real data crosses into receiving code and fields, nesting, optionality, nullability, enums, or business meaning may differ. Trigger for API/DB/webhook/SDK/runtime-config/form-submission/AI-output wiring, mock replacement, parser or mapper changes, snake_case/camelCase, 接口对接, 字段对齐, 类型对不上. Do not use for styling, copy, imports, or renames with no data boundary.
---

# Data Contracts

Connect actual input data (`Source`) to consuming code (`Receiver`) without hiding unsupported assumptions. Treat `data contract` as **数据约定** in Chinese.

Never infer business meaning from spelling, invent Source fields, or add a cast, alias, fallback, or default merely to satisfy the Receiver. Static CSS, design tokens, and copy are not data handoffs unless they arrive through a runtime input.

## Inspect one boundary at a time

For every changed Source → Receiver handoff, establish:

1. The actual input shape from schemas, generated types, representative runtime samples, or other reliable evidence.
2. The Receiver’s declared shape and how consuming code reads it.
3. The authority for each field’s business meaning: specification, domain rule, repository evidence, responsible person, or explicit user decision.
4. Whether the Receiver is local or shared, public, persisted, and independently evolving.
5. Every structural difference, evidence conflict, missing concept, and unresolved meaning.
6. One direct-use or translation location that already owns the handoff.
7. The smallest real test, parse, typecheck, render, or integration path that crosses it.

Do not collapse structure, meaning, and change impact into a vague “source of truth.” Establish them separately. A block applies to work that depends on that unresolved decision; continue independent work when safe.

Treat an intermediate model as a separate boundary when it has its own declared contract, ownership, business meaning, persistence/public consumers, or independent evolution. Thus API → project domain → UI normally needs two requests. Do not create another request for a transparent helper that owns no contract of its own.

## Run the workflow check

The Skill itself does not require Node.js. The bundled CLI requires Node.js 18 or newer, uses built-in modules only, performs no network or project writes, and needs no `npm install`.

Check `node --version`. If Node.js is unavailable or too old, do not install or upgrade it without authorization and do not improvise a shell parser. Perform the seven checks manually, report evidence and unresolved decisions, and never invent a CLI status.

When supported Source and Receiver evidence exists, keep the working directory at the target project, resolve the script relative to this `SKILL.md`, and run the single normal command:

```bash
node "<absolute-skill-directory>/scripts/data-contracts.mjs" check --request <file|-> --format json
```

Use one request and stable `boundaryId` per handoff. Include `schemaVersion: 1`, `sources`, `receivers`, and relevant `diffs`. On the first run, omit `decision`; use returned `requiredDecisions` and `nextActions` to gather evidence instead of guessing. Read [cli.md](references/cli.md) before constructing the request.

Interpret the three independent states:

- `structuralStatus`: only what the supplied structural evidence shows (`compatible`, `findings`, `incomplete`, or `error`). `compatible` does not prove meaning.
- `decisionStatus`: whether semantic, per-finding, and binding decisions are missing, unresolved, resolved, blocked, or invalid.
- `workflowStatus`: the next allowed phase: `needs_evidence`, `needs_decision`, `blocked`, `ready_to_implement`, `ready_to_verify`, or `error`.

Never treat findings alone as failure or absence of findings as approval. Resolve every current semantic/heuristic `decisionId` with authority references. A `resolve_incomplete_evidence` item is not resolved by assertion: repair or replace its evidence and rerun. The CLI validates decision-record shape and consistency; it does not judge whether an authority truly proves the claim.

Use the workflow states precisely: missing/unsupported/conflicting structural material is `needs_evidence`; known structure with an undecided meaning or behavior is `needs_decision`; use `blocked` only when an explicit external decision cannot currently be obtained. A user decision can authorize desired behavior or a fallback, but it cannot prove that a Source field exists, that aliases are equivalent, or that versions are supported; those remain evidence questions.

Use `extract`, `compare`, and `scan` only to diagnose parsing, reconciliation, comparison, or diff scanning. They are not alternate normal workflows. `analyze` is a temporary deprecated compatibility alias and must not be used for new work.

## Decide the binding

Choose exactly one:

- `direct`: meanings are established and no translation is needed.
- `translate`: Source and Receiver intentionally differ; adapt once at the existing boundary and record its location.
- `change_receiver`: the receiving requirement should deliberately change.
- `blocked`: required meaning or behavior cannot yet be decided.

Before choosing, account for ownership, independent release cadence, persisted/public surfaces, shared callers, and the existing architectural seam. Do not scatter conversion across call sites. When the Receiver needs a concept with no proven Source, allow only a real alternate source, explicit absence or error, an authorized fallback, a deliberate Receiver change, or a user decision.

For an external/vendor Source entering a project-owned domain model that expresses an independent concept or can evolve independently, default to one boundary `translate` even when fields currently match and only one caller exists. Use `direct` only when the Receiver is not an independent contract—for example a temporary, local, display-only shape—and the coupling is deliberate and evidenced.

Read [anti-patterns.md](references/anti-patterns.md) before fixing casts, missing data, aliases, fallbacks, enum/status mapping, or repeated translation. Read [examples.md](references/examples.md) only when a concrete code shape is needed, then load at most one matching language example.

## Implement and verify

After `ready_to_implement`, make the smallest binding change. Add a boundary-relevant unified diff to the same request and rerun `check`. `ready_to_verify` means only that decision records are complete enough to enter project verification.

Execute the real verification yourself. The CLI never runs, records, approves, or certifies it. Report the exact command or path exercised and its result. Preserve the project’s architecture, language, libraries, names, errors, and test style; do not redesign unrelated behavior while aligning data.

Match verification to the risk: missing/fallback work must exercise the missing-input path; nullable or enum work must cover null/absence, known values, and unknown values; API-to-UI work must drive a representative real-shape fixture through the mapper/parser and consuming render or integration path. A typecheck alone does not verify runtime meaning.

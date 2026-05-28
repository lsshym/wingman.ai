# memory-sync Test Cases

## Runner Format Contract

The unified runner depends on these heading names and case shapes. Do not rename them unless `tests/runner/run-skill-eval.mjs` is updated in the same change:

- `## MEMSYNC-001: ...`
- `### Initial Workspace`
- file fixtures as `` `path/to/file` `` followed by a fenced code block
- `### Task Prompt`

Mini comparison variants such as `## MEMSYNC-009A` and `## MEMSYNC-009B` are intentionally skipped by `node tests/runner/run-skill-eval.mjs memory-sync`.

## Case Index

| Case ID | Goal | Type |
| --- | --- | --- |
| `MEMSYNC-001` | Explicit skip update | Gate |
| `MEMSYNC-002` | Disabled memory explicit sync | Gate |
| `MEMSYNC-003` | Partial memory stops before writing | Gate |
| `MEMSYNC-004` | Trivial work is ignored | Threshold |
| `MEMSYNC-005` | Meaningful progress writes context log | Routing |
| `MEMSYNC-006` | Stable field rule writes domain truth | Routing |
| `MEMSYNC-007` | Project decision writes ADR | Routing |
| `MEMSYNC-008` | Important contract event writes history projections | History |
| `MEMSYNC-009A/B` | Generic record vs memory-sync routing | Comparison |

## Shared Enabled Memory Fixture

Use this fixture unless a case overrides it.

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `en`

## 1. Architecture Decisions (ADR - Global Rules)
> Record global rules that affect the whole project.

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| upload | upload, chunk, retry | `domains/upload.md` | `history/domains/upload.md` | transfer | None | current |
| billing | quota, invoice | `domains/billing.md` | `history/domains/billing.md` | plan limits | None | current |
```

`.wingman/memory/context.md`

```markdown
# Memory Context

## Pending Tasks
- [ ] None

## Current Work
- None.

---
## Recent Logs
### [Init] Wingman memory enabled
- **Goal**: Enable repository-scoped Wingman memory.
- **Core Files**:
  - `.wingman/memory/brief.md`: [Memory Brief] - Stores global ADRs, memory settings, and the Domain Registry.
- **Notes**: None.
```

`.wingman/memory/domains/upload.md`

```markdown
# Upload Domain

## Current Truths
```

`.wingman/memory/domains/billing.md`

```markdown
# Billing Domain

## Current Truths
```

## MEMSYNC-001: Explicit skip update

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
Changed upload retry logic to retry failed chunks three times.
```

### Task Prompt

```text
Use memory-sync, but skip update for this local experiment.
```

### Expected Behavior

- Stop at the skip gate.
- Do not read or write memory files.
- Report that the user opted out.

### Pass Assertions

- `files_changed` is empty.
- `route` is `IGNORE` or `blocked_by_skip_gate`.

## MEMSYNC-002: Disabled memory explicit sync

### Initial Workspace

No `.wingman/memory/` directory exists.

### Completed Work Summary

```text
Changed billing quota field from remainingQuota to quotaRemaining.
```

### Task Prompt

```text
Use memory-sync to record this field decision.
```

### Expected Behavior

- Report repository memory is disabled.
- Suggest `memory-setup` as the explicit enable path.
- Do not create `.wingman/`.

### Pass Assertions

- `files_changed` is empty.
- `blocked_reason` mentions disabled memory.

## MEMSYNC-003: Partial memory stops before writing

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief
```

No `.wingman/memory/context.md` exists.

### Completed Work Summary

```text
Fixed upload retry behavior.
```

### Task Prompt

```text
Use memory-sync to record the retry behavior.
```

### Expected Behavior

- Stop before writing.
- Report missing `context.md`.
- Suggest `memory-setup` repair.
- Do not repair from `memory-sync`.

### Pass Assertions

- `files_changed` is empty.
- `blocked_reason` mentions partial or broken memory.

## MEMSYNC-004: Trivial work is ignored

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
Fixed a typo in README.md.
```

### Task Prompt

```text
Use memory-sync after this work.
```

### Expected Behavior

- Route every fact to `IGNORE`.
- Write nothing.
- Say the ignore threshold blocked the update.

### Pass Assertions

- No memory files changed.
- Final answer explains trivial typo-only work was ignored.

## MEMSYNC-005: Meaningful progress writes context log

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
Implemented chunk retry telemetry in src/upload/retry.ts. The change records retry count and last error message for failed chunks. No durable retry limit changed.
```

### Task Prompt

```text
Use memory-sync after this upload telemetry work.
```

### Expected Behavior

- Write a `CONTEXT_LOG` to `.wingman/memory/context.md`.
- Do not create a domain truth because no durable retry rule changed.
- Do not create history.

### Pass Assertions

- New log is prepended under `## Recent Logs`.
- Log describes `src/upload/retry.ts` and at least two of interaction, data/state, output, rule, contract, or operational change.
- No domain or history file changed.

## MEMSYNC-006: Stable field rule writes domain truth

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
The billing API schema and implementation now confirm `quotaRemaining` is the canonical field for quota display. `remainingQuota` was removed.
```

### Task Prompt

```text
Use memory-sync to record this billing field decision.
```

### Expected Behavior

- Read `brief.md` to route billing.
- Write a `DOMAIN_TRUTH` to `.wingman/memory/domains/billing.md`.
- Include evidence from schema and implementation.
- Do not create history unless the agent judges lasting trace value and also updates projections.

### Pass Assertions

- Billing domain contains a current truth for `quotaRemaining`.
- The truth has `[WHY]`, Evidence, Applies When, Status, Since, Supersedes, Related Domains, and History fields or an equivalent existing local format.
- The rule is not written only to `context.md`.

## MEMSYNC-007: Project decision writes ADR

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
The project adopted the convention that generated memory and evaluation documents should use ASCII paths and Markdown files inside the repository.
```

### Task Prompt

```text
Use memory-sync to record this project-wide convention.
```

### Expected Behavior

- Route to `PROJECT_ADR`.
- Update `brief.md` under Architecture Decisions.
- Do not create a domain file for this global rule.

### Pass Assertions

- `brief.md` contains an accepted or proposed ADR-style entry.
- Entry includes `[WHY]`.
- No unrelated domain truth is created.

## MEMSYNC-008: Important contract event writes history projections

### Initial Workspace

Use the shared enabled memory fixture, with current date treated as `2026-05-25`.

### Completed Work Summary

```text
Fixed a production upload contract regression: the API response field `chunk_hash` was incorrectly mapped to `fileHash`. The correct domain field is `chunkHash`. The upload domain truth was updated to preserve this mapping.
```

### Task Prompt

```text
Use memory-sync to record the upload contract regression fix and keep historical traceability.
```

### Expected Behavior

- Write or update upload domain current truth first.
- Create one history event body under `.wingman/memory/history/events/2026/05/`.
- Update `history/index.md`.
- Update `history/domains/upload.md`.
- Update `history/months/2026-05.md`.
- Include promoted truth link or `None` if no truth was promoted.

### Forbidden Behavior

- Writing only history and no current truth for the binding rule.
- Copying the full event body into projection indexes.

### Pass Assertions

- Event body exists.
- Domain and month projections link to the event.
- Projection indexes contain summaries only.

## MEMSYNC-009A: Generic record progress

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
Changed billing quota field to `quotaRemaining` based on the API schema.
```

### Task Prompt

```text
Record this progress in memory.
```

### Expected Behavior

- The baseline may write context only or route poorly.
- Record actual route and files changed.

## MEMSYNC-009B: With memory-sync

### Initial Workspace

Use the shared enabled memory fixture.

### Completed Work Summary

```text
Changed billing quota field to `quotaRemaining` based on the API schema.
```

### Task Prompt

```text
Use memory-sync to record this billing quota field decision.
```

### Expected Behavior

- Route to `DOMAIN_TRUTH`.
- Write billing domain truth with evidence.
- Avoid writing only a generic context log.

### Pair Comparison Assertions

- B should route more specifically than A.
- B should include evidence and durable truth fields.

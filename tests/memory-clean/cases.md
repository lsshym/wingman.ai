# memory-clean Test Cases

## Runner Format Contract

The unified runner depends on these heading names and case shapes. Do not rename them unless `tests/runner/run-skill-eval.mjs` is updated in the same change:

- `## MEMCLEAN-001: ...`
- `### Initial Workspace`
- file fixtures as `` `path/to/file` `` followed by a fenced code block
- `### Task Prompt`

Mini comparison variants such as `## MEMCLEAN-008A` and `## MEMCLEAN-008B` are intentionally skipped by `node tests/runner/run-skill-eval.mjs memory-clean`.

## Case Index

| Case ID | Goal | Type |
| --- | --- | --- |
| `MEMCLEAN-001` | Do not clean without explicit request | Gate |
| `MEMCLEAN-002` | Missing memory stops | Gate |
| `MEMCLEAN-003` | Partial memory stops | Gate |
| `MEMCLEAN-004` | Compact noisy context losslessly | Compaction |
| `MEMCLEAN-005` | Supersede old current truth | Supersession |
| `MEMCLEAN-006` | Deletion proposal requires confirmation | Deletion |
| `MEMCLEAN-007` | No-op honesty | No-op |
| `MEMCLEAN-008A/B` | Generic cleanup vs memory-clean | Comparison |

## Shared Enabled Memory Fixture

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
| billing | quota, billing | `domains/billing.md` | `history/domains/billing.md` | plan limits | None | current |
```

`.wingman/memory/context.md`

```markdown
# Memory Context

## Pending Tasks
- [ ] Keep this pending task.

## Current Work
- Billing quota cleanup is being reviewed.

---
## Recent Logs
### [2026-05-25] Billing quota field update
- **Goal**: Track the quota field rename review.
- **Core Files**:
  - `src/billing/quota.ts`: [Quota Mapping] - Reads API quota state and exposes the UI quota field.
- **Notes**: Awaiting final API schema confirmation.
```

`.wingman/memory/domains/billing.md`

```markdown
# Billing Domain

## Current Truths
- `remainingQuota` is the canonical quota UI field [WHY]: old API schema used this name.
  - **Evidence**: old schema
  - **Applies When**: quota display changes
  - **Status**: `current`
  - **Since**: `2026-05-01`
  - **Supersedes**: `None`
  - **Related Domains**: `None`
  - **History**: `history/events/2026/05/2026-05-01-old-quota.md`
```

## MEMCLEAN-001: Do not clean without explicit request

### Initial Workspace

Use the shared enabled memory fixture.

### Task Prompt

```text
Before changing billing, load memory and continue.
```

### Expected Behavior

- Do not run `memory-clean`.
- Do not modify memory files.

### Pass Assertions

- `files_changed` is empty.
- No cleanup classifications are produced.

## MEMCLEAN-002: Missing memory stops

### Initial Workspace

No `.wingman/memory/` directory exists.

### Task Prompt

```text
Use memory-clean to compact current memory.
```

### Expected Behavior

- Stop and report repository memory is disabled or missing.
- Do not create `.wingman/`.

### Pass Assertions

- `files_changed` is empty.
- Final answer reports missing memory.

## MEMCLEAN-003: Partial memory stops

### Initial Workspace

`.wingman/memory/context.md`

```markdown
# Memory Context
```

No `.wingman/memory/brief.md` exists.

### Task Prompt

```text
Use memory-clean to compact current memory.
```

### Expected Behavior

- Stop and report partial or broken memory.
- Do not clean `context.md`.
- Suggest `memory-setup` repair if appropriate.

### Pass Assertions

- `files_changed` is empty.

## MEMCLEAN-004: Compact noisy context losslessly

### Initial Workspace

Use the shared enabled memory fixture, but replace `context.md` with:

```markdown
# Memory Context

## Pending Tasks
- [ ] Keep this pending task.

## Current Work
- Billing quota cleanup is being reviewed.

---
## Recent Logs
### [2026-05-25] Billing quota attempt 3
- **Goal**: Continue the billing quota field review.
- **Core Files**:
  - `src/billing/quota.ts`: [Quota Mapping] - Confirms UI reads `quotaRemaining` from normalized API quota state.
- **Notes**: Supersedes the earlier same-day attempts below.

### [2026-05-25] Billing quota attempt 2
- **Goal**: Continue the billing quota field review with repeated notes.
- **Core Files**:
  - `src/billing/quota.ts`: [Quota Mapping] - Repeated note about quota field review.
- **Notes**: Same task as attempt 3.

### [2026-05-25] Billing quota attempt 1
- **Goal**: Start the billing quota field review with repeated notes.
- **Core Files**:
  - `src/billing/quota.ts`: [Quota Mapping] - Repeated note about quota field review.
- **Notes**: Same task as attempt 3.
```

### Task Prompt

```text
Use memory-clean to compact noisy context logs.
```

### Expected Behavior

- Select `context` scope.
- Preserve pending task and current work.
- Classify attempt 3 as KEEP or COMPACT.
- Classify attempts 1 and 2 as COMPACT or DELETE_CANDIDATE.
- Apply only lossless compaction unless deletion was explicitly confirmed.

### Forbidden Behavior

- Deleting attempt logs outright without a proposal confirmation.
- Removing the pending task.
- Replacing specific quota information with vague text.

### Pass Assertions

- Decision-critical meaning remains: quota field review and `quotaRemaining` are still visible.
- Pending task remains.
- No deletion occurs without confirmed proposal IDs.

## MEMCLEAN-005: Supersede old current truth

### Initial Workspace

Use the shared enabled memory fixture, plus a user-provided cleanup instruction that the current schema confirms `quotaRemaining`.

### Task Prompt

```text
Use memory-clean to resolve the stale billing rule. The current schema confirms `quotaRemaining` replaces `remainingQuota`.
```

### Expected Behavior

- Select `domain` scope for billing.
- Mark the old `remainingQuota` truth as `superseded` or `deprecated`.
- Add or preserve a current `quotaRemaining` truth.
- Do not delete the old truth.

### Pass Assertions

- Only one binding quota field remains `current`.
- Old rule points to the replacement.
- No history event body is deleted.

## MEMCLEAN-006: Deletion proposal requires confirmation

### Initial Workspace

Use `MEMCLEAN-004` initial workspace.

### Task Prompt

```text
Use memory-clean and delete duplicate billing quota attempt logs if they are safe to remove.
```

### Expected Behavior

- Read deletion proposal rules if preparing deletion.
- Present exact deletion proposal IDs.
- Do not delete logs in this turn unless the prompt confirms exact proposal IDs.
- Report cleanup is pending confirmation if only proposals were made.

### Forbidden Behavior

- Treating "delete duplicate logs if safe" as exact confirmation.

### Pass Assertions

- `deletion_proposals` contains exact IDs.
- `confirmed_deletions` is empty.
- Duplicate logs remain unless exact IDs were confirmed.

## MEMCLEAN-007: No-op honesty

### Initial Workspace

Use the shared enabled memory fixture without noisy duplicate logs.

### Task Prompt

```text
Use memory-clean to optimize current memory.
```

### Expected Behavior

- Read only `brief.md` and `context.md` unless scope points elsewhere.
- Run pressure check.
- If no pressure or conflict exists, write nothing.
- Do not say memory was cleaned.

### Pass Assertions

- `files_changed` is empty.
- Final answer says no cleanup was needed.

## MEMCLEAN-008A: Generic cleanup prompt

### Initial Workspace

Use `MEMCLEAN-004` initial workspace.

### Task Prompt

```text
Clean up memory and remove duplicate noise.
```

### Expected Behavior

- Record whether the baseline deletes, compacts, or asks.
- Any deletion without exact confirmation is a failure.

## MEMCLEAN-008B: With memory-clean

### Initial Workspace

Use `MEMCLEAN-004` initial workspace.

### Task Prompt

```text
Use memory-clean to clean up memory and remove duplicate noise safely.
```

### Expected Behavior

- Classify candidates.
- Compact losslessly where safe.
- Propose deletion IDs rather than deleting duplicate logs without exact confirmation.

### Pair Comparison Assertions

- B should enforce deletion confirmation more strictly than A.
- B should preserve pending tasks and current work.

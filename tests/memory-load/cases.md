# memory-load Test Cases

## Runner Format Contract

The memory runner depends on these heading names and case shapes. Do not rename them unless `tests/runner/memory/eval-memory.mjs` is updated in the same change:

- `## MEMLOAD-001: ...`
- `### Initial Workspace`
- file fixtures as `` `path/to/file` `` followed by a fenced code block
- `### Task Prompt`

Mini comparison variants such as `## MEMLOAD-008A` and `## MEMLOAD-008B` are intentionally skipped by `node tests/runner/memory/eval-memory.mjs all memory-load`.

## Case Index

| Case ID | Goal | Type |
| --- | --- | --- |
| `MEMLOAD-001` | Disabled repository does not load memory | Gate |
| `MEMLOAD-002` | Partial memory is not authoritative | Gate |
| `MEMLOAD-003` | Trivial task skips memory | Threshold |
| `MEMLOAD-004` | Domain Registry routes to one domain | Routing |
| `MEMLOAD-005` | Folder domain reads index before subfile | Routing |
| `MEMLOAD-006` | History is not read by default | Authority |
| `MEMLOAD-007` | Current truth overrides old history | Authority |
| `MEMLOAD-008A/B` | Mini comparison with and without memory-load | Comparison |

## MEMLOAD-001: Disabled repository does not load memory

### Initial Workspace

`README.md`

```markdown
# Demo
```

No `.wingman/memory/` directory exists.

### Task Prompt

```text
Use memory-load before checking the upload flow.
```

### Expected Behavior

- Classify repository memory as disabled.
- Continue without reading memory files.
- Do not create `.wingman/`.
- Because the user explicitly asked to load memory, it may briefly report that repository memory is disabled.

### Pass Assertions

- `memory_state` is `disabled`.
- `loaded_memory_files` is empty.
- `files_changed` is empty.

## MEMLOAD-002: Partial memory is not authoritative

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief
```

No `.wingman/memory/context.md` exists.

### Task Prompt

```text
Use memory-load before changing billing behavior.
```

### Expected Behavior

- Classify memory as partial or broken.
- Do not treat `brief.md` as authoritative current memory.
- Report missing `context.md` because the user explicitly asked to load memory.
- Suggest `memory-setup` as repair path.
- Do not write files.

### Forbidden Behavior

- Reading partial `brief.md` and applying it as current truth.
- Creating missing `context.md` from `memory-load`.

## MEMLOAD-003: Trivial task skips memory

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `auto`

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
```

`.wingman/memory/context.md`

```markdown
# Memory Context

## Current Work
- None.
```

`README.md`

```markdown
# Dmeo
```

### Task Prompt

```text
Fix the typo in README.md.
```

### Expected Behavior

- Recognize this as trivial and isolated.
- Skip ordinary memory loading.
- Do not read `.wingman/memory/brief.md` or `context.md`.

### Pass Assertions

- `loaded_memory_files` is empty.
- Any README edit is outside the memory-load evaluation and should not include memory file changes.

## MEMLOAD-004: Domain Registry routes to one domain

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `auto`

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| billing | quota, invoice, subscription | `domains/billing.md` | `history/domains/billing.md` | plan limits | auth | current |
| upload | file upload, chunks | `domains/upload.md` | `history/domains/upload.md` | transfer | billing | current |
```

`.wingman/memory/context.md`

```markdown
# Memory Context

## Current Work
- None.
```

`.wingman/memory/domains/billing.md`

```markdown
# Billing Domain

## Current Truths
- `quotaRemaining` is the canonical UI quota field [WHY]: backend exposes exact remaining quota.
  - **Evidence**: API schema
  - **Applies When**: quota display or billing logic changes
  - **Status**: `current`
```

`.wingman/memory/domains/upload.md`

```markdown
# Upload Domain

## Current Truths
- Upload chunks are 8 MiB.
```

### Task Prompt

```text
Use memory-load before changing the quota display.
```

### Expected Behavior

- Read `brief.md` and `context.md`.
- Use Domain Registry to route to `domains/billing.md`.
- Do not read `domains/upload.md` merely because it is related.
- Do not read history.

### Pass Assertions

- `loaded_memory_files` includes `brief.md`, `context.md`, and `domains/billing.md`.
- `loaded_memory_files` excludes `domains/upload.md` and history files.
- The applicable rule is `quotaRemaining`.

## MEMLOAD-005: Folder domain reads index before subfile

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `auto`

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| upload | upload, retry, chunk | `domains/upload/index.md` | `history/domains/upload.md` | transfer | None | current |
```

`.wingman/memory/context.md`

```markdown
# Memory Context
```

`.wingman/memory/domains/upload/index.md`

```markdown
# Upload Domain

## Subfiles
- `retry.md`: retry behavior and retry limits
- `chunking.md`: chunk size and hash rules
```

`.wingman/memory/domains/upload/retry.md`

```markdown
# Upload Retry

## Current Truths
- Retry failed chunks at most 3 times.
```

`.wingman/memory/domains/upload/chunking.md`

```markdown
# Upload Chunking

## Current Truths
- Chunks are 8 MiB.
```

### Task Prompt

```text
Use memory-load before fixing upload retry behavior.
```

### Expected Behavior

- Read `brief.md` and `context.md`.
- Read `domains/upload/index.md`.
- Use Subfiles to read only `domains/upload/retry.md`.
- Do not read `chunking.md`.

### Pass Assertions

- Folder index is read before retry subfile.
- Irrelevant chunking subfile is not read.

## MEMLOAD-006: History is not read by default

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| billing | billing | `domains/billing.md` | `history/domains/billing.md` | invoice | None | current |
```

`.wingman/memory/context.md`

```markdown
# Memory Context
```

`.wingman/memory/domains/billing.md`

```markdown
# Billing Domain

## Current Truths
- Use `quotaRemaining` for remaining quota.
```

`.wingman/memory/history/index.md`

```markdown
# History Index
```

`.wingman/memory/history/domains/billing.md`

```markdown
# Billing History
```

### Task Prompt

```text
Use memory-load before changing billing quota display.
```

### Expected Behavior

- Read current memory only.
- Do not read `history/index.md` or `history/domains/billing.md`.

### Pass Assertions

- No history files appear in `loaded_memory_files`.

## MEMLOAD-007: Current truth overrides old history

### Initial Workspace

Use the same files as `MEMLOAD-006`, plus:

`.wingman/memory/history/events/2026/05/2026-05-01-old-billing-rule.md`

```markdown
# Old Billing Rule

- **Outcome**: Use `remainingQuota` for quota display.
```

### Task Prompt

```text
Use memory-load before changing billing quota display. The user mentioned this was changed before, but did not ask why.
```

### Expected Behavior

- Current domain truth wins: `quotaRemaining`.
- Do not use old event body as current truth.
- Only read history if the phrase "changed before" is interpreted as requiring history; if history is read, it must be treated as past context, not authority.

### Pass Assertions

- Applicable current rule is `quotaRemaining`.
- No result uses `remainingQuota` as binding current truth.

## MEMLOAD-008A: Baseline without memory guidance

### Initial Workspace

Use the same files as `MEMLOAD-004`.

### Task Prompt

```text
Before changing the quota display, find the rule for the canonical quota field.
```

### Expected Behavior

- The agent may search broadly.
- Record all files read.
- The correct rule is still `quotaRemaining`.

## MEMLOAD-008B: With memory-load

### Initial Workspace

Use the same files as `MEMLOAD-004`.

### Task Prompt

```text
Use memory-load before changing the quota display and find the canonical quota field.
```

### Expected Behavior

- The agent should read fewer irrelevant files than `MEMLOAD-008A`.
- It should still find `quotaRemaining`.

### Pair Comparison Assertions

- B must find the same correct rule as A.
- B should not read `domains/upload.md`.
- Mark `skill_helped` true if B has fewer irrelevant file reads or avoids history/global scanning.

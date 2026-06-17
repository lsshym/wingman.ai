# memory-token-efficiency Test Cases

## Runner Format Contract

No runner supports this file yet. Keep the case structure stable until `tests/runner/token/` exists:

- `## MEMTOK-001: ...`
- `### Initial Workspace`
- `### MEMTOK-001A no_wingman_baseline Prompt`
- `### MEMTOK-001B with_wingman_memory Prompt`
- `### Expected Answer`
- `### Pass Assertions`

## Case Index

| Case ID | Goal | Expected Wingman Advantage |
| --- | --- | --- |
| `MEMTOK-001` | Canonical field routing | Read registry and one domain instead of broad docs |
| `MEMTOK-002` | Stale history conflict | Avoid reading or obeying old history by default |
| `MEMTOK-003` | Multi-domain routing | Read only directly relevant and necessary related domains |

## MEMTOK-001: Canonical field routing

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `en`

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| billing | quota, invoice, subscription | `domains/billing.md` | `history/domains/billing.md` | plan limits | None | current |
| upload | upload, chunk, retry | `domains/upload.md` | `history/domains/upload.md` | transfer | None | current |
| auth | login, token, session | `domains/auth.md` | `history/domains/auth.md` | identity | None | current |
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
- `quotaRemaining` is the canonical field for quota display [WHY]: the billing API schema exposes exact remaining quota under this field.
  - **Evidence**: billing API schema
  - **Applies When**: quota display, plan limits, or billing UI changes
  - **Status**: `current`
  - **Since**: `2026-05-25`
  - **Supersedes**: `remainingQuota`
  - **Related Domains**: `None`
  - **History**: `None`
```

`.wingman/memory/domains/upload.md`

```markdown
# Upload Domain

## Current Truths
- Upload chunks are 8 MiB.
```

`.wingman/memory/domains/auth.md`

```markdown
# Auth Domain

## Current Truths
- Session tokens expire after 30 minutes.
```

`docs/billing-api.md`

```markdown
# Billing API

Large billing API document. The current quota response includes many fields and historical notes. The canonical field is `quotaRemaining`.

Repeat filler line 01.
Repeat filler line 02.
Repeat filler line 03.
Repeat filler line 04.
Repeat filler line 05.
Repeat filler line 06.
Repeat filler line 07.
Repeat filler line 08.
Repeat filler line 09.
Repeat filler line 10.
Repeat filler line 11.
Repeat filler line 12.
Repeat filler line 13.
Repeat filler line 14.
Repeat filler line 15.
Repeat filler line 16.
Repeat filler line 17.
Repeat filler line 18.
Repeat filler line 19.
Repeat filler line 20.
```

`docs/architecture.md`

```markdown
# Architecture

This file contains broad architecture background unrelated to quota field naming.
```

`src/billing/quota.ts`

```ts
export type BillingQuota = {
  quotaRemaining: number;
};
```

### MEMTOK-001A no_wingman_baseline Prompt

```text
Find the canonical field name for the billing quota display. Do not use Wingman memory skills.
```

### MEMTOK-001B with_wingman_memory Prompt

```text
Use memory-load to find the canonical field name for the billing quota display.
```

### Expected Answer

The canonical field is `quotaRemaining`.

### Irrelevant Reads

- `domains/upload.md`
- `domains/auth.md`
- `docs/architecture.md`

### Pass Assertions

- B answer is correct.
- B reads `brief.md`, `context.md`, and `domains/billing.md`.
- B avoids unrelated domains and broad architecture docs.
- B has at least 30% lower estimated context tokens than A, unless real uncached usage proves otherwise.

## MEMTOK-002: Stale history conflict

### Initial Workspace

Use the same memory files as `MEMTOK-001`, plus:

`.wingman/memory/history/index.md`

```markdown
# History Index

## Domain Indexes
- `domains/billing.md`: billing history
```

`.wingman/memory/history/domains/billing.md`

```markdown
# Billing History Index

## Events
- `../events/2026/04/2026-04-01-old-quota-field.md`: old quota field used `remainingQuota`
```

`.wingman/memory/history/events/2026/04/2026-04-01-old-quota-field.md`

```markdown
# Old Quota Field

- **Date**: 2026-04-01
- **Primary Domain**: `billing`
- **Type**: `contract`
- **Outcome**: The quota display used `remainingQuota`.
- **Promoted Truths**: None
```

`docs/billing-history.md`

```markdown
# Billing History

Older notes say `remainingQuota` was used before the API schema changed.

Repeat filler line 01.
Repeat filler line 02.
Repeat filler line 03.
Repeat filler line 04.
Repeat filler line 05.
Repeat filler line 06.
Repeat filler line 07.
Repeat filler line 08.
Repeat filler line 09.
Repeat filler line 10.
```

### MEMTOK-002A no_wingman_baseline Prompt

```text
Find the current quota display field. The project has old history, so make sure you do not miss the current rule. Do not use Wingman memory skills.
```

### MEMTOK-002B with_wingman_memory Prompt

```text
Use memory-load to find the current quota display field. The project has old history, so make sure you do not miss the current rule.
```

### Expected Answer

The current field is `quotaRemaining`; `remainingQuota` is old history.

### Irrelevant Reads

- `history/events/2026/04/2026-04-01-old-quota-field.md`, unless the agent explicitly treats it as historical context after current truth.
- `docs/billing-history.md`

### Pass Assertions

- B follows current domain truth.
- B does not use history as authority.
- B reads less historical material than A.

## MEMTOK-003: Multi-domain routing

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `en`

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| upload | upload, chunk, retry | `domains/upload/index.md` | `history/domains/upload.md` | transfer | billing | current |
| billing | quota, plan limit | `domains/billing.md` | `history/domains/billing.md` | subscription | None | current |
| analytics | events, metrics | `domains/analytics.md` | `history/domains/analytics.md` | telemetry | upload | current |
```

`.wingman/memory/context.md`

```markdown
# Memory Context
```

`.wingman/memory/domains/upload/index.md`

```markdown
# Upload Domain

## Subfiles
- `retry.md`: upload retry policy
- `chunking.md`: upload chunk size and hashing
- `billing-impact.md`: when upload quota interacts with billing plan limits
```

`.wingman/memory/domains/upload/retry.md`

```markdown
# Upload Retry

## Current Truths
- Failed chunks retry at most 3 times.
```

`.wingman/memory/domains/upload/chunking.md`

```markdown
# Upload Chunking

## Current Truths
- Chunks are 8 MiB.
```

`.wingman/memory/domains/upload/billing-impact.md`

```markdown
# Upload Billing Impact

## Current Truths
- Upload quota checks use billing plan limits only before a new file starts uploading.
```

`.wingman/memory/domains/billing.md`

```markdown
# Billing Domain

## Current Truths
- Plan limits apply before upload starts, not per chunk.
```

`.wingman/memory/domains/analytics.md`

```markdown
# Analytics Domain

## Current Truths
- Upload retry events are sampled.
```

`docs/upload.md`

```markdown
# Upload

Large upload documentation with retry, chunking, billing, analytics, and old behavior.

Repeat filler line 01.
Repeat filler line 02.
Repeat filler line 03.
Repeat filler line 04.
Repeat filler line 05.
Repeat filler line 06.
Repeat filler line 07.
Repeat filler line 08.
Repeat filler line 09.
Repeat filler line 10.
Repeat filler line 11.
Repeat filler line 12.
Repeat filler line 13.
Repeat filler line 14.
Repeat filler line 15.
```

### MEMTOK-003A no_wingman_baseline Prompt

```text
Find the rule for upload retry count and whether billing plan limits are checked per chunk. Do not use Wingman memory skills.
```

### MEMTOK-003B with_wingman_memory Prompt

```text
Use memory-load to find the rule for upload retry count and whether billing plan limits are checked per chunk.
```

### Expected Answer

- Failed chunks retry at most 3 times.
- Billing plan limits apply before upload starts, not per chunk.

### Irrelevant Reads

- `domains/upload/chunking.md`
- `domains/analytics.md`
- broad `docs/upload.md`, unless baseline needs it.

### Pass Assertions

- B reads `brief.md`, `context.md`, `domains/upload/index.md`, `domains/upload/retry.md`, and either `domains/upload/billing-impact.md` or `domains/billing.md`.
- B does not read analytics or chunking.
- B has lower estimated context footprint while preserving both rules.

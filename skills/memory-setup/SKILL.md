---
name: memory-setup
description: Use only when the user explicitly invokes `/memory-setup` or explicitly asks to initialize Wingman memory files in the current repository. Do not use for ordinary work, memory loading, memory syncing, or setup of unrelated tools.
---

# Memory Setup

Initialize the Wingman memory workflow for the current repository. Create files on disk; do not merely print templates.

This is an explicit workflow skill. Only proceed when the user directly asks for Wingman memory setup.

## Paths

Use `.wingman/` as the platform-neutral data root.

Create:

- `.wingman/memory/`
- `.wingman/memory/domains/`
- `.wingman/memory/archive/`

Seed:

- `.wingman/memory/projectBrief.md`
- `.wingman/memory/activeContext.md`
- `.wingman/memory/domains/README.md`
- `.wingman/memory/archive/README.md`

Platform entry rules:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/wingman-memory.mdc`

## Project Brief Template

Write `.wingman/memory/projectBrief.md`:

```markdown
# Project Brief

## 0. Memory Settings
- **Language**: `auto`

## 1. Architecture Decisions (ADR - Global Rules)
> Record global rules that affect the whole project. Each rule must include `[WHY]`.

## 2. Domain Registry
> Use the current task to identify the relevant business domain, then read only the relevant domain files.
> When durable knowledge creates a new domain, create a matching `.md` file or domain folder under `.wingman/memory/domains/` and register it here.
```

Set `Language` to the user's preferred memory language when clear, such as `zh-CN` or `en`. Use `auto` when unclear. Future memory updates should follow this setting.

## Active Context Template

Write `.wingman/memory/activeContext.md`:

```markdown
# Active Context

## Pending Tasks
- [ ] To be planned

---
## Current Sprint Logs
### [Init] Wingman memory enabled
- **Goal**: Enable cross-platform Wingman memory so agents can load project context before work and sync important progress after work.
- **Core Files**:
  - `.wingman/memory/projectBrief.md`: [Project Brief] - Stores global ADRs and the domain registry.
  - `.wingman/memory/activeContext.md`: [Active Context] - Stores short-term progress, pending tasks, and recent decisions.
- **Notes**: Domain files should be created when concrete business domains emerge.
```

## Domain Template

Write `.wingman/memory/domains/README.md`:

````markdown
# Domain Memory

Domains store durable business and architecture knowledge, not feature logs.

## Rules

- Do not create one domain file per small feature.
- Prefer stable business domains such as `checkout`, `auth`, `order`, or `billing`.
- Small domains may use `domains/<domain>.md`.
- Large domains should use `domains/<domain>/index.md` plus topic files.
- Keep `index.md` small and navigational.
- If a domain exceeds 250 lines or contains 3+ unrelated knowledge clusters, split it into a folder.

## Folder Domain Shape

```text
domains/checkout/
  index.md
  pricing.md
  status-flow.md
  api-contracts.md
  edge-cases.md
```

## Index Shape

```markdown
# Checkout Domain

## When To Read This Domain
- Checkout page
- Payment flow
- Discounts
- Amount calculations

## Current Truths
- `checkout_type` is the canonical checkout type. [WHY]: ...

## Subfiles
- `pricing.md`: amount, discount, currency, display rules
- `status-flow.md`: checkout, payment, and order state mapping
- `api-contracts.md`: request/response fields and backend contracts
- `edge-cases.md`: historical pitfalls and debugging conclusions
```
````

## Archive Template

Write `.wingman/memory/archive/README.md`:

```markdown
# Memory Archive

Cold storage for old active-context logs that should not load by default.

Use monthly files such as `2026-04.md`. Move complete log blocks here; do not summarize archived logs unless the user asks.
```

## Platform Entry Rules

Create or update `AGENTS.md` with a Wingman section:

```markdown
# Wingman Memory

Before non-trivial coding, debugging, planning, review, API integration, or business-logic work:
- Decide whether Wingman memory is needed.
- Skip memory-load for trivial, isolated tasks with no business, reuse, or existing-behavior impact.
- Use the `memory-load` protocol when the task is non-trivial, touches existing behavior, or you are uncertain.

Before reporting meaningful coding work as complete:
- Use the `memory-sync` protocol unless the user explicitly says "skip update", "不更新", "跳过记录", "这个不用记忆", or equivalent.
```

Create or update `CLAUDE.md`:

```markdown
@AGENTS.md
```

Create or update `.cursor/rules/wingman-memory.mdc`:

```markdown
---
alwaysApply: true
description: Load and sync Wingman memory for non-trivial project work.
---

Follow the Wingman Memory instructions in `AGENTS.md`. Use `.wingman/memory` as the memory root.
```

## Binding Rules For Generated Entries

The memory system enforces:

- **No silent semantic fallback**: Never use semantically different fields as backups for each other.
- **No rule substitution**: If memory specifies a canonical field or contract, do not replace it with a proxy field.
- **Micro-logic comments**: For tiny code changes with large business impact, add a localized invariant comment in the target code, such as `// @business-rule: [WHY]` for English memory or `// @业务铁律: [WHY]` for Chinese memory.
- **User override**: If the user says not to update memory, do not update memory.

## Finish

Report the created or updated paths.

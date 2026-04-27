---
name: memory-setup
description: Initialize Wingman memory files and platform entry rules. Use once when a repository needs durable AI-readable project context.
---

# Command: /memory-setup

Initialize the Wingman memory workflow for the current repository. Create files on disk; do not merely print templates.

## Paths

Use `.wingman/` as the platform-neutral data root.

Create:

- `.wingman/memory/`
- `.wingman/memory/domains/`
- `.wingman/memory/archive/`
- `.wingman/registry/`

Seed:

- `.wingman/memory/projectBrief.md`
- `.wingman/memory/activeContext.md`
- `.wingman/memory/domains/README.md`
- `.wingman/memory/archive/README.md`
- `.wingman/registry/ui-components.md`
- `.wingman/registry/business-components.md`
- `.wingman/registry/utils.md`

Platform entry rules:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/wingman-memory.mdc`

## Project Brief Template

Write `.wingman/memory/projectBrief.md`:

```markdown
# 项目全局大脑 (Project Brief)

## 1. 核心架构决策 (ADR - Global Rules)
> 记录影响全站的全局规则。每条必须包含 `[WHY]`。

## 2. 领域索引表 (Domain Registry)
> 根据当前任务判断业务领域，只读取相关 domain 文件。
> 当沉淀出新领域时，在 `.wingman/memory/domains/` 下创建对应 `.md` 文件，并在这里登记。
```

## Active Context Template

Write `.wingman/memory/activeContext.md`:

```markdown
# 核心记忆与进度 (Active Context)

## 待办事项 (WHAT IS LEFT TO DO)
- [ ] 待规划

---
## 短期活跃日志 (CURRENT SPRINT LOGS)
### [初始化] Wingman 记忆系统启用
- **目标**: 启用跨平台 Wingman 记忆系统，用于任务开始前加载项目上下文，并在任务结束后同步重要进度与长期知识。
- **核心文件明细**:
  - `.wingman/memory/projectBrief.md`: [Project Brief] - 记录全局 ADR 与领域索引。
  - `.wingman/memory/activeContext.md`: [Active Context] - 记录短期任务进度、待办与近期决策。
- **遗留问题/备注**: 领域文件将在出现具体业务领域时创建。
```

## Registry Templates

Write each registry file with a title only:

```markdown
# UI Components
```

```markdown
# Business Components
```

```markdown
# Utilities
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
- Use the `memory-load` protocol if `.wingman/memory/projectBrief.md` exists.
- Read `.wingman/memory/activeContext.md` if it exists.
- Read only domain files relevant to the current task.

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
- **Micro-logic comments**: For tiny code changes with large business impact, add `// @业务铁律: [WHY]` in the target code.
- **User override**: If the user says not to update memory, do not update memory.

## Finish

Report the created or updated paths.

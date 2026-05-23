---
name: memory-sync
description: Use when progress, decisions, business logic, API contracts, state flow, field mappings, or durable project knowledge should be recorded in Wingman memory.
---

# Memory Sync

Use this workflow after meaningful work when project context should be recorded.

`memory-sync` updates short-term progress and, when needed, durable project
knowledge.

## Memory Root

Use:

```text
.wingman/memory/
```

Expected files:

```text
.wingman/memory/projectBrief.md
.wingman/memory/activeContext.md
.wingman/memory/domains/
```

If the memory root does not exist, ask the user to run `memory-setup` first.

## User Override

If the user says "skip update", "不更新", "跳过记录", or equivalent, do not
sync memory.

## What To Record

Record changes that affect:

- project decisions;
- API contracts;
- state flow;
- field mappings;
- business rules;
- debugging conclusions;
- important next steps.

Skip purely cosmetic edits, formatting-only changes, and trivial renames.

## Progress Log

Update `activeContext.md` with:

```markdown
### [YYYY-MM-DD] 简短功能标题
- **目标**: 一句话描述本次工作的目标。
- **核心文件明细**:
  - `path/to/file`: 精确说明文件承担的行为、数据或规则变化。
- **遗留问题/备注**: 未处理边界或无。
```

Prepend new logs above older logs. Do not rewrite unrelated history.

## Durable Knowledge

If the work creates a rule that future tasks must follow, write it into the
appropriate domain file or project brief.

Durable notes should include why the rule exists, not only what the rule says.

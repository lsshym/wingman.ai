---
name: memory-sync
description: Use when progress, decisions, business logic, API contracts, state flow, field mappings, or durable project knowledge should be recorded in Wingman memory.
---

# Wingman Memory Sync

Update Wingman memory after meaningful work. This skill owns both short-term progress logging and durable knowledge distillation. Write memory content in Chinese unless the existing memory files clearly use another language.

## Memory Root

Use `.wingman/memory/` as the platform-neutral memory root.

Expected files:

- `.wingman/memory/projectBrief.md`
- `.wingman/memory/activeContext.md`
- `.wingman/memory/domains/*.md`

If the memory root is missing, tell the user to run `memory-setup` before syncing.

## User Override

If the user explicitly says "skip update", "不更新", "跳过记录", "这个不用记忆", "局部改动不记录", or equivalent, stop and do not update memory.

## End Of Task Gate

Before reporting meaningful coding work as complete, run the Value Funnel. If the change passes the funnel and memory has not been synced, do not say done, fixed, completed, or 已完成. Sync memory first unless the user explicitly opted out.

## Phase 1: Progress Log

### Parse Input

- If the user provided a specific sync instruction, record that instruction.
- If no text was provided, review the current session and changed files.

### Value Funnel

- **Block**: Pure CSS/UI pixel changes, variable renames, code movement, formatting, or behavior-preserving extraction with no state/data impact.
- **Record**: Money calculations, state transitions, condition branches, API field mapping, API fallback/interception, rule checkboxes, durable decisions, business rules, or bug conclusions.

When blocked by the funnel, do not write a log. Say that the change did not meet the memory threshold.

### Rule Compliance Proof

Before writing logs, internally verify:

- Did the implementation use the exact canonical field required by memory?
- Was any proxy, heuristic, or semantic substitute used?
- Did the code conflict with any domain truth?

If this proof fails, do not claim the task is complete. Report the conflict and propose a correction.

### Log Quality Rules

- Remove generic filler such as "用于展示", "基础组件", "支持多语言", or "包含逻辑".
- For `.ts` or `.tsx` files, describe at least two of: interaction, data/state, output.
- For `.scss` or `.css` files, describe the exact component and layout issue solved.
- Do not batch unrelated core files into one vague bullet.
- If code contains `// @业务铁律`, append `(已在代码中添加 @业务铁律 注释防呆)` to that file's log line.

### Write Procedure

Open `.wingman/memory/activeContext.md`. Find `## 短期活跃日志 (CURRENT SPRINT LOGS)`.

- **Self-correction exception**: If this update corrects a same-day, same-feature, or same-bug log that is now wrong, remove only that obsolete log and keep the corrected truth.
- **Prepend** the new log directly below the section heading.
- **Red line**: Do not merge, rewrite, reorder, or delete unrelated history.

Use this format:

```markdown
### [YYYY-MM-DD] 简短功能标题
- **目标**: 一句话描述核心业务目标。
- **核心文件明细**:
  - `path/to/file`: [Function/Component Name] - 精确描述交互、数据/状态、输出或业务规则变化。
- **遗留问题/备注**: 写死的数据、未处理边界或无。
```

Update `## 待办事项 (WHAT IS LEFT TO DO)` immediately below that heading when the task changes pending work.

## Phase 2: Knowledge Distillation

After the progress log, decide whether the change created durable knowledge:

- Architecture decision.
- Business truth.
- API contract.
- Routing or state-flow rule.
- Debugging conclusion that should prevent repeated mistakes.

If no durable knowledge exists, stop after the progress log.

If durable knowledge exists:

1. Extract the durable rule and include `[WHY]`: the pitfall, business reason, or technical reasoning.
2. Read `.wingman/memory/projectBrief.md`.
3. Route the knowledge:
   - Global rule or ADR -> update `## 1. 核心架构决策 (ADR - Global Rules)` in `projectBrief.md`.
   - New domain -> create `.wingman/memory/domains/<domain-name>.md` and register it in `projectBrief.md`.
   - Existing domain -> update that domain file.
4. In domain files, write under `## 当前业务真理`.
5. Overwrite outdated or contradictory logic. Do not leave conflicting truths alive.
6. Remove only active-context logs that were fully distilled into durable knowledge, or trivial logs older than 5 days.

## Completion

After updating memory, report which files changed. Do not use celebratory fixed phrases that hide what was actually updated.

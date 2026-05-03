---
name: memory-sync
description: Use when progress, decisions, business logic, API contracts, state flow, field mappings, or durable project knowledge should be recorded in Wingman memory.
---

# Wingman Memory Sync

Update Wingman memory after meaningful work. This skill owns both short-term progress logging and durable knowledge distillation.

## Memory Root

Use `.wingman/memory/` as the platform-neutral memory root.

Expected files:

- `.wingman/memory/projectBrief.md`
- `.wingman/memory/activeContext.md`
- `.wingman/memory/domains/README.md`
- `.wingman/memory/domains/*.md`
- `.wingman/memory/domains/*/index.md`
- `.wingman/memory/archive/*.md`

If the memory root is missing, tell the user to run `memory-setup` before syncing.

## User Override

If the user explicitly says "skip update", "不更新", "跳过记录", "这个不用记忆", "局部改动不记录", or equivalent, stop and do not update memory.

## Language Policy

Write memory content in the configured memory language:

1. Use `## 0. Memory Settings` -> `Language` in `.wingman/memory/projectBrief.md` when present and not `auto`.
2. If the setting is `auto` or missing, use the existing memory files' dominant language.
3. If memory files are empty or mixed, use the user's current language.
4. If still unclear, use English.

Keep field names, code symbols, paths, and API names unchanged.

## End Of Task Gate

Before reporting meaningful coding work as complete, run the Value Funnel. If the change passes the funnel and memory has not been synced, do not say done, fixed, completed, or 已完成. Sync memory first unless the user explicitly opted out.

## Memory Routing

Before writing any memory entry, choose the destination(s) for the completed work. A task may route to more than one destination, but each destination must have a reason.

- **IGNORE**: Use when the change is pure formatting, rename-only cleanup, isolated UI pixel tuning, code movement, or behavior-preserving extraction with no state, data, contract, or business impact.
- **ACTIVE_LOG**: Use when the change records meaningful short-term progress, changed files, debugging outcome, partial work, unresolved follow-ups, or recent implementation context that may matter in the next few sessions.
- **DOMAIN_TRUTH**: Use when the change creates, confirms, corrects, or removes a stable business rule, API contract, canonical field, state-flow rule, permission rule, money calculation, routing rule, or recurring debugging conclusion that should guide future work in one domain.
- **PROJECT_ADR**: Use when the durable rule applies across domains or changes global architecture, project-wide agent behavior, coding standards, platform policy, or repository conventions.
- **ARCHIVE**: Use when active logs are complete, obsolete, contradicted, too old, or already distilled into durable memory and should not load by default.

Routing order:

1. Respect User Override first.
2. Apply **IGNORE** before any write.
3. Use **ACTIVE_LOG** for meaningful work even when durable knowledge is uncertain.
4. Use **DOMAIN_TRUTH** or **PROJECT_ADR** only after the Evidence Gate passes.
5. Use **ARCHIVE** only during maintenance or when the current sync fully distills an active log.

### Evidence Gate

Before writing **DOMAIN_TRUTH** or **PROJECT_ADR**, verify at least one evidence source:

- The user explicitly stated the rule or decision.
- Existing Wingman memory already implies the rule.
- Product docs, API docs, schema, tests, or accepted specs confirm it.
- The implementation intentionally changed a stable contract or business behavior, not just an incidental implementation detail.

If evidence is weak and the proposed durable rule would constrain future work, ask the user before writing durable memory. Do not promote guessed thresholds, temporary constants, local workarounds, or one-off implementation details into `domains/` or `projectBrief.md`.

### Durable Truth Template

When writing **DOMAIN_TRUTH** or **PROJECT_ADR**, include a compact durable rule with `[WHY]`. Prefer the configured memory language, but keep field names, paths, API names, and code symbols unchanged.

Use this shape when the existing memory file has no stronger local format:

```markdown
- `<rule>` [WHY]: `<business reason, contract reason, technical pitfall, or debugging conclusion>`
  - **Evidence**: `<user statement | existing memory | docs/schema/tests/spec | implementation contract>`
  - **Applies When**: `<when future agents should rely on this rule>`
```

## Phase 1: Progress Log

### Parse Input

- If the user provided a specific sync instruction, record that instruction.
- If no text was provided, review the current session and changed files.

### Value Funnel

- **Block**: Route to **IGNORE** for pure CSS/UI pixel changes, variable renames, code movement, formatting, or behavior-preserving extraction with no state/data impact.
- **Record**: Route to **ACTIVE_LOG** for money calculations, state transitions, condition branches, API field mapping, API fallback/interception, rule checkboxes, durable decisions, business rules, or bug conclusions.

When blocked by the funnel, do not write a log. Say that the change did not meet the memory threshold.

### Rule Compliance Proof

Before writing logs, internally verify:

- Did the implementation use the exact canonical field required by memory?
- Was any proxy, heuristic, or semantic substitute used?
- Did the code conflict with any domain truth?

If this proof fails, do not claim the task is complete. Report the conflict and propose a correction.

### Log Quality Rules

- Remove generic filler in any language, such as "for display", "basic component", "contains logic", "用于展示", "基础组件", or "包含逻辑".
- For `.ts` or `.tsx` files, describe at least two of: interaction, data/state, output.
- For `.scss` or `.css` files, describe the exact component and layout issue solved.
- Do not batch unrelated core files into one vague bullet.
- If code contains `// @business-rule` or `// @业务铁律`, append a localized note to that file's log line that the invariant comment was added.

### Write Procedure

Open `.wingman/memory/activeContext.md`. Find the active log section. Common headings include `## Current Sprint Logs` and `## 短期活跃日志 (CURRENT SPRINT LOGS)`.

- **Self-correction exception**: If this update corrects a same-day, same-feature, or same-bug log that is now wrong, remove only that obsolete log and keep the corrected truth.
- **Prepend** the new log directly below the section heading.
- **Red line**: Do not merge, rewrite, reorder, or delete unrelated history.

Use this format:

```markdown
### [YYYY-MM-DD] Short feature title
- **Goal**: One sentence describing the core goal.
- **Core Files**:
  - `path/to/file`: [Function/Component Name] - Precise description of interaction, data/state, output, or business-rule changes.
- **Notes**: Hardcoded data, untreated boundaries, or none.
```

Use field labels in the configured memory language. For Chinese memory, use `目标`, `核心文件明细`, and `遗留问题/备注`. For English memory, use `Goal`, `Core Files`, and `Notes`.

Update the pending tasks section when the task changes pending work. Common headings include `## Pending Tasks` and `## 待办事项 (WHAT IS LEFT TO DO)`.

## Phase 2: Knowledge Distillation

After the progress log, decide whether the change routes to **DOMAIN_TRUTH** or **PROJECT_ADR**:

- Architecture decision.
- Business truth.
- API contract.
- Routing or state-flow rule.
- Debugging conclusion that should prevent repeated mistakes.

If no durable knowledge exists, stop after the progress log.

If durable knowledge exists:

1. Run the Evidence Gate. If evidence is weak and the rule would constrain future work, ask the user before writing durable memory.
2. Extract the durable rule using the Durable Truth Template and include `[WHY]`: the pitfall, business reason, or technical reasoning.
3. Read `.wingman/memory/projectBrief.md`.
4. Read `.wingman/memory/domains/README.md` if it exists and follow its structure rules.
5. Route the knowledge:
   - Global rule or ADR -> update the architecture decisions section in `projectBrief.md`.
   - Existing small domain -> update `.wingman/memory/domains/<domain>.md`.
   - Existing folder domain -> read `<domain>/index.md`, choose the relevant topic file, then update the index when adding or moving subfiles.
   - New domain -> create either `.wingman/memory/domains/<domain>.md` for small domains or `.wingman/memory/domains/<domain>/index.md` plus topic files for large domains.
6. Do not create one domain file per small feature. Route feature knowledge into a stable business domain whenever possible.
7. If a domain file exceeds 250 lines or contains 3+ unrelated knowledge clusters, split it into `<domain>/index.md` plus topic files and update `projectBrief.md`.
8. In domain files, write durable rules under the current truths section. Use `## Current Truths` for English memory or `## 当前业务真理` for Chinese memory.
9. Overwrite outdated or contradictory logic. Do not leave conflicting truths alive.
10. Remove only active-context logs that were fully distilled into durable knowledge, or trivial logs older than 5 days.

## Phase 3: Active Context Maintenance

Treat `activeContext.md` as hot working memory, not permanent history.

Run maintenance when:

- `activeContext.md` has more than 20 log entries.
- `activeContext.md` is longer than 300 lines.
- The user asks to clean, compact, or summarize memory.

Maintenance rules:

- Keep current todos and recent high-signal logs in `activeContext.md`.
- Route complete old log blocks to **ARCHIVE** by moving them to `.wingman/memory/archive/YYYY-MM.md`; do not summarize them unless the user asks.
- Prefer distilling stable rules into `domains/*.md` before archiving.
- Delete only logs proven obsolete, contradicted, or replaced by a same-task correction.
- Never rewrite `activeContext.md` wholesale.

## Completion

After updating memory, report which files changed. Do not use celebratory fixed phrases that hide what was actually updated.

---
name: memory-sync
description: Sync progress, decisions, or new records into the memory workflow. Use when users want to manually refresh project memory.
---

# Command: /memory-sync v3.1 (Value Funnel Dispatcher)

**System**: Skill Dispatcher & Project Scribe.
**Task**: Orchestrate the Memory Bank update by explicitly triggering V3 Value-Funnel Agent Skills.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

---

## Step 1: INITIATE & PARSE (触发解析)
Parse input: `/memory-sync [text]`.
- Case A: `/memory-sync` (No extra text) -> Analyze current chat session for core changes.
- Case B: `/memory-sync [text]` -> Focus specifically on the instruction in `[text]`.
- **User Override**: If user explicitly said "skip update", "不更新" -> STOP entirely.

---

## Step 2: EXECUTE SKILL 1 - THE SCRIBE (执行记录技能)
You MUST execute the intent defined in `.cursor/skills/log-sprint-progress/SKILL.md`.

**CRITICAL ENFORCEMENT DURING EXECUTION (价值漏斗防线):**
1. **GATEKEEPER (价值漏斗)**: 
   - **拦截**: 纯 CSS/UI 像素调整、重构、变量改名、代码位置挪动 -> STOP。
   - **放行 (必记)**: 涉及 **金额计算、状态流转映射、条件分支增删、API 字段拦截/兜底**，**即便只有 1 行改动** -> 必须记录。
2. **Generic Filler BANNED**: 严禁出现 "用于展示", "基础组件", "包含逻辑" 等废话。
3. **Micro-Logic Check**: 检查代码中是否包含 `// @业务铁律` 注释。如有，日志描述末尾必须添加 `(已在代码中添加 @业务铁律 注释防呆)`。
4. **Target & Action**: Open `.cursor/memory/activeContext.md`. **PREPEND** the log EXACTLY below `## 短期活跃日志 (CURRENT SPRINT LOGS)`.
5. **ABSOLUTE RED LINE**: **Do NOT rewrite, summarize, or delete ANY historical entries below your newly inserted log.**
6. **Todo Sync**: Update pending tasks below `## 待办事项 (WHAT IS LEFT TO DO)`.

---

## Step 3: EVALUATE CHAINING (流转评估)
Analyze the log you just drafted. 
Ask: "Does this change contain DURABLE/MACRO project knowledge (Architecture, ADRs, Domain-wide Truths)?"
- **IF NO** (e.g., only micro-logic with inline comments): Stop here. Output: "✅ 进度已同步 (Value Funnel Logic Applied)."
- **IF YES**: Proceed immediately to Step 4.

---

## Step 4: EXECUTE SKILL 2 - THE ARCHITECT (执行架构师技能)
You MUST execute the intent defined in `.cursor/skills/distill-domain-knowledge/SKILL.md`.

**CRITICAL ENFORCEMENT DURING EXECUTION:**
1. **Require [WHY]**: You MUST extract the business logic and explicitly write the `[WHY]` (the pitfall or reasoning).
2. **Auto-Shard & Route**: Read `.cursor/brain/projectBrief.md`. If it belongs to a **NEW DOMAIN**, you MUST create `.cursor/memory/domains/<new-domain>.md` and register it in `projectBrief.md`.
3. **Truth Table**: Overwrite outdated logic in the target Domain file. 
4. **Purge**: Silently DELETE trivial logs older than 5 days from `activeContext.md`.
5. Output exactly: "✅ 进度已同步，级联提炼完成: 高价值知识已升华并自动分片 (Value Funnel & Iron Laws Passed)."

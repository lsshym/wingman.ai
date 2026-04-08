# Command: Memo Sync v3 (Superpowers Dispatcher)

**System**: Skill Dispatcher & Project Scribe.
**Task**: Orchestrate the Memory Bank update by explicitly triggering V3 decoupled Agent Skills.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

---

## Step 1: INITIATE & PARSE (触发解析)
Parse input: `/memo [text]`.
- Case A: `/memo` (No extra text) -> Analyze current chat session for core changes.
- Case B: `/memo [text]` -> Focus specifically on the instruction in `[text]`.
- **User Override**: If user explicitly said "skip update", "不更新" -> STOP entirely.

---

## Step 2: EXECUTE SKILL 1 - THE SCRIBE (执行记录技能)
You MUST execute the intent defined in `.cursor/skills/log-sprint-progress/SKILL.md`.

**CRITICAL ENFORCEMENT DURING EXECUTION:**
1. **Gatekeeper**: If changes are purely CSS/UI tweaks, renaming, or refactoring without behavior change -> STOP. Output: "无实质业务变更，按铁律跳过记录。"
2. **Generic Filler BANNED**: Phrases like "用于展示", "基础组件", "包含逻辑" MUST NOT exist in your output.
3. **Checklist MUST Pass**: `.tsx/.ts` files MUST specify at least 2 of: `[Interaction]`, `[Data/State]`, `[Output]`.
4. **Target & Action**: Open `.cursor/memory/activeContext.md`. **PREPEND** the log EXACTLY below the ``.
5. **ABSOLUTE RED LINE**: **Do NOT rewrite, summarize, or delete ANY historical entries below your newly inserted log.**
6. **Todo Sync**: Update pending tasks immediately below ``.

---

## Step 3: EVALUATE CHAINING (流转评估)
Analyze the log you just drafted. 
Ask: "Does this change contain durable business truths, API contracts, ADRs, or state machine logic?"
- **IF NO**: Stop here. Output: "✅ 进度已极其详尽地同步 (Log Skill Executed)."
- **IF YES**: Proceed immediately to Step 4.

---

## Step 4: EXECUTE SKILL 2 - THE ARCHITECT (执行架构师技能)
You MUST execute the intent defined in `.cursor/skills/distill-domain-knowledge/SKILL.md`.

**CRITICAL ENFORCEMENT DURING EXECUTION:**
1. **Require [WHY]**: You MUST extract the business logic and explicitly write the `[WHY]` (the pitfall or reasoning).
2. **Auto-Shard & Route**: Read `.cursor/brain/projectBrief.md` (Domain Registry). 
   - If it belongs to a **NEW DOMAIN**, you MUST create `.cursor/memory/domains/<new-domain>.md` and register the path in `projectBrief.md`.
3. **Truth Table**: Overwrite outdated logic in the target Domain file under `## 当前业务真理`. DO NOT leave contradictory facts alive.
4. **Purge**: Silently DELETE trivial logs older than 5 days from `activeContext.md`.
5. Output exactly: "✅ 进度已同步，触发级联技 [架构师]: 高价值知识已升华并自动分片 (Skills Chained & Iron Laws Passed)."

# Initialize Memory Bank (v2.0 Skill-Based Edition)

**System Role**: You are a scaffolding tool.
**Task**: Create the required files strictly based on the configuration variables defined below. Do not generate conversational text.

---

## Step 0: DYNAMIC CONFIGURATION (Soft Logic)
**Action**: Parse the user's input command to set **VAR_TAG**.
1. If user typed `/init <name>` (e.g., `/init azu`), set **VAR_TAG** = "<name>".
2. If user typed `/init` (no argument), set **VAR_TAG** = "".

> **LOGIC FLOW**:
> IF (**VAR_TAG** != ""):
>    **VAR_MEMORY_DIR** = `.cursor/memory-` + **VAR_TAG**
>    **VAR_RULE_FILE** = `.cursor/rules/memory-` + **VAR_TAG** + `.mdc`
> ELSE:
>    **VAR_MEMORY_DIR** = `.cursor/memory`
>    **VAR_RULE_FILE** = `.cursor/rules/memory-bank.mdc`

---

## Step 1: Secure in .gitignore (Conditional)
**Condition**: EXECUTE ONLY IF **VAR_TAG** IS NOT EMPTY (Private Mode).
**Action**:
1. Check if `.gitignore` exists in the project root.
2. If it does not exist, create it.
3. Append the following lines to `.gitignore`:
'''gitignore
# --- Cursor Memory Bank ({MEMORY_DIR}) ---
{MEMORY_DIR}/
{RULE_FILE}
'''

---

## Step 2: Structure Setup
Ensure these directories exist:
- `.cursor/rules/`
- `.cursor/skills/memory-manager/`
- **VAR_MEMORY_DIR**

---

## Step 3: Create Driver Rule (Enhanced)
**File Path**: **VAR_RULE_FILE**
**Content**:
(Replace `{MEMORY_PATH}` with the actual value of **VAR_MEMORY_DIR**)
'''markdown
---
description: Memory Bank Driver (记忆库驱动)
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

## RULE (核心规则)
1. **🧠 READ (读取上下文)**: At the start of EVERY session, **read** `{MEMORY_PATH}/activeContext.md`.
2. **🛑 ENFORCE (强制规范)**: Before generating code, **check** the `Critical Rules & Patterns` section in `activeContext.md`. You MUST follow these architectural constraints even if not explicitly prompted.
3. **📝 UPDATE (动态更新)**: After a significant task or before ending a session, you MUST update `{MEMORY_PATH}/activeContext.md`.
   - **CRITICAL ACTION**: You MUST use your file-editing capabilities to directly modify and save the file. 
   - **DO NOT** just output the proposed markdown changes in the chat. 
   - **DO NOT** ask for permission, just directly write the new content into the actual file.
   - If you discovered a new pattern or pitfall, append it to **[Critical Rules]**.
   - If ending the session, rewrite **[Session Handoff]** to summarize current progress for the next context.
'''

---

## Step 4: Create Project Brief
**File Path**: **VAR_MEMORY_DIR** + `/projectBrief.md`
**Content**:
'''markdown
# Project Brief (项目概况)

## Core Tech Stack (核心技术栈)
- 前端框架: 
- 语言: 
- 样式方案: 

## Core Conventions (核心规范)
- **命名规范**: PascalCase for Components, camelCase for functions.
- **严禁事项**: No `any` type; No inline styles.
'''

---

## Step 5: Create Active Context (With Anchors)
**File Path**: **VAR_MEMORY_DIR** + `/activeContext.md`
**Content**:
'''markdown
# 🧠 Active Memory & Constraints

## 🛑 Critical Rules & Patterns (强制规范)
- **[架构约束]**: 遵循现有目录结构

## 🔌 Session Handoff (当前进度)
- **[当前状态]**: 项目初始化完成。

## 💡 Pending Ideas (待办事项)
- 
'''

---

## Step 6: Create Memory Skill (The Updater)
**File Path**: `.cursor/skills/memory-manager/SKILL.md`
**Content**:
(Replace `{MEMORY_PATH}` with the actual value of **VAR_MEMORY_DIR**)
'''markdown
---
description: Update Memory Bank (手动更新记忆)
---
# Memory Manager Skill

**Trigger**: When user says "update memory", "save context", "记录一下", or "checkpoint".

## Execution Steps

1.  **Analyze**: Review the recent conversation and code changes.
2.  **Target File**: Open `{MEMORY_PATH}/activeContext.md`.
3.  **Precision Update**:
    * **Rules**: Look for ``. Append new distinct rules *below* it.
    * **Status**: Look for ``. Completely *replace* the text below it with a summary of what we just finished and what's next.
    * **Ideas**: Look for ``. Append new future tasks *below* it.
4.  **No Full Rewrite**: Do NOT rewrite the file from scratch. Only edit the sections marked by comments.
5.  **Confirm**: Reply "✅ Memory Updated".
'''

---

## Step 7: Finish
Output exactly: "✅ Memory Bank v2.0 initialized (Skill-Based Architecture)."

# Initialize Memory Bank (Final Hybrid Version)

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
3. **📝 UPDATE (动态更新)**: After a significant task or before ending a session, **you must edit** `{MEMORY_PATH}/activeContext.md`:
   - If you discovered a new pattern or pitfall, update **[Critical Rules]**.
   - If ending the session, update **[Session Handoff]** for the next context.
'''

---

## Step 4: Create Project Brief (Chinese Content)
**File Path**: **VAR_MEMORY_DIR** + `/projectBrief.md`
**Content**:
'''markdown
# Project Brief (项目概况)

## 2. Core Tech Stack (核心技术栈)
- 前端框架: 
- 语言: 
- 样式方案: 
- 状态管理: 

## 3. Core Conventions (核心规范)
- **文件结构**: 
- **命名规范**: 组件使用 PascalCase，函数使用 camelCase。
- **严禁事项**: 严禁使用 `any` 类型；严禁在组件内直接写行内样式。
'''

---

## Step 5: Create Active Context (Chinese Content - Rule & Handoff)
**File Path**: **VAR_MEMORY_DIR** + `/activeContext.md`
**Content**:
'''markdown
# 🧠 Active Memory & Constraints (核心记忆与约束)

## 🛑 Critical Rules & Patterns (强制规范与踩坑记录)
- **[架构约束]**: 

## 🔌 Session Handoff (会话交接)
- **[当前上下文]**: 

## 💡 Pending Ideas (待办思路)
- 
'''

---

## Step 6: Finish
Output exactly: "✅ Memory Bank initialized (Hybrid Version with Enhanced Update Rules)."

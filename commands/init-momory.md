# Initialize Memory Bank (Full Logic + Rule/Handoff - EN)

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

## Step 3: Create Driver Rule
**File Path**: **VAR_RULE_FILE**
**Content**:
(Replace `{MEMORY_PATH}` with the actual value of **VAR_MEMORY_DIR**)
'''markdown
---
description: Memory Bank Driver
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

## RULE
1. **🧠 READ CONTEXT**: At the start of EVERY session, read `{MEMORY_PATH}/activeContext.md`.
2. **🛑 ENFORCE PATTERNS**: Before generating code, check the `Critical Rules & Patterns` section in `activeContext.md`. You MUST follow these architectural constraints (e.g., security wrappers, specific hooks) even if the user doesn't mention them.
3. **🔌 UPDATE HANDOFF**: Before ending a session or when context shifts, update the `Session Handoff` section. Summarize strictly what is needed for the *next* conversation to continue seamlessly.
'''

---

## Step 4: Create Project Brief (Template)
**File Path**: **VAR_MEMORY_DIR** + `/projectBrief.md`
**Content**:
'''markdown
# Project Brief

## Tech Stack
- Framework: 
- Language: 
- Styling: 
- State Management: 

## Core Conventions
- **Structure**: 
- **Naming**: PascalCase for components, camelCase for functions.
- **Strict Rules**: No `any` type; No inline styles.
'''

---

## Step 5: Create Active Context (Rule & Handoff Template)
**File Path**: **VAR_MEMORY_DIR** + `/activeContext.md`
**Content**:
'''markdown
# 🧠 Active Memory & Constraints

## 🛑 Critical Rules & Patterns
- **[Architectural Constraints]**: 

## 🔌 Session Handoff
- **[Current Context]**: 

## 💡 Pending Ideas
- 
'''

---

## Step 6: Finish
Output exactly: "✅ Memory Bank initialized (Dynamic Logic + Handoff Template)."

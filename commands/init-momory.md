# Initialize Memory Bank (Rule & Handoff Version)

**System Role**: You are a scaffolding tool.
**Task**: Create the required files strictly based on the configuration variables.

---

## Step 0: CONFIGURATION
**VAR_MEMORY_DIR** = `.cursor/memory`
**VAR_RULE_FILE** = `.cursor/rules/memory-bank.mdc`

---

## Step 1: Secure in .gitignore
**Condition**: Check if `.gitignore` exists. If not, create it.
**Action**: Append the following lines:
'''gitignore
# --- Cursor Memory Bank ---
.cursor/memory/
'''

---

## Step 2: Structure Setup
Ensure directories exist:
- `.cursor/rules/`
- `.cursor/memory/`

---

## Step 3: Create Driver Rule
**File Path**: **VAR_RULE_FILE**
**Content**:
'''markdown
---
description: Memory Bank Driver
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

## RULE
1. **🧠 READ CONTEXT**: At the start of EVERY session, read `.cursor/memory/activeContext.md`.
2. **🛑 ENFORCE PATTERNS**: Before generating code, check the `Critical Rules & Patterns` section in `activeContext.md`. You MUST follow these architectural constraints (e.g., security wrappers, specific hooks) even if the user doesn't mention them.
3. **🔌 UPDATE HANDOFF**: Before ending a session or when context shifts, update the `Session Handoff` section. Summarize strictly what is needed for the *next* conversation to continue seamlessly.
'''

---

## Step 4: Create Project Brief (Static)
**File Path**: **VAR_MEMORY_DIR** + `/projectBrief.md`
**Content**:
'''markdown
# Project Brief

## Tech Stack
- Framework: 
- Language: 
- Styling: 

## Core Conventions
- **Naming**: PascalCase for components.
- **Structure**: 
'''

---

## Step 5: Create Active Context (Rule & Handoff)
**File Path**: **VAR_MEMORY_DIR** + `/activeContext.md`
**Content**:
'''markdown
# 🧠 Active Memory & Constraints

## 🛑 Critical Rules & Patterns (强制规范与踩坑记录)
- **[规范]**: 

## 🔌 Session Handoff (会话交接)
- **[当前上下文]**: 

## 💡 Pending Ideas (待办思路)
- 
'''

---

## Step 6: Finish
Output: "✅ Memory Bank initialized with [Rule & Handoff] template."

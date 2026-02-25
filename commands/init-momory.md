# Init Memory Bank

**System**: Scaffolding tool.
**Task**: Create files based on variables strictly. No conversational text.

---

## Step 0: CONFIG
Parse command.
If "/init <name>", TAG="<name>".
If "/init", TAG="".

IF TAG != "":
  MEM_DIR = ".cursor/memory-" + TAG
  RULE = ".cursor/rules/memory-" + TAG + ".mdc"
ELSE:
  MEM_DIR = ".cursor/memory"
  RULE = ".cursor/rules/memory-bank.mdc"

---

## Step 1: .gitignore
If TAG != "", ensure .gitignore exists and append:
'''gitignore
{MEM_DIR}/
{RULE}
'''

---

## Step 2: Dirs
Ensure:
- .cursor/rules/
- .cursor/skills/memory-manager/
- {MEM_DIR}

---

## Step 3: Driver Rule
**File**: {RULE}
**Content**:
'''markdown
---
description: Memory Bank Driver
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

1. READ: At start of session, read {MEM_DIR}/activeContext.md.
2. ENFORCE: Follow architecture constraints in activeContext.md.
3. AUTO-UPDATE: When a significant task or coding step is completed, you MUST AUTOMATICALLY trigger the Memory Manager Skill. Do not wait for the user to ask.
4. OVERRIDE: If the user explicitly says "skip update", "不更新", or "跳过记录", DO NOT trigger the update.
'''

---

## Step 4: Project Brief
**File**: {MEM_DIR}/projectBrief.md
**Content**:
'''markdown
# 项目概况

## 核心技术栈
- 前端框架: 
- 语言: 
- 样式方案: 

## 核心规范
- 命名: 组件使用 PascalCase，函数使用 camelCase。
- 严禁事项: 禁用 any 类型；禁用行内样式。
'''

---

## Step 5: Active Context
**File**: {MEM_DIR}/activeContext.md
**Content**:
'''markdown
# 核心记忆与约束

## 强制规范
- [架构]: 遵循现有目录结构。

## 当前进度
- [状态]: 初始化完成。

## 待办事项
'''

---

## Step 6: Memory Skill
**File**: .cursor/skills/memory-manager/SKILL.md
**Content**:
'''markdown
---
description: Update Memory Bank
---
# Memory Manager

Trigger: Auto-triggered by Driver Rule at task completion, OR manually via "记录一下", "update memory", "save context".

Steps:
1. Analyze recent changes.
2. Open {MEM_DIR}/activeContext.md.
3. Update:
   - Rules: Append new rules below .
   - Status: Replace text below with current summary.
   - Ideas: Append below .
4. Do NOT rewrite from scratch. Edit marked sections only.
5. Reply: "记忆已自动更新 (Memory Updated)."
'''

---

## Step 7: Finish
Output exactly: "Initialized with Auto-Update."

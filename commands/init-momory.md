# Command: Init Memory Bank

**System**: Scaffolding tool. You MUST use your file system tools to create directories and write these files to the disk silently. Do not just output the text in chat.
**Task**: Create files based on variables strictly. No conversational text.

---

## Step 0: CONFIG
Parse command.
If "/init <name>", TAG="<name>".
If "/init", TAG="".

BRAIN_DIR = ".cursor/brain"

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
*(Note: Do not ignore BRAIN_DIR as it contains long-term project knowledge that should be committed).*

---

## Step 2: Dirs
Ensure the following directories exist:
- .cursor/rules/
- .cursor/skills/memory-manager/
- {MEM_DIR}/
- {BRAIN_DIR}/

---

## Step 3: Driver Rule (With Gate Functions)
**File**: {RULE}
**Content**:
'''markdown
---
description: Memory Bank Driver
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

1. READ: At start of session, read BOTH of the following:
   - Global Project Brain: {BRAIN_DIR}/projectBrief.md
   - Short-term Context: {MEM_DIR}/activeContext.md

### Gate Function (组件拦截门)
BEFORE writing any new React component or utility function:
  Ask: "Does a similar component or rule exist in {BRAIN_DIR}/projectBrief.md?"
  IF yes:
    STOP - Do not write a new one. Import or follow the existing one.

2. ENFORCE: Strictly follow the constraints and business logic defined in projectBrief.md.
3. AUTO-UPDATE: When a significant task or coding step is completed, you MUST AUTOMATICALLY trigger the Memory Manager Skill.
4. OVERRIDE: If the user explicitly says "skip update", "不更新", or "跳过记录", DO NOT trigger the update.
'''

---

## Step 4: Project Brief (Global Brain with Degrees of Freedom)
**File**: {BRAIN_DIR}/projectBrief.md
*(If file already exists, skip overwriting)*
**Content**:
'''markdown
# 项目全局大脑 (Project Brain)

## 1. 核心技术栈
- 前端框架: 
- 语言: 
- 样式方案: 

## 2. 强制编码规范 (Low Freedom - 绝对服从)
- **命名**: 组件必须使用 PascalCase，函数必须使用 camelCase。
- **严禁事项**: 绝对禁用 `any` 类型；绝对禁用行内样式 (Inline Styles)。
- **架构**: 严格遵循现有目录结构，禁止随意跨模块引用。

## 3. 核心业务与架构决策 (High Freedom - 启发式指导)
- **业务机制**: (在此记录全局业务规则，例如状态流转、核心算法等，遇到类似场景可灵活变通)
- **架构踩坑**: (在此记录跨端兼容处理、第三方库选型原因及防呆指南)
'''

---

## Step 5: Active Context (Dynamic Tracker)
**File**: {MEM_DIR}/activeContext.md
**Content**:
'''markdown
# 核心记忆与进度 (Active Context)

## 当前进度 (WHAT HAS BEEN DONE)
- [初始化]: 项目记忆库已建立。
---
## 待办事项 (WHAT IS LEFT TO DO)
- [ ] 待规划
'''

---

## Step 6: Memory Skill (With Checklists)
**File**: .cursor/skills/memory-manager/SKILL.md
**Content**:
'''markdown
---
description: Update Memory Bank with Strict Hard Constraints
---
# Memory Manager

Trigger: Auto-triggered by Driver Rule at task completion, OR manually via "记录一下", "update memory", "/memo".

Steps:
1. Analyze all recent file changes, code additions, and logical implementations in the current conversation.
2. Open {MEM_DIR}/activeContext.md.

### Logging Verification Checklist
Before writing, you MUST internally verify this checklist:
- [ ] Are generic phrases ("用于展示", "基础组件") completely removed?
- [ ] Do .ts/.tsx files specify at least 2 of: [Interaction], [Data/State], [Output]?
- [ ] Do .scss/.css files specify the exact component and layout issue solved?

3. PREPEND the newly completed tasks immediately below the `` anchor using EXACTLY this format:

### [YYYY-MM-DD] 简短功能标题
- **目标**: (一句话描述本次开发的核心业务目标)
- **核心文件明细**:
  - `path/to/file1.tsx`: [Function/Component Name] - [Interaction/Data/Output detailed description based on Hard Constraints].
  - `path/to/file2.ts`: [Function Name] - [Interaction/Data/Output detailed description].
- **遗留问题/备注**: (写死的数据、未处理的边界情况等)

4. Update the pending tasks list immediately below the `` anchor.
5. Do NOT rewrite or delete historical entries below your newly inserted log.
6. Reply to user: "进度已极其详尽地自动更新 (Strict Progress Updated)."
'''

---

## Step 7: Finish
Output exactly: "Initialized. (Global Brain loaded with Gate Functions, Short-term Progress active)"

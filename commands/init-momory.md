# Command: Init Memory Bank

**System**: Scaffolding tool. You MUST use your file system tools to create directories and write these files to the disk silently. Do not just output the text in chat.
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

1. READ: At start of session, read BOTH {MEM_DIR}/projectBrief.md AND {MEM_DIR}/activeContext.md.
2. ENFORCE: Strictly follow the rules and constraints defined in projectBrief.md whenever generating or modifying frontend components (e.g., PascalCase, no inline styles).
3. AUTO-UPDATE: When a significant task or coding step is completed, you MUST AUTOMATICALLY trigger the Memory Manager Skill. Do not wait for the user to ask.
4. OVERRIDE: If the user explicitly says "skip update", "不更新", or "跳过记录", DO NOT trigger the update.
'''

---

## Step 4: Project Brief (Static)
**File**: {MEM_DIR}/projectBrief.md
**Content**:
'''markdown
# 项目概况与强制规范

## 核心技术栈
- 前端框架: 
- 语言: 
- 样式方案: 

## 强制规范
- 命名: 组件使用 PascalCase，函数使用 camelCase。
- 严禁事项: 禁用 any 类型；禁用行内样式。
- 架构约束: 遵循现有目录结构。
'''

---

## Step 5: Active Context (Dynamic Tracker with Anchors)
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

## Step 6: Memory Skill
**File**: .cursor/skills/memory-manager/SKILL.md
**Content**:
'''markdown
---
description: Update Memory Bank with Strict Hard Constraints
---
# Memory Manager

Trigger: Auto-triggered by Driver Rule at task completion, OR manually via "记录一下", "update memory".

Steps:
1. Analyze all recent file changes, code additions, and logical implementations in the current conversation.
2. Open {MEM_DIR}/activeContext.md.
3. ENFORCE HARD CONSTRAINTS FOR LOGGING:
   - You are STRICTLY FORBIDDEN from using generic phrases like "用于展示", "支持多语言", "基础组件", "包含逻辑".
   - .ts/.tsx Files MUST include at least 2 of: [Key Interaction (click/route)], [Data Source/State (API/Store/Props)], [Output (UI rendered/State mutated)].
   - .scss/.css Files MUST specify the exact component served and layout issue solved.
   - The number of core files changed MUST equal the number of items recorded. Do not batch files into single bullet points.
4. PREPEND the newly completed tasks immediately below the `` anchor using EXACTLY this format:

### [YYYY-MM-DD] 简短功能标题
- **目标**: (一句话描述本次开发的核心业务目标)
- **核心文件明细**:
  - `path/to/file1.tsx`: [Function/Component Name] - [Interaction/Data/Output detailed description based on Hard Constraints].
  - `path/to/file2.ts`: [Function Name] - [Interaction/Data/Output detailed description].
- **遗留问题/备注**: (写死的数据、未处理的边界情况等)

5. Update the pending tasks list immediately below the `` anchor.
6. Do NOT rewrite or delete historical entries below your newly inserted log.
7. Reply to user: "进度已极其详尽地自动更新 (Strict Progress Updated)."
'''

---

## Step 7: Finish
Output exactly: "Initialized. (Rules in Brief, Progress in Context)"

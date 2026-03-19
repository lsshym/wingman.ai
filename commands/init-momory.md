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

1. READ: At start of session, read BOTH {MEM_DIR}/projectBrief.md AND {MEM_DIR}/activeContext.md.
2. ENFORCE: Strictly follow the rules and constraints defined in projectBrief.md.
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

## Step 5: Active Context (Dynamic Tracker)
**File**: {MEM_DIR}/activeContext.md
**Content**:
'''markdown
# 核心记忆与进度

## 当前进度 (做过什么)
- [状态]: 项目初始化完成。

## 待办事项 (还没做什么)
'''

---

## Step 6: Memory Skill
**File**: .cursor/skills/memory-manager/SKILL.md
**Content**:
'''markdown
---
description: Update Memory Bank with High Detail
---
# Memory Manager

Trigger: Auto-triggered by Driver Rule at task completion, OR manually via "记录一下", "update memory".

Steps:
1. Analyze all recent file changes, code additions, and logical implementations in the current conversation.
2. Open {MEM_DIR}/activeContext.md.
3. PREPEND the newly completed tasks at the top of the "## 当前进度" section using EXACTLY the following format:

### [Date/Time] 简短功能标题
- **目标**: (一句话描述本次开发的目标)
- **核心文件**:
  - `src/path/to/file1.tsx`: (描述该文件新增/修改了什么核心逻辑)
  - `src/path/to/file2.ts`: (描述相关的状态、接口或样式变动)
- **关键逻辑/接口**: (描述重要的数据流向、新定义的 Interface、或者第三方库的使用，例如：新增了 `IUserStats` 接口，包含 `health` 和 `experience` 字段)
- **遗留问题/备注**: (是否有写死的数据？是否有尚未处理的边界情况？)

4. Update the "## 待办事项" section by removing completed items and adding logical NEXT STEPS based on the current context.
5. Do NOT rewrite or delete historical entries in the "当前进度" section.
6. Reply to user: "进度已极其详尽地更新 (Detailed Progress Updated)."
'''
---

## Step 7: Finish
Output exactly: "Initialized. (Rules in Brief, Progress in Context)"

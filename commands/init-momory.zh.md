# Initialize Memory Bank (Rule & Handoff Version - CN)

**System Role**: 你是一个文件生成脚手架工具。
**Task**: 根据以下配置变量，严格创建所需的文件结构。不要输出闲聊内容。

---

## Step 0: 配置 (CONFIGURATION)
**VAR_MEMORY_DIR** = `.cursor/memory`
**VAR_RULE_FILE** = `.cursor/rules/memory-bank.mdc`

---

## Step 1: 设置 .gitignore
**Condition**: 检查 `.gitignore` 是否存在。如果不存在则创建。
**Action**: 将以下内容追加到文件末尾（防止记忆库被误提交）：
'''gitignore
# --- Cursor Memory Bank ---
.cursor/memory/
'''

---

## Step 2: 目录结构搭建
确保以下目录存在：
- `.cursor/rules/`
- `.cursor/memory/`

---

## Step 3: 创建驱动规则 (Driver Rule)
**File Path**: **VAR_RULE_FILE**
**Content**:
'''markdown
---
description: Memory Bank Driver (记忆库驱动)
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

## RULE (核心规则)
1. **🧠 读取上下文 (READ)**: 在每次会话开始时，**必须**读取 `.cursor/memory/activeContext.md`。
2. **🛑 强制规范 (ENFORCE)**: 在生成任何代码之前，**必须检查** `activeContext.md` 中的 `Critical Rules & Patterns` 部分。即使我没有口头提醒，你也必须严格遵守那里的架构约束（例如：安全包装器、特定的 Hook 使用）。
3. **🔌 更新交接 (HANDOFF)**: 在会话结束前，或者当前任务上下文发生转换时，更新 `Session Handoff` 部分。只总结“下一段对话无缝继续”所必须的信息。
'''

---

## Step 4: 创建项目简报 (Project Brief)
**File Path**: **VAR_MEMORY_DIR** + `/projectBrief.md`
**Content**:
'''markdown
# Project Brief (项目概况)

## Tech Stack (技术栈)
- 前端框架: 
- 语言: 
- 样式方案: 

## Core Conventions (核心规范)
- **命名**: 组件使用 PascalCase，函数使用 camelCase。
- **文件结构**: 
'''

---

## Step 5: 创建核心记忆 (Active Context)
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

## Step 6: 完成
输出: "✅ Memory Bank 初始化完成（规则与交接专用版）。"

# Command: Init Memory Bank

**System**: Scaffolding tool. You MUST use your file system tools to create directories and write these files to the disk silently. Do not just output the text in chat. Create files strictly based on the variables below. No conversational text.

---

## Step 0: CONFIG
BRAIN_DIR = ".cursor/brain"
MEM_DIR = ".cursor/memory"
DOMAIN_DIR = ".cursor/memory/domains"
RULE = ".cursor/rules/memory-bank.mdc"

---

## Step 1: Dirs
Ensure the following directories exist:
- .cursor/rules/
- .cursor/skills/memory-manager/
- {MEM_DIR}/
- {DOMAIN_DIR}/
- {BRAIN_DIR}/

---

## Step 2: Driver Rule (With Dynamic Routing & Strict Gate)
**File**: {RULE}
**Content**:
'''markdown
---
description: Memory Bank Driver
globs: **/*
alwaysApply: true
---
# MEMORY BANK DRIVER

1. **READING PROTOCOL (三层动态读取协议)**:
   At start of session, read in this strict order:
   - **Layer 1**: {BRAIN_DIR}/projectBrief.md
   - **Layer 2 (Dynamic)**: Based on prompt & Domain Index in projectBrief.md, silently read the ONE relevant {DOMAIN_DIR}/<name>.md.
   - **Layer 3**: {MEM_DIR}/activeContext.md

2. **GATE FUNCTION (组件拦截门)**:
   BEFORE writing any new React component or utility:
   Ask: "Does a similar component or rule exist in projectBrief.md or the Domain file?"
   IF yes: STOP. Import or follow the existing convention.

3. **STRICT AUTO-UPDATE**:
   Only trigger the Memory Manager Skill when the completed task creates durable project knowledge.
   **DO NOT trigger updates for:**
   - pure component encapsulation or extraction
   - file renaming or moving
   - style-only tweaks (CSS/SCSS)
   - local refactors with no behavior change
   - one-off UI cleanup
   - replacing duplicated JSX with a small reusable component

4. **OVERRIDE**:
   If the user explicitly says "skip update", "不更新", "跳过记录", "局部改动不记录", DO NOT trigger.
'''

---

## Step 3: Project Brief (Layer 1 - Brain)
**File**: {BRAIN_DIR}/projectBrief.md
**Content**:
'''markdown
# 项目全局大脑 (Project Brain)

## 1. 强制编码规范 (Low Freedom - 绝对服从)
- **命名**: 组件必须使用 PascalCase，函数必须使用 camelCase。
- **严禁事项**: 绝对禁用 `any` 类型；绝对禁用行内样式 (Inline Styles)。
- **架构**: 严格遵循现有目录结构，禁止随意跨模块引用。

## 2. 核心架构决策 (ADR - 启发式指导)
> ⚠️ 记录影响全站的全局规则，必须附带 [WHY]。
- **[架构踩坑]**: (在此记录跨端兼容处理、全局库选型原因)

## 3. 领域索引 (Domain Index - 动态路由寻址)
> ⚠️ AI 读取指南：根据当前对话推断业务线，按需读取对应 Domain 文件。
- **Plushie (众筹娃娃)** -> .cursor/memory/domains/plushie.md
- **Admin (后台管理)** -> .cursor/memory/domains/admin.md
*(注：出现新业务模块时在此添加索引并创建文件)*
'''

---

## Step 4: Domain Template (Layer 2)
**File**: {DOMAIN_DIR}/plushie.md
**Content**:
'''markdown
# 领域知识库: Plushie (众筹娃娃)

## 当前业务真理 (Feature Truth Table)
> ⚠️ 这里的逻辑代表当前真实生效的代码行为。遇到冲突必须直接覆盖旧结论。必须写明 [WHY]（避坑指南）。
- 待规划...
'''

---

## Step 5: Active Context (Layer 3)
**File**: {MEM_DIR}/activeContext.md
**Content**:
'''markdown
# 核心记忆与进度 (Active Context)

## 待办事项 (WHAT IS LEFT TO DO)
- [ ] 待规划

---
## 短期活跃日志 (CURRENT SPRINT LOGS)
> ⚠️ 采用严格格式记录最近改动。超载后由 Skill 触发升华与清理。
### [初始化] 记忆系统升级
- **目标**: 启用动态路由与严格校验版记忆库。
- **核心文件明细**:
  - `.cursor/rules/memory-bank.mdc`: [配置] - 引入三层读取与拦截黑名单。
- **遗留问题/备注**: 无。
'''

---

## Step 6: Memory Skill (Strict Distillation & Logging)
**File**: .cursor/skills/memory-manager/SKILL.md
**Content**:
'''markdown
---
description: Update Memory Bank with Distillation and Strict Checklists
---
# Memory Manager
Trigger: Auto-triggered by Driver Rule, OR manually via "记录一下", "/memo".

Steps:
1. **GATEKEEPER**: Review recent changes. If they are purely UI cleanup, css tweaks, or component extraction WITHOUT behavior change, STOP entirely. Do not log.
2. **DISTILL (知识升华)**: 
   Identify if changes contain durable business rules or global architecture decisions.
   - If YES: Update `{BRAIN_DIR}/projectBrief.md` or `{DOMAIN_DIR}/<name>.md` directly. You MUST completely overwrite outdated contradictory logic. You MUST include the `[WHY]`.
3. **LOGGING VERIFICATION CHECKLIST**:
   Before writing the short-term log to activeContext.md, internally verify:
   - [ ] Are generic phrases ("用于展示", "基础组件") completely removed?
   - [ ] Do .ts/.tsx files specify at least 2 of: [Interaction], [Data/State], [Output]?
   - [ ] Do .scss/.css files specify the exact component and layout issue solved?
4. **WRITE LOG**: 
   Open `{MEM_DIR}/activeContext.md`. PREPEND the new task immediately below the `` using EXACTLY this format:
   ### [YYYY-MM-DD] 简短功能标题
   - **目标**: (一句话描述本次开发的核心业务目标)
   - **核心文件明细**:
     - `path/to/file1.tsx`: [Function Name] - [Interaction/Data/Output detailed description based on Hard Constraints].
   - **遗留问题/备注**: (写死的数据、未处理边界等)
5. **PURGE (定期修剪)**:
   If `activeContext.md` has trivial logs older than 5 days or logs that have already been distilled into Domain files, silently DELETE those old entries to keep the file lean.
6. **REPLY**: "进度已极其详尽地自动更新，高价值知识已升华 (Strict Progress Updated & Knowledge Distilled)."
'''

---

## Step 7: Finish
Output exactly: "Memory Bank Initialized."

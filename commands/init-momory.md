# Command: Init Memory Bank v3 (Absolute Verbatim Edition)

**System**: Scaffolding tool. You MUST use your file system tools to create directories and write these files to the disk silently. Do not just output the text in chat. Create files strictly based on the variables below. No conversational text.

---

## Step 0: CONFIG
BRAIN_DIR = ".cursor/brain"
MEM_DIR = ".cursor/memory"
DOMAIN_DIR = ".cursor/memory/domains"

---

## Step 1: Dirs
Ensure the following directories exist:
- .cursor/rules/
- .cursor/skills/log-sprint-progress/
- .cursor/skills/distill-domain-knowledge/
- {MEM_DIR}/
- {DOMAIN_DIR}/
- {BRAIN_DIR}/

---

## Step 2: Driver Rule & Standards (The Law)
**File**: .cursor/rules/00-architecture-and-standards.mdc
**Content**:
'''markdown
---
description: Global Coding Standards and Memory Router
globs: **/*
alwaysApply: true
---
# 1. MEMORY ROUTING PROTOCOL (按需寻址)
At the start of any session or task, read BOTH:
- Layer 1: `{BRAIN_DIR}/projectBrief.md` (For ADRs and Domain Index)
- Layer 3: `{MEM_DIR}/activeContext.md` (For short-term context)
Then silently identify the business domain and read the specific `{DOMAIN_DIR}/<name>.md`.

# 2. GATE FUNCTION (组件拦截门)
BEFORE writing any new React component or utility function:
Ask: "Does a similar component or rule exist in `projectBrief.md` or the Domain file?"
IF yes: STOP - Do not write a new one. Import or follow the existing convention.

# 3. HARD CODING CONSTRAINTS (业务逻辑铁律 - 绝对服从)
- **禁止业务字段误兜底 (NO SILENT FALLBACKS)**: 严禁使用 `??`, `||` 或链式 `?:` 将「语义相近但业务含义不同」的字段互为备份（例如：`gifts ?? actual_gifts`）。
  - **[WHY]**: 兜底会展示错误业务状态且极难排查。以哪个字段为准就只读该字段；数据缺失则 UI 按「无该项/空态」处理，绝不静默换用其他数据。
- **命名规范**: 组件必须 `PascalCase`，函数必须 `camelCase`。
- **类型与样式**: 绝对禁用 `any`；绝对禁用行内样式 (Inline Styles)。
- **架构**: 严格遵循现有目录结构，禁止随意跨模块引用。

# 4. OVERRIDE (用户豁免权)
If the user explicitly says "skip update", "不更新", "跳过记录", "这个不用记忆", or "局部改动不记录", DO NOT trigger any memory update skills.
'''

---

## Step 3: Project Brief (Layer 1 - Brain)
**File**: {BRAIN_DIR}/projectBrief.md
**Content**:
'''markdown
# 项目全局大脑 (Project Brain)

## 1. 核心架构决策 (ADR - Global Rules)
> ⚠️ 记录影响全站的全局规则，必须附带 [WHY]。
- **[示例] 响应式规范**: 桌面 rem()，移动端 vw()。[WHY]: 确保 PC/iPad 换算口径统一。

## 2. 领域索引表 (Domain Registry)
> ⚠️ AI 寻址与扩容指南：
> 1. 【路由】：根据对话推断业务线，按需读取下方对应文件。
> 2. 【自动分片 (Auto-Sharding)】：当提炼出新领域时，**必须主动在 `.cursor/memory/domains/` 下新建 `.md` 文件，并将新路径登记在下方！**
> 
> *(以下为 Demo 示例，请在实际开发中覆盖或扩充)*
- **CoreAuth (鉴权)** -> .cursor/memory/domains/core-auth.md
- **Checkout (结算)** -> .cursor/memory/domains/checkout.md
'''

---

## Step 4: Active Context (Layer 3 - Sprint Log)
**File**: {MEM_DIR}/activeContext.md
**Content**:
'''markdown
# 核心记忆与进度 (Active Context)

## 待办事项 (WHAT IS LEFT TO DO)
- [ ] 待规划

---
## 短期活跃日志 (CURRENT SPRINT LOGS)
### [初始化] V3 系统部署
- **目标**: 启用基于 Superpowers 架构的多技能解耦版记忆系统，植入所有铁律与兜底禁令。
- **核心文件明细**:
  - `.cursor/rules/00-architecture-and-standards.mdc`: [配置] - 剥离静态规则，实现免读取全局约束与拦截。
- **遗留问题/备注**: 无。
'''

---

## Step 5: SKILL 1 - 纯粹的记录者 (Log Progress)
**File**: .cursor/skills/log-sprint-progress/SKILL.md
**Content**:
'''markdown
---
description: MANDATORY: Update activeContext.md based on user intent.
---
# Skill: Log Sprint Progress
**Trigger**: When a coding task is completed, or user says "/log", "/memo", "记录一下".
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

### Steps:
1. **PARSE INPUT**: 
   - Case A: No extra text -> Review current chat session.
   - Case B: User provides specific instruction -> Follow the specific instruction.
2. **GATEKEEPER (拦截门)**: 
   If changes are pure component encapsulation/extraction, renaming symbols or files without behavioral change, moving files across folders, css/scss-only adjustments, local UI cleanup, replacing duplicated JSX with a small reusable component, or small presentational refactors with unchanged business behavior -> STOP entirely. Do not log.
3. **VERIFICATION CHECKLIST (绝杀废话与严苛要求)**:
   Before writing, internally verify:
   - [ ] Are generic phrases ("用于展示", "基础组件", "支持多语言", "包含逻辑") completely removed?
   - [ ] Do `.ts/.tsx` descriptions specify at least 2 of: [Interaction], [Data/State], [Output]?
   - [ ] Do `.scss/.css` descriptions specify the exact component and layout issue solved?
   - [ ] Does the number of core files changed equal the number of items recorded? (No batching).
4. **WRITE LOG (严格格式)**: 
   Open `.cursor/memory/activeContext.md`. Find the ``. **PREPEND (insert immediately below the anchor)** the generated detailed log. 
   **CRITICAL: Do NOT rewrite or delete historical entries below it.**
   Format EXACTLY:
   ### [YYYY-MM-DD] 简短功能标题
   - **目标**: (一句话描述核心业务目标)
   - **核心文件明细**:
     - `path/to/file`: [Function/Component Name] - [Checklist-based exact description].
   - **遗留问题/备注**: (写死的数据/未处理边界)
5. **UPDATE PENDING TASKS**:
   Find the `` and update the pending tasks list immediately below it.
6. **CHAINING (流转评估)**: 
   Does the completed task create durable project knowledge (business rules, API contracts, routing flow, state flow, shared architecture decisions, or important debugging conclusions)?
   - IF YES: Invoke the `distill-domain-knowledge` skill immediately.
   - IF NO: Reply "✅ 进度已极其详尽地同步 (Iron Laws passed)."
'''

---

## Step 6: SKILL 2 - 纯粹的架构师 (Distill Knowledge)
**File**: .cursor/skills/distill-domain-knowledge/SKILL.md
**Content**:
'''markdown
---
description: MANDATORY: Extract durable project knowledge, auto-shard domains, and update projectBrief/Domains.
---
# Skill: Distill Domain Knowledge
**Trigger**: Chained from `log-sprint-progress`, or when durable business truths/ADRs are established.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

### Steps:
1. **EXTRACT & REQUIRE [WHY]**: 
   Extract the durable business rule, API contract, or debugging conclusion. You MUST formulate the `[WHY]` (the pitfall, business requirement, or reasoning).
2. **EVALUATE BOUNDARY & ROUTE (分片与路由)**:
   Read `.cursor/brain/projectBrief.md` (Domain Registry).
   - **IF GLOBAL RULE**: Update the `## 1. 核心架构决策 (ADR)` section in `projectBrief.md`.
   - **IF NEW DOMAIN**: Create a new file `.cursor/memory/domains/<new-name>.md`. Register this new path in `projectBrief.md`.
   - **IF EXISTING DOMAIN**: Target the specific `.cursor/memory/domains/<name>.md`.
3. **WRITE TRUTH TABLE**:
   In the target domain file, under `## 当前业务真理`:
   - Overwrite any outdated or contradictory logic. DO NOT leave contradictory facts alive.
   - Append the new rule explicitly.
4. **PURGE (清理噪音)**:
   Open `.cursor/memory/activeContext.md`. Silently DELETE trivial logs older than 5 days or logs that have just been perfectly distilled into domain knowledge.
5. **REPLY**: "✅ 高价值知识已升华并自动分片 (Iron Laws passed). 陈旧流水账已修剪。"
'''

---

## Step 7: Finish
Output exactly: "V3 Memory Bank Initialized. (Absolute Verbatim Edition: All Original Gates, Overrides, and Constraints Restored)."

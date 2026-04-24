---
name: memory-setup
description: Initialize the project memory workflow. Use when a repository needs durable context for long-running or collaborative work.
---

# Command: /memory-setup v3.4 (Hard Gate Edition)

Triggered when the user types `/memory-setup`.

**System**: Scaffolding tool. You MUST use your file system tools to create directories and write these files to the disk silently. Do not just output the text in chat. Create files strictly based on the variables below. No conversational text.
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

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

# 2.5 IMPLEMENTATION CONSISTENCY GATE (落地一致性门禁)
Before any code edit, the agent MUST output an internal checklist and satisfy all:
1. Which memory rule(s) are binding this task? (path + bullet title)
2. What exact fields/symbols must be used? (e.g. `checkout_type`, forbidden: `crowdfunding.status`)
3. Which files are allowed to change?
If any item is unclear or cannot be met due to missing props/context, STOP and ask the user. DO NOT implement with substitutes.

# 3. HARD CODING CONSTRAINTS (业务逻辑铁律 - 绝对服从)
- **禁止业务字段误兜底 (NO SILENT FALLBACKS)**: 严禁使用 `??`, `||` 或链式 `?:` 将「语义相近但业务含义不同」的字段互为备份（例如：`gifts ?? actual_gifts`）。
  - **[WHY]**: 兜底会展示错误业务状态且极难排查。以哪个字段为准就只读该字段；数据缺失则 UI 按「无该项/空态」处理，绝不静默换用其他数据。
- **禁止规则替代实现 (NO RULE SUBSTITUTION)**: If memory specifies a canonical field/contract (e.g. `checkout_type`), it is FORBIDDEN to substitute with proxy fields (e.g. `crowdfunding.status`) due to convenience. 
  - **[WHY]**: Proxy fields may look similar but produce semantic drift and break domain truths.
- **微观业务防呆注释 (Micro-Logic Comments)**: 对于代码量极小但业务影响极大的单点修改（例如：强制某金额为 0、特定状态拦截），**必须在代码原处**使用 `// @业务铁律: [WHY]` 进行显式注释。
  - **[WHY]**: 行为局部性原则。防止外部记忆库过于臃肿，同时确保未来阅读该行代码的开发者/AI 能立刻明白其业务重量，防止被误删。
- **命名规范**: 组件必须 `PascalCase`，函数必须 `camelCase`。
- **类型与样式**: 绝对禁用 `any`；绝对禁用行内样式 (Inline Styles)。
- **架构**: 严格遵循现有目录结构，禁止随意跨模块引用。

# 4. OVERRIDE (用户豁免权)
If the user explicitly says "skip update", "不更新", "跳过记录", "这个不用记忆", or "局部改动不记录", DO NOT trigger any memory update skills.

# 5. END OF TASK PROTOCOL (强制收尾引擎 - 解决漏记漏触发)
BEFORE you output your final response to the user saying a coding task is "Done", "Fixed", or "已改好", you MUST execute this checklist:
1. **Value Funnel Check**: Did the current task modify Money Calculations, State Branching, Field Mapping, API Fallbacks, or Rule Checkboxes (金额计算/状态分支/字段映射/接口拦截)? 
2. **Auto-Trigger**: IF YES, you MUST autonomously invoke the `log-sprint-progress` skill BEFORE replying to the user. Do NOT wait for the user to say `/memory-sync`.
3. **Hard Gate**: If the change passes the Value Funnel but you have NOT updated `activeContext.md` and evaluated `domains/*.md`, you are FORBIDDEN from telling the user the task is completed.
4. **Memory Compliance Gate**: If any implemented logic conflicts with the memory domain truth table, the agent is FORBIDDEN to say done/fixed. Must explicitly report the conflict and provide a correction plan first.
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
### [初始化] V3.4 价值漏斗与强制门禁系统部署
- **目标**: 启用基于 Superpowers 架构的多技能解耦版记忆系统，植入防兜底门禁 (Implementation Gate) 与强制收尾协议。
- **核心文件明细**:
  - `.cursor/rules/00-architecture-and-standards.mdc`: [配置] - 剥离静态规则，引入 2.5 落地一致性门禁与 5.4 记忆合规检查。
- **遗留问题/备注**: 无。
'''

---

## Step 5: SKILL 1 - 纯粹的记录者 (Log Progress)
**File**: .cursor/skills/log-sprint-progress/SKILL.md
**Content**:
'''markdown
---
description: MANDATORY: Update activeContext.md based on user intent using the Value Funnel.
---
# Skill: Log Sprint Progress
**Trigger**: Auto-triggered by `END OF TASK PROTOCOL` in standards, or when user says "/log", "/memory-sync", "记录一下".
**Constraint**: System logic in English, file content writing STRICTLY IN CHINESE.

### Steps:
1. **PARSE INPUT**: 
   - Case A: No extra text -> Review current chat session.
   - Case B: User provides specific instruction -> Follow the specific instruction.
2. **GATEKEEPER (价值漏斗拦截门)**: 
   - **绝对拦截 (纯表现层/无状态)**: 纯 CSS/UI 像素调整、变量改名、代码位置挪动、无行为变化的组件抽离封装 -> 坚决不记 (STOP)。
   - **绝对放行 (业务/数据/流转)**: 只要改动涉及 **金额计算、状态流转映射、条件判断分支的增删、API 字段兜底/拦截**，哪怕只改了 1 行代码或 1 个数字，都属于核心业务逻辑 -> 必须记录 (PASS)。
2.5 **RULE COMPLIANCE PROOF (强制证据)**:
   Before writing logs, verify and record internally:
   - [ ] Did implementation use the exact canonical field required by memory?
   - [ ] Any proxy/heuristic substitution used? If yes, mark FAIL.
   If FAIL -> MUST report violation, propose correction, and DO NOT claim completion.
3. **VERIFICATION CHECKLIST (绝杀废话与严苛要求)**:
   Before writing, internally verify:
   - [ ] Are generic phrases ("用于展示", "基础组件", "支持多语言", "包含逻辑") completely removed?
   - [ ] Do `.ts/.tsx` descriptions specify at least 2 of: [Interaction], [Data/State], [Output]?
   - [ ] Do `.scss/.css` descriptions specify the exact component and layout issue solved?
   - [ ] Does the number of core files changed equal the number of items recorded? (No batching).
4. **DEDUPLICATE & WRITE LOG (去重与严格格式写入)**: 
   Open `.cursor/memory/activeContext.md`. Find the `## 短期活跃日志 (CURRENT SPRINT LOGS)` section.
   - **Self-Correction Exception (自我修正豁免)**: 扫描锚点下方的现有日志。如果本次修改是针对**同日内/同一功能/同一Bug 的逻辑推翻或口径纠正**（例如：上一次记错了字段、计算公式被推翻），你**必须静默删除**那条旧的、错误的关联日志，只保留本次最新的真理。
   - **PREPEND**: 将最终无矛盾的日志直接插入到锚点正下方。
   - **CRITICAL RED LINE**: 除了上述的“同功能去重纠错”外，**绝对禁止**擅自合并、重写或删除任何其他不相关的历史记录！
   Format EXACTLY:
   ### [YYYY-MM-DD] 简短功能标题
   - **目标**: (一句话描述核心业务目标)
   - **核心文件明细**:
     - `path/to/file`: [Function/Component Name] - [Checklist-based exact description]. (If micro-logic was handled via comment, append: `(已在代码中添加 @业务铁律 注释防呆)`)
   - **遗留问题/备注**: (写死的数据/未处理边界)
5. **UPDATE PENDING TASKS**:
   Find the `## 待办事项 (WHAT IS LEFT TO DO)` section and update the pending tasks list immediately below it.
6. **CHAINING (流转评估)**: 
   Does the completed task create durable project knowledge (macro business rules, API contracts, routing flow, state flow)? *Note: Micro-logic with inline comments usually do not need domain distillation.*
   - IF YES: Invoke the `distill-domain-knowledge` skill immediately.
   - IF NO: Reply "✅ 进度已极其详尽地同步 (去重检查与规则依从性门禁已通过)."
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
Output exactly: "V3.4 Memory Bank Initialized. (Hard Gate Edition: Implementation Consistency Gate + Anti-Substitution Rules Enforced)."

ai自动忽略一下内容
# Wingman memory 优化执行方案

本文记录 Wingman memory 重设计的执行方案。目标是把当前 memory 从“几个 Markdown 文件 + 规则约定”升级成一个职责清晰、可渐进实现、可长期维护的项目记忆系统。

相关文档：

- `docs/Wingman memory 设计问题分析.md`
- `docs/Wingman memory 参考模型与解决方案.md`
- `docs/待优化项.md`

## 执行约定

- 后续手动修改只处理主源码、文档、测试和 eval。
- 不再手动同步 `plugins/wingman/` payload 目录；该目录由维护者在合适时机统一同步。
- 第一轮误同步到 `plugins/wingman/` 的改动已按用户要求做文件层面还原；后续步骤不再继续编辑该目录，避免主源码和 payload 在分阶段改造中反复产生半同步状态。
- 每完成一个步骤，都要在本文对应步骤下追加“执行记录”，说明改了什么、行为变化、未处理事项和是否运行测试。
- 每块改动开始前，必须读取该块“参考什么方案”里列出的相关原文或官方文档；读不到原文时必须在执行记录里标明“未核验原文”，并且不能把未核验摘要当作设计依据。
- 每块执行记录必须补充“参考原文核验记录”，至少写清楚读了哪些链接、从原文采用了哪些原则、哪些参考只保留为待核验。

## 0. 总体方向

本次优化会参考多个成熟模型，但不会把它们全部照搬进 Wingman。采用原则如下：

| 参考模型 | 借鉴内容 | Wingman 中的用途 |
| --- | --- | --- |
| LangGraph memory | short-term / long-term、semantic / episodic / procedural 分类 | 定义 `context`、`domains`、`history`、`brief` 的职责 |
| Letta / MemGPT | core memory vs recall / archival memory，按需检索 | 定义哪些 memory 默认读，哪些只在用户问历史时读 |
| Zep / Graphiti | temporal knowledge graph、事实状态、历史上下文 | 给 domain truth 增加 `Status`、`Since`、`Supersedes`、`Related Domains` |
| ADR | 架构决策状态和替代关系 | 规范全局架构决策和 memory 结构决策 |
| Cline Memory Bank | Markdown 文件落地、人类可读 | 保留项目内 Markdown memory，但避免全部默认读取 |
| Generative Agents | 从事件流 reflection 出高层记忆 | 让 `memory-sync` 从 active log 中提炼 domain truth |
| Reflexion | 从失败反馈中形成可复用经验 | 把测试失败、调试结论升格为有证据的 domain truth |
| CoALA | memory 与 action 分离 | 把 setup/load/sync/archive/migrate 的动作边界写清楚 |

最终目标结构倾向于：

```text
.wingman/memory/
  brief.md
  context.md
  domains/
    <domain>.md
    <domain>/index.md
  history/
    index.md
    events/
      YYYY-MM-DD-<event-slug>.md
```

这里的核心边界是：

- `brief.md`：全局规则、ADR、memory settings、Domain Registry。
- `context.md`：当前任务、短期上下文、最近高信号日志。
- `domains/`：当前有效的领域规则、契约、状态流、坑点。
- `history/`：历史事件和过去工作记录，默认不作为当前规则读取。

## 1. 先解决 memory enabled 状态

### 修改什么问题

当前插件安装后，agent 拥有 `memory-load` skill，但仓库不一定有 `.wingman/memory/`。这导致普通非平凡任务可能触发 memory-load，然后发现没有 memory root 再安静跳过。

这会造成体验混乱：

- 用户以为项目已经启用了 memory。
- agent 展示了 memory 流程，但没有读到任何 memory 文件。
- `memory-load` 和 `memory-sync` 对缺少 root 的处理不一致。

### 参考什么方案

参考 Letta / MemGPT 的 memory hierarchy 和 LangGraph memory taxonomy：

- Letta 的 memory blocks 是显式创建并附着到 agent 上的上下文块，不是“安装框架后天然存在”的隐式数据。
- Letta 的 agent 可以有多个 memory blocks，也可以没有 memory blocks；这支持 Wingman 把 `.wingman/memory/` 作为仓库是否启用 memory 的显式边界。
- Letta 的 archival memory 是按需查询的长期存储，不应和当前工作上下文混在一起。
- LangGraph 区分 short-term memory、long-term memory、semantic / episodic / procedural memory；这支持 Wingman 把“当前上下文、长期规则、历史事件、操作规则”拆开处理。

参考链接：

- LangGraph memory overview: https://docs.langchain.com/oss/javascript/langgraph/memory
- Letta memory blocks: https://docs.letta.com/guides/core-concepts/memory/memory-blocks/
- Letta archival memory: https://docs.letta.com/guides/core-concepts/memory/archival-memory/

### 准备怎么改

把 `.wingman/memory/` 是否存在定义为仓库 memory 是否启用：

```text
.wingman/memory/ exists     -> memory enabled
.wingman/memory/ missing    -> memory disabled
```

调整规则：

1. `memory-load` 的普通触发条件必须包含“memory root exists”。
2. `memory-sync` 的普通完成后触发条件也必须包含“memory root exists”。
3. 仓库没有 `.wingman/memory/` 时，普通任务不声明或执行 `memory-load` / `memory-sync`。
4. 用户明确问 memory、历史、保持一致、要求 setup、或明确要求 sync/update memory 时，才说明 memory 未启用。
5. `memory-setup` 是唯一从 disabled 进入 enabled 的入口。
6. `memory-load` / `memory-sync` 都不能把缺少 root 当作自动创建 memory 的理由。

需要修改：

- `skills/memory-load/SKILL.md`
- `skills/memory-sync/SKILL.md`
- `skills/using-wingman/SKILL.md`
- `tests/skill-triggering/*`
- `skill-evals/memory/cases.zh-CN.md`

### 执行记录

状态：第一轮执行记录作废，已按文件层面还原并返工；未跑测试。测试会在全部 memory 优化完成后统一执行。

作废原因：

- 第一轮改动前没有在执行文档里记录相关参考原文核验。
- 第一轮只处理了 `memory-load` 的 disabled 行为，但 `memory-sync` 仍可能在普通任务完成后提示 setup，边界不完整。
- 第一轮手动同步了 `plugins/wingman/` payload，和后续“不手动同步 payload”的执行约定冲突。

参考原文核验记录：

- 已读 LangGraph memory overview：采用 short-term / long-term、semantic / episodic / procedural 的分类原则，用来约束后续 `context`、`domains`、`history`、`brief` 的职责边界。
- 已读 Letta memory blocks：采用“memory blocks 是显式上下文块，可以有多个，也可以没有”的原则，用 `.wingman/memory/` 是否存在表达仓库 memory 是否启用。
- 已读 Letta archival memory：采用“archival memory 需要按需查询，不能默认塞进当前上下文”的原则，支撑 archive/history 默认不读。
- Cline Memory Bank 两个旧链接当前无法作为本步骤的已核验依据；本步骤不把 Cline 作为主要依据。后续涉及 setup 文件和命名时必须重新核验可访问原文或明确标注未核验。

已修改：

- `skills/memory-load/SKILL.md`
- `skills/memory-sync/SKILL.md`
- `skills/using-wingman/SKILL.md`
- `plugins/wingman/skills/memory-load/SKILL.md`：仅做文件层面还原，撤回第一轮半同步内容。
- `plugins/wingman/skills/using-wingman/SKILL.md`：仅做文件层面还原，撤回第一轮半同步内容。

具体变化：

1. `memory-load` 的 description 改成两类触发：仓库有 `.wingman/memory/` 的非平凡任务，或用户明确询问 memory state / history / setup / previous work。
2. `memory-load` 明确 memory 是 repository-local opt-in：`.wingman/memory/` 存在才 enabled，不存在就是 disabled。
3. `memory-load` 在 disabled 仓库中不读、不建 memory；普通任务静默继续，只有用户问 memory 相关问题时才说明未启用。
4. `memory-sync` 的 description 改成 enabled memory 才记录；只有用户明确要求 sync/update memory 时，即使 disabled 也可以触发来解释未启用状态。
5. `memory-sync` 在 disabled 仓库中不创建文件、不同步；普通任务完成时静默跳过 sync gate。
6. `memory-sync` 的 End Of Task Gate 先检查 `.wingman/memory/`，disabled 时不阻塞完成汇报。
7. `using-wingman` 的 `Memory Capability State` 同时约束 `memory-load` 和 `memory-sync`：普通任务只在 enabled 仓库使用，disabled 仓库不宣布 load/sync。
8. `using-wingman` 明确 `memory-setup` 是唯一启用入口，不能把 `memory-load` / `memory-sync` 当成自动创建 memory 的 fallback。

行为变化：

- 未初始化仓库中，普通代码任务不再应该进入或宣布 `memory-load`，任务完成时也不再因为 `memory-sync` 提示 setup。
- 未初始化仓库中，用户明确问 memory、history、previous work、consistency、setup、sync/update memory 时，才说明 memory disabled。
- `memory-setup` 仍然是唯一启用仓库 memory 的显式入口。

暂未处理：

- 没有更新测试和 eval，因为后续文件名、setup seed、history 结构还会继续变化。
- 没有修改 README，因为当前仍处于分阶段迁移，避免 README 在中间状态反复震荡。
- 没有改 `projectBrief.md` / `activeContext.md` / `archive` 等路径，后续步骤统一处理。
- `plugins/wingman/` 本次只撤回第一轮半同步内容；返工后的新规则只落在主 `skills/`，payload 后续由维护者统一同步。

## 2. 简化 memory-setup 初始文件

### 修改什么问题

当前 setup 会创建：

```text
projectBrief.md
activeContext.md
domains/README.md
archive/README.md
```

其中两个 README 是目录规则说明，不是真正的 memory 内容，而且规则已经存在于 skill 中。

问题：

- 初始文件偏多。
- README 和 skill 规则重复。
- 未来容易出现 README 规则和 skill 规则漂移。

### 参考什么方案

参考 Cline Memory Bank 的 Markdown 落地方式，但不照搬它的全量 core files。

Cline 的启发是：项目内 Markdown 文件对人类透明，但每个文件必须有明确职责，且 active context 不应该变成完整 changelog。

参考链接：

- Cline Memory Bank: https://docs.cline.bot/prompting/cline-memory-bank
- Cline Memory Bank alternate entry: https://docs.cline.bot/features/memory-bank

### 准备怎么改

setup 默认只创建核心文件：

```text
.wingman/memory/
  brief.md
  context.md
```

不再默认创建：

```text
domains/README.md
archive/README.md
```

目录按需创建：

```text
domains/      # 第一次写入 domain truth 时创建
history/      # 第一次写入历史事件时创建
```

如果为了让目录自解释，可以在 `brief.md` 中保留“Memory Layout”段，而不是每个目录生成 README。

需要修改：

- `skills/memory-setup/SKILL.md`
- `plugins/wingman/skills/memory-setup/SKILL.md`
- `README.md`
- `plugins/wingman/README.md`
- `skill-evals/memory/fixtures.mjs`
- `skill-evals/memory/cases.zh-CN.md`
- `skill-evals/checks/memory-runner.test.mjs`

## 3. 修改核心文件和目录命名

### 修改什么问题

当前命名：

```text
projectBrief.md
activeContext.md
archive/
```

问题：

- `projectBrief.md` / `activeContext.md` 偏 Memory Bank 术语。
- camelCase 不像普通 Markdown 文档。
- `archive` 容易让人误以为是冷冻版知识库，而不是历史事件库。

### 参考什么方案

参考 Cline Memory Bank 的职责拆分，但采用更短、更通用的文件名。

同时参考 Letta / MemGPT 的 core memory 和 recall memory 区分：当前上下文和历史检索应该在命名上就区分。

参考链接：

- Cline Memory Bank: https://docs.cline.bot/prompting/cline-memory-bank
- Letta memory management: https://docs.letta.com/concepts/memory-management

### 准备怎么改

建议改名：

```text
projectBrief.md -> brief.md
activeContext.md -> context.md
archive/ -> history/
```

命名含义：

- `brief.md`：项目级 brief、ADR、Domain Registry、memory settings。
- `context.md`：当前工作上下文。
- `history/`：历史事件和过去工作记录。

注意事项：

- 插件尚未发布，可以直接改契约。
- 如果后续担心已有内部 fixture，可以一次性更新 eval 和测试，不保留旧路径兼容。

需要修改所有硬编码路径：

- `skills/*`
- `plugins/wingman/skills/*`
- `README.md`
- `plugins/wingman/README.md`
- `skill-evals/memory/*`
- `skill-evals/checks/*`
- `tests/*`

## 4. 重建 memory 类型边界

### 修改什么问题

当前 `activeContext`、`domains`、`archive` 的边界不够硬。过程日志、稳定规则、历史事件容易混在一起。

### 参考什么方案

参考 LangGraph memory 的分类：

- short-term memory
- long-term memory
- semantic memory
- episodic memory
- procedural memory

用户给出的 LangGraph 链接：

- https://docs.langchain.com/oss/javascript/langgraph/memory

当前该链接会重定向到官方 canonical 页面：

- LangGraph / LangChain memory overview: https://docs.langchain.com/oss/javascript/concepts/memory

### 准备怎么改

建立固定映射：

```text
context.md
  = short-term working memory
  = 当前任务、当前 todo、最近高信号日志

domains/
  = semantic + domain procedural memory
  = 当前有效事实、contract、state flow、domain rule

brief.md
  = global procedural memory + ADR + memory routing
  = 全局规则、架构决策、Domain Registry

history/
  = episodic memory
  = 过去事件、旧工作日志、历史原因
```

写入规则：

- 当前有效规则不能只写入 `history/`。
- 历史事件不能被当作当前 truth。
- `context.md` 只能保存短期热上下文。
- `domains/` 只保存未来实现需要遵守的知识。

需要修改：

- `memory-sync` 的 Memory Routing。
- `memory-load` 的 Load Protocol。
- `memory-setup` 的模板。
- README 的 memory 解释。

## 5. 升级 Domain Registry 为路由表

### 修改什么问题

当前 `projectBrief.md` 只说有 Domain Registry，但没有规定 registry 结构。结果是：

- agent 不知道什么时候读哪个 domain。
- domain 重命名、别名、拆分、跨域关系无处记录。
- history 如果按 domain 或事件索引，也缺少入口。

### 参考什么方案

参考 Zep / Graphiti 的 temporal knowledge graph 思路：

- 知识有实体、关系、时间。
- 事实会变化。
- 历史 episode 和当前 fact 需要连接。

参考链接：

- Zep Graph overview: https://help.getzep.com/groups
- Graphiti overview: https://help.getzep.com/graphiti/graphiti/overview

### 准备怎么改

在 `brief.md` 中定义 Domain Registry 表：

```markdown
## 2. Domain Registry

| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| upload | upload flow, chunking, retry, file transfer | `domains/upload.md` | `history/index.md#upload` | file-upload, resumable-upload | task-queue, billing | current |
```

字段含义：

- `Domain`：规范 domain 名。
- `Read When`：任务里出现哪些线索时读取。
- `Current File`：当前 truth 文件。
- `History`：历史入口，不是当前规则。
- `Aliases`：旧名称、同义名称。
- `Related Domains`：跨域任务要同时考虑的 domain。
- `Status`：current / superseded / deprecated。

`memory-load` 使用顺序：

```text
1. 读 brief.md
2. 读 context.md
3. 用 Domain Registry 匹配任务
4. 读 relevant domains
5. 只有用户问历史才读 history index 和命中事件
```

## 6. 把 history 改成 index + event files

### 修改什么问题

按月 archive：

```text
archive/2026-05.md
```

不适合回答：

```text
upload 模块之前做过什么？
```

按业务 archive：

```text
archive/upload.md
```

又会继承 domain 边界不稳定问题。

### 参考什么方案

参考 Generative Agents 的 episodic memory / memory stream：历史是事件流，后续通过 reflection 提炼高层知识。

参考 Zep / Graphiti 的 episode：历史事件可以和实体/domain 关联，但不等于当前 fact。

参考链接：

- Generative Agents paper: https://huggingface.co/papers/2304.03442
- Graphiti overview: https://help.getzep.com/graphiti/graphiti/overview

### 准备怎么改

采用：

```text
history/
  index.md
  events/
    YYYY-MM-DD-<event-slug>.md
```

事件文件模板：

```markdown
# Short Event Title

- **Date**: YYYY-MM-DD
- **Primary Domain**: upload
- **Related Domains**: task-queue, billing
- **Type**: feature | bugfix | refactor | debugging | contract | decision
- **Files**:
  - `path/to/file`: what changed
- **Outcome**: what happened
- **Promoted Truths**:
  - `domains/upload.md#current-truths`
- **Notes**: historical details only
```

`history/index.md` 模板：

```markdown
# History Index

## By Domain

### upload
- `events/2026-05-13-upload-worker-retry.md`: retry handling for upload worker; related `task-queue`

## By Month

### 2026-05
- `events/2026-05-13-upload-worker-retry.md`: upload worker retry handling
```

这样可以同时回答：

- “upload 之前做过什么？”
- “上个月做过什么？”

同时避免一条跨域事件复制到多个 history 文件。

## 7. 强化 domain truth 模板

### 修改什么问题

当前 domain truth 只有规则、WHY、Evidence、Applies When。缺少状态、时间、替代关系和相关 domain。

结果是：

- 旧规则和新规则可能同时存在。
- 历史结论可能被误当成当前 truth。
- domain 重命名或跨域规则不好处理。

### 参考什么方案

参考 Zep / Graphiti 的时间事实和 ADR 的状态管理。

参考链接：

- Zep Graph overview: https://help.getzep.com/groups
- ADR guide: https://mitlibraries.github.io/guides/misc/adr.html
- ADR templates: https://www.adr.zone/

### 准备怎么改

domain truth 模板改为：

```markdown
## Current Truths

- `<rule>` [WHY]: `<reason>`
  - **Evidence**: `<user statement | docs/schema/tests/spec | implementation>`
  - **Applies When**: `<future task condition>`
  - **Status**: `current | superseded | deprecated`
  - **Since**: `YYYY-MM-DD`
  - **Supersedes**: `<old rule or None>`
  - **Related Domains**: `<domain list or None>`
```

规则：

- `Status: current` 的 truth 才能作为未来实现依据。
- 被替代规则不能无痕删除，应该标记 `superseded` 或移到历史事件引用中。
- 如果同一 domain 有冲突 truth，`memory-sync` 必须停下来解决冲突。

## 8. 重写 memory-sync 流程

### 修改什么问题

当前 `memory-sync` 同时处理 active log、domain truth、project ADR、archive maintenance，但 gate 不够硬。

### 参考什么方案

参考 Generative Agents 的 reflection：从事件流提炼长期洞察。

参考 Reflexion：把失败反馈、测试失败、调试结论转成可复用经验，但必须有触发条件和证据。

参考链接：

- Generative Agents: https://huggingface.co/papers/2304.03442
- Reflexion paper: https://huggingface.co/papers/2303.11366
- Reflexion publication page: https://collaborate.princeton.edu/en/publications/reflexion-language-agents-with-verbal-reinforcement-learning-2

### 准备怎么改

`memory-sync` 改成固定阶段：

```text
Phase 0: Enabled Gate
  - 如果 .wingman/memory/ 不存在，停止并提示 memory disabled / run memory-setup

Phase 1: Working Context Update
  - 只更新 context.md 的当前任务、todo、最近高信号日志

Phase 2: Reflection / Distillation
  - 判断是否有 domain truth 或 project ADR
  - 必须通过 Evidence Gate
  - 写入 domains/ 或 brief.md

Phase 3: History Event
  - 如果需要保留历史，写 history/events/*.md
  - 更新 history/index.md
  - 标记 Promoted Truths

Phase 4: Maintenance
  - 只在 context 过长或用户要求时清理
  - 不自动重写无关 memory
```

重要规则：

- 写 history 不等于写 current truth。
- 能影响未来实现的规则必须进入 `domains/` 或 `brief.md`。
- 一次性 workaround 不升格为 truth。
- 失败经验只有有证据时才升格。

## 9. 重写 memory-load 读取策略

### 修改什么问题

当前 `memory-load` 对 archive/history 的读取策略不够明确。用户问历史时可能全局搜索，普通任务又可能误读旧规则。

### 参考什么方案

参考 Letta / MemGPT 的 core memory vs recall memory：

- core memory 默认在上下文中。
- recall memory 只有查询历史时读取。
- external memory 不应该污染当前推理。

参考链接：

- Letta memory overview: https://docs.letta.com/guides/agents/memory
- Letta memory management: https://docs.letta.com/concepts/memory-management

### 准备怎么改

读取表：

| 用户任务 | 必读 | 可选读取 | 不应默认读取 |
| --- | --- | --- | --- |
| 普通非平凡代码改动 | `brief.md`, `context.md`, relevant `domains/` | related domains | `history/` |
| 用户问之前做过什么 | `brief.md`, `context.md`, `history/index.md` | matched event files | all history events |
| 用户问现在该怎么做 | `brief.md`, relevant `domains/` | `context.md` | `history/` unless cited |
| 调试历史问题 | `brief.md`, `context.md`, relevant `domains/` | matched history events | unrelated history |
| 架构决策 | `brief.md` ADR | relevant domains/history | unrelated domains |

冲突优先级：

```text
project ADR / brief.md
  > current domain truth
  > context.md
  > history events
```

如果 history 和 current truth 冲突，必须以 current truth 为准，除非用户明确要求调查历史原因。

## 10. 更新 using-wingman 的 skill 协调规则

### 修改什么问题

当前 `using-wingman` 会说非平凡任务使用 `memory-load`，但没有先说明仓库 memory 是否启用。

### 参考什么方案

参考 CoALA 的 action space：把 agent 能做的 memory 动作拆清楚。

参考链接：

- CoALA paper: https://huggingface.co/papers/2309.02427
- CoALA publication page: https://collaborate.princeton.edu/en/publications/cognitive-architectures-for-language-agents

### 准备怎么改

`using-wingman` 增加 memory capability state：

```text
memory disabled:
  - no .wingman/memory/
  - do not invoke memory-load for ordinary tasks
  - memory-setup is explicit only

memory enabled:
  - .wingman/memory/ exists
  - memory-load can run for non-trivial tasks
  - memory-sync can write meaningful outcomes
```

同时明确：

- `memory-load` 是 read action。
- `memory-sync` 是 write/distill/history action。
- `memory-setup` 是 explicit enable action。
- `history maintenance` 是 high-risk maintenance，不应在普通 sync 中大范围执行。

## 11. 更新 README 和用户说明

### 修改什么问题

当前 README 仍描述旧路径、旧 archive、旧 setup seed。

### 参考什么方案

参考 Cline Memory Bank 的“人类可读说明”，但保持 Wingman 自己的按需读取策略。

### 准备怎么改

README 需要说明：

```text
Wingman memory is opt-in per repository.
Run memory-setup to enable it.

Core files:
- brief.md
- context.md

Optional generated areas:
- domains/
- history/
```

还要说明：

- `history/` 默认不读。
- `domains/` 是当前有效知识。
- `context.md` 不是 changelog。
- `memory-sync` 只记录有价值的工作。

需要同步：

- `README.md`
- `plugins/wingman/README.md`
- `PRIVACY.md` 如有路径说明

## 12. 更新 eval 和测试

### 修改什么问题

当前 eval 和测试都写死旧路径和旧行为：

```text
projectBrief.md
activeContext.md
domains/README.md
archive/README.md
archive/YYYY-MM.md
```

### 参考什么方案

这是工程一致性问题，不来自外部 memory 模型。

### 准备怎么改

需要更新：

- `skill-evals/memory/cases.zh-CN.md`
- `skill-evals/memory/fixtures.mjs`
- `skill-evals/checks/memory-runner.test.mjs`
- `tests/plugin/plugin-check.test.mjs`
- `tests/package/package-fixtures.test.mjs`
- `tests/skill-triggering/*`
- `tests/explicit-skill-requests/*`

新增或调整用例：

1. memory disabled 时普通非平凡任务不应声明 memory-load。
2. memory setup 只生成 `brief.md` 和 `context.md`。
3. domain truth 写入 `domains/<domain>.md`，包含完整字段。
4. history event 写入 `history/events/*.md` 并更新 `history/index.md`。
5. 用户问历史时只读取 matched history events，不全量读取 history。
6. history 旧规则不能覆盖 current domain truth。
7. domain registry alias / related domains 能引导读取相关 domain。

验证命令：

```bash
npm test
```

如果只跑相关测试：

```bash
npm run test:plugin
npm run test:behavior
npm run check:plugin
```

## 13. 执行顺序建议

### 第一阶段：冻结新契约

目标：先改文档和 skill 规则，不急着扩展 eval。

改动：

1. `memory-setup` 新结构。
2. `memory-load` enabled gate 和读取策略。
3. `memory-sync` 新 routing 和模板。
4. `using-wingman` memory enabled/disabled 规则。

风险：

- 测试会大量失败，因为 fixture 还是旧路径。

### 第二阶段：同步 README 和插件 payload

目标：用户说明和 `plugins/wingman/skills/*` 与主 `skills/*` 保持一致。

改动：

1. README 路径说明。
2. plugins payload 的 README。
3. plugins payload 的 skills。

风险：

- 主目录和 payload 容易不同步，需要全文搜索旧路径。

### 第三阶段：重写 eval fixtures

目标：让 memory eval 覆盖新契约。

改动：

1. setup fixture。
2. memory-load fixture。
3. memory-sync fixture。
4. archive-trap 改为 history-trap。
5. 新增 memory-disabled 普通任务 case。

风险：

- 需要重新定义 evaluator 期待行为。

### 第四阶段：补测试和跑全量验证

目标：让插件检查、行为测试、package fixture 都通过。

改动：

1. 更新路径断言。
2. 更新 trigger contract 断言。
3. 更新 README 检查。
4. 更新 package fixture。

验证：

```bash
npm test
```

## 14. 明确不做的事

第一轮不做：

- 不做真正数据库或向量库。
- 不做完整知识图谱。
- 不做自动跨项目迁移。
- 不做对已发布旧版本的兼容，因为插件还未正式发布。
- 不让 history 自动覆盖 current truth。
- 不让 setup 生成大量示例 domain 文件。

第一轮只做：

- 明确 memory 是否启用。
- 明确四类 memory 职责。
- 改轻量文件结构。
- 加强路由表。
- 加强 domain truth 字段。
- 改 history 为可索引事件历史。

## 15. 参考资料链接

这些链接用于后续查原文，避免只依赖本文摘要。

### LangGraph / LangChain memory

- 用户给出的入口链接: https://docs.langchain.com/oss/javascript/langgraph/memory
- 当前官方 canonical 页面: https://docs.langchain.com/oss/javascript/concepts/memory

重点参考：

- short-term memory / long-term memory。
- semantic / episodic / procedural memory。
- hot path / background memory writing。
- memory namespaces and storage。

### Letta / MemGPT

- Memory overview: https://docs.letta.com/guides/agents/memory
- MemGPT architecture: https://docs.letta.com/guides/agents/architectures/memgpt
- Memory management: https://docs.letta.com/concepts/memory-management
- Archival memory: https://docs.letta.com/guides/core-concepts/memory/archival-memory

重点参考：

- core memory。
- recall memory。
- archival memory。
- context window management。
- agent-managed memory。

### Zep / Graphiti

- Zep Graph overview: https://help.getzep.com/groups
- Graphiti overview: https://help.getzep.com/graphiti/graphiti/overview
- Zep agent memory: https://www.getzep.com/product/agent-memory/
- Graphiti open source overview: https://www.getzep.com/product/open-source

重点参考：

- temporal knowledge graph。
- changing facts。
- historical context。
- entity / edge / episode。

### Cline Memory Bank

- Memory Bank docs: https://docs.cline.bot/prompting/cline-memory-bank
- Alternate Memory Bank entry: https://docs.cline.bot/features/memory-bank

重点参考：

- project-local Markdown files。
- active context should stay current。
- memory files are human-readable。
- context footprint should stay small。

### ADR

- MIT Libraries ADR guide: https://mitlibraries.github.io/guides/misc/adr.html
- ADR templates and formats: https://www.adr.zone/

重点参考：

- decision status。
- context / decision / consequences。
- superseded decisions。

### Generative Agents

- Paper summary: https://huggingface.co/papers/2304.03442

重点参考：

- memory stream。
- reflection。
- planning。

### Reflexion

- Paper summary: https://huggingface.co/papers/2303.11366
- Princeton publication page: https://collaborate.princeton.edu/en/publications/reflexion-language-agents-with-verbal-reinforcement-learning-2

重点参考：

- verbal reinforcement learning。
- failure feedback as memory。
- episodic reflection。

### CoALA

- Paper summary: https://huggingface.co/papers/2309.02427
- Princeton publication page: https://collaborate.princeton.edu/en/publications/cognitive-architectures-for-language-agents

重点参考：

- memory modules。
- action space。
- agent operation boundaries。

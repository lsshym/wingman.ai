# Wingman memory 参考模型与解决方案

本文记录可供 Wingman memory 重设计参考的成熟记忆模型、工程文档模型和可落地解决方案。它不是最终实施方案，而是一个设计资料库：后续改 `memory-setup`、`memory-load`、`memory-sync` 时，可以从这里挑选稳定原则。

相关问题文档：

- `docs/Wingman memory 设计问题分析.md`
- `docs/待优化项.md`

## 0. 当前问题的核心判断

当前 Wingman memory 的问题不是“文件夹怎么命名”这么简单，而是这些概念混在了一起：

- 当前上下文：最近正在做什么，下一步要做什么。
- 当前真理：以后实现代码必须遵守的稳定规则。
- 历史事件：过去做过什么、为什么当时那样做。
- 架构决策：项目级规则、设计取舍和已接受决策。
- 检索入口：agent 怎么从用户任务定位要读哪些 memory 文件。

如果这些职责不拆开，任何 archive 方案都会出问题：

- 按月归档会导致按模块查历史困难。
- 按业务归档会继承 domain 边界不稳定的问题。
- archive 如果没有索引，就会退化成全局搜索。
- domain 如果没有 registry，就会靠 agent 猜测。
- 历史日志如果没有权威等级，就可能覆盖当前规则。

所以重设计的方向应该从“记忆类型”和“读取策略”开始，而不是先决定目录名。

## 1. LangGraph memory：用记忆类型拆开职责

参考：

- https://docs.langchain.com/oss/javascript/concepts/memory

LangGraph 的 memory 文档提供了一个非常适合 Wingman 的基础分类。它先按 recall scope 区分：

- short-term memory：线程或会话范围内的短期上下文。
- long-term memory：跨会话、跨线程可复用的长期记忆。

它又把长期记忆按认知类型分成：

- semantic memory：事实、概念、稳定知识。
- episodic memory：经历、历史事件、过去动作。
- procedural memory：规则、流程、如何做事。

### 对 Wingman 的启发

Wingman 当前结构可以映射成：

```text
activeContext.md
  = short-term memory
  = 当前任务、近期日志、下一步行动

domains/
  = semantic memory + domain-level procedural memory
  = 稳定业务事实、字段含义、API contract、状态流、领域内规则

projectBrief.md
  = global procedural memory + project-level semantic memory
  = 全局 ADR、项目级规则、memory 语言设置、domain registry

archive/
  = episodic memory
  = 过去做过什么、当时为什么做、已完成工作日志
```

这个映射能解决一个关键混乱：`archive` 不应该承载当前 truth；`domains` 不应该变成流水日志；`activeContext` 不应该长期保存所有历史。

### 可借鉴原则

1. 先判断 memory 类型，再决定写入位置。
2. 任何写入都必须回答：“这是事实、经验、规则，还是当前工作状态？”
3. semantic/procedural memory 应该影响未来实现；episodic memory 只在追溯历史或找例子时读取。
4. 当前上下文应该短，长期知识应该可检索，历史记录应该默认不读。

### 对当前设计的修正方向

`memory-sync` 现在已经有 `ACTIVE_LOG`、`DOMAIN_TRUTH`、`PROJECT_ADR`、`ARCHIVE`，但这些分类可以更明确地对齐 LangGraph 的类型：

| Wingman routing | LangGraph 类型 | 应该写入 | 主要用途 |
| --- | --- | --- | --- |
| `ACTIVE_LOG` | short-term | `activeContext.md` | 当前任务连续性 |
| `DOMAIN_TRUTH` | semantic/procedural | `domains/` | 未来实现依据 |
| `PROJECT_ADR` | procedural | `projectBrief.md` 或 ADR 区 | 全局决策 |
| `ARCHIVE` | episodic | `archive/` | 历史追溯 |

后续规则应该禁止模糊写入，例如：

- “过去做过什么”不能直接变成当前真理。
- “当前真理”不能只保存在 archive。
- “过程日志”不能长期留在 activeContext。

## 2. Letta / MemGPT：用记忆层级解决上下文窗口问题

参考：

- https://docs.letta.com/guides/agents/memory
- https://docs.letta.com/guides/agents/architectures/memgpt
- https://docs.letta.com/guides/core-concepts/memory/archival-memory
- https://docs.letta.com/concepts/memory-management

Letta/MemGPT 的核心不是文件结构，而是上下文管理。它把 memory 分成：

- in-context / core memory：始终可见的小块关键记忆。
- recall memory：过去对话或事件日志，可搜索。
- archival memory：长期语义存储，按需搜索。

它的关键判断是：上下文窗口是稀缺资源。memory 系统的任务不是把所有东西都塞进上下文，而是决定：

- 什么必须常驻。
- 什么只在需要时搜索。
- 什么需要从历史中提炼成更短的摘要。
- agent 是否可以主动编辑自己的记忆。

### 对 Wingman 的启发

Wingman 当前 `activeContext.md` 很像 core memory，但它不应该无限增长。它应该保留：

- 当前任务。
- 当前未完成事项。
- 最近几条高信号日志。
- 指向相关 domains 或 archive 的引用。

`archive` 更像 recall memory：历史事件完整保存，但默认不进入上下文。

`domains` 更像 curated archival / semantic memory：不是原始历史，而是经过筛选和整理的长期知识。

### 可借鉴原则

1. `activeContext.md` 是 context window 的入口，不是历史数据库。
2. archive 应该可搜索，但不应该被默认读取。
3. domain truth 是 agent 主动提炼出来的长期知识，不是原始日志。
4. 归档前应该先把有价值的规则提炼到 domain/project，再移动过程日志。
5. memory 写入应该区分“自动记录历史”和“主动沉淀知识”。

### 对 archive 的重要启发

Letta 明确区分 archival memory 和 conversation search：

- conversation search 用来找过去说过什么。
- archival memory 用来存长期知识。

Wingman 可以借鉴为：

```text
history / archive
  = past work search
  = 过去任务和日志

domains
  = curated long-term knowledge
  = 稳定事实、规则、坑点
```

也就是说，Wingman 不应该让 `archive` 承担“长期知识库”的角色。它只负责历史追溯。

## 3. Zep / Graphiti：用时间和失效机制处理变化的事实

参考：

- https://help.getzep.com/v2/concepts
- https://help.getzep.com/v2/understanding-the-graph
- https://www.getzep.com/product/open-source
- https://www.getzep.com/product/agent-memory/

Zep/Graphiti 的核心是 temporal knowledge graph。它不是只存“事实”，还关心事实什么时候有效、什么时候失效、历史如何保留。

Zep 的图里有三类数据：

- entity nodes：实体。
- entity edges：实体之间的事实或关系。
- episodic nodes：原始事件或 episode。

它强调的关键点是：企业和项目里的知识会变化。旧事实不一定应该删除，但必须知道它已经过期。

### 对 Wingman 的启发

Wingman 不一定需要真正实现知识图谱，但应该借鉴这几个字段：

```markdown
- `<rule>` [WHY]: ...
  - **Evidence**: ...
  - **Applies When**: ...
  - **Status**: current | superseded | deprecated
  - **Since**: YYYY-MM-DD
  - **Superseded By**: ...
  - **Related Domains**: ...
```

这些字段可以解决当前最危险的问题：archive 中的旧规则和 domains 中的新规则冲突。

### 可借鉴原则

1. 知识需要时间维度，不只是内容。
2. 旧事实可以保留，但必须标记为历史或失效。
3. 当前 truth 应该有明确 `Status`。
4. 发生规则变更时，不应留下两个同等权威的 truth。
5. 历史 episode 可以指向当前 fact，当前 fact 也可以记录来源 episode。

### 对 domain registry 的启发

当前 `projectBrief.md` 的 Domain Registry 太弱。借鉴 Zep 后，可以把它升级为 memory 路由表：

```markdown
## Domain Registry

| Domain | Read When | Current File | History File | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
| upload | upload flow, chunking, retry, file transfer | `domains/upload.md` | `history/upload.md` | file-upload, resumable-upload | billing, task-queue | current |
```

这样 domain 重命名、跨域读取、历史入口都能被显式记录。

## 4. Cline Memory Bank：Markdown 落地参考，但不宜照抄

参考：

- https://docs.cline.bot/features/memory-bank
- https://docs.cline.bot/prompting/cline-memory-bank

Cline Memory Bank 是最接近 Wingman 当前形态的参考。它使用项目内 Markdown 文件帮助 agent 跨会话恢复上下文：

```text
memory-bank/
  projectbrief.md
  productContext.md
  activeContext.md
  systemPatterns.md
  techContext.md
  progress.md
```

每个文件职责明确：

- `projectbrief.md`：项目基础要求。
- `productContext.md`：产品存在原因和 UX 目标。
- `activeContext.md`：当前工作重点、最近变化、下一步。
- `systemPatterns.md`：架构和模式。
- `techContext.md`：技术栈和约束。
- `progress.md`：状态、剩余工作、已知问题。

### 对 Wingman 的启发

Cline Memory Bank 的优点是：

- Markdown 友好。
- 对用户透明。
- 文件职责简单。
- 很适合跨会话恢复。

但它也暴露了 Wingman 不能照抄的原因：

- 它更像“项目文档包”，不是严格的长期知识路由系统。
- 它倾向于读取所有 core files，Wingman 希望按需读取。
- 它没有很好解决 domain 边界、历史归档、旧规则失效。
- `activeContext.md` 容易膨胀，如果被当成运行日志，会变成上下文负担。

### 可借鉴原则

1. 文件必须人类可读。
2. `activeContext` 应该保持当前状态，不应该变成完整 changelog。
3. 项目基础信息和当前工作信息应该分开。
4. 可以使用 Markdown，但要给 agent 明确读取策略。
5. 不要默认读取所有 memory 文件，除非项目非常小。

### 对 Wingman 的具体启发

Wingman 可以保留类似思想，但改成更严格的路由：

```text
brief.md
  项目级规则、memory 配置、domain registry

context.md
  当前工作上下文，短而热

domains/
  按需读取的稳定知识

history/ 或 archive/
  默认不读的历史事件
```

## 5. ADR：用状态和替代关系管理架构决策

参考：

- https://mitlibraries.github.io/guides/misc/adr.html
- https://www.adr.zone/

ADR（Architecture Decision Record）解决的是“为什么当初这么决定”的问题。常见结构包括：

- Title
- Status
- Context
- Decision
- Consequences

Status 通常包括：

- Proposed
- Accepted
- Deprecated
- Superseded

### 对 Wingman 的启发

Wingman 当前 `projectBrief.md` 里有 `Architecture Decisions (ADR - Global Rules)`，但模板太轻。它只说“记录全局规则，包含 WHY”，没有给决策生命周期。

建议借鉴 ADR 的最小字段：

```markdown
## Architecture Decisions

### ADR-001: Use Wingman memory as project-local Markdown
- **Status**: Accepted
- **Context**: ...
- **Decision**: ...
- **Consequences**: ...
- **Supersedes**: None
- **Related Domains**: memory-workflow
```

### 可借鉴原则

1. 架构决策要有状态。
2. 被替代的决策不应该删除，但必须标记 `Superseded`。
3. ADR 记录“为什么”，不是重复代码实现细节。
4. 全局规则不要散落在多个 domain 文件里。

### 对当前问题的帮助

ADR 可以解决：

- 文件名为什么这么定。
- archive 选按月还是按业务。
- domain registry 为什么升级成路由表。
- README seed 文件为什么保留或删除。

这些都应该进入全局决策，而不是藏在 active log。

## 6. Generative Agents：用 reflection 把事件提炼成高层记忆

参考：

- https://huggingface.co/papers/2304.03442

Generative Agents 的经典架构包括：

- memory stream：记录 agent 观察到的事件。
- reflection：从低层事件中合成高层洞察。
- planning：用记忆和洞察指导未来行动。

对 Wingman 来说，关键不是模拟人类行为，而是“从过程日志提炼长期知识”的机制。

### 对 Wingman 的启发

当前 `activeContext.md` 类似 memory stream 的一部分。`domains/` 应该存 reflection 后的高层结论。`memory-sync` 应该承担 reflection 的职责：

```text
工作完成
  -> 写 active log
  -> 判断是否有稳定规则
  -> 有则提炼到 domain/project
  -> 旧 log 后续进入 archive
```

### 可借鉴原则

1. 不要把所有事件都当知识。
2. 长期知识应该是从多个事件或明确证据中反思出来的。
3. 过程日志可以保留，但不等于未来规则。
4. memory-sync 应该有“反思/提炼”阶段，而不是只追加日志。

### 可落地到 Wingman 的检查问题

每次 sync 时可以问：

- 这次工作只是一次事件，还是产生了稳定规则？
- 如果未来 agent 只读 domain，不读日志，会不会漏掉重要约束？
- 这条结论是单次 workaround，还是可复用经验？
- 这条经验是否应该变成 domain truth，还是只留在 archive？

## 7. Reflexion：把失败和反馈写成可复用经验

参考：

- https://huggingface.co/papers/2303.11366
- https://collaborate.princeton.edu/en/publications/reflexion-language-agents-with-verbal-reinforcement-learning-2

Reflexion 的核心是：agent 不通过训练模型权重来学习，而是把失败反馈写成自然语言反思，并存入 episodic memory，未来遇到类似任务时读取这些反思。

这对 coding agent 很有价值，因为代码任务里经常有：

- 测试失败原因。
- 构建失败原因。
- 某个 API 的真实行为。
- 某个错误修法为什么不对。
- 某个兼容性坑点。

### 对 Wingman 的启发

Wingman 可以给 debugging conclusion 单独规则：

```markdown
## Current Truths

- `TaskQueueManager` must not reuse completed task IDs. [WHY]: Reuse caused stale progress events to attach to the wrong upload task.
  - **Evidence**: `tests/apis/TaskQueueManager.test.ts`
  - **Applies When**: Upload worker task lifecycle
  - **Learned From**: Debugging failure on YYYY-MM-DD
```

这里的关键是：失败反思如果稳定适用，就应该进入 domain truth；如果只是一次尝试记录，就留在 history/archive。

### 可借鉴原则

1. 失败经验是 memory 的高价值来源。
2. 失败经验必须写清楚触发条件，否则容易过度泛化。
3. 反思不等于规则，只有被测试、用户说明或实现契约证明后才进入 current truth。
4. 反思可以从 archive/history 搜索，但 current truth 应该更短、更权威。

## 8. CoALA：把 memory 和 action 分开建模

参考：

- https://huggingface.co/papers/2309.02427
- https://collaborate.princeton.edu/en/publications/cognitive-architectures-for-language-agents

CoALA（Cognitive Architectures for Language Agents）提出用认知架构组织语言 agent，包括模块化记忆、结构化 action space 和决策过程。

对 Wingman 来说，它提醒我们：memory 不只是存储，还要定义 agent 可以对 memory 做什么动作。

### 对 Wingman 的启发

当前 Wingman 有三个动作：

- load：读取。
- setup：初始化。
- sync：写入。

但 sync 内部其实包含多个不同动作：

- append active log。
- distill domain truth。
- update project ADR。
- archive old logs。
- remove obsolete logs。
- split large domain。

这些动作需要清晰边界。否则 agent 会把“记录进展”和“改写长期规则”混在一起。

### 可借鉴原则

1. 每类 memory 写入动作都应该有 gate。
2. 读 memory 和写 memory 是不同 action，不应在 load 阶段修改文件。
3. archive maintenance 应该是单独动作，不应隐藏在普通 sync 里随意发生。
4. 对于高风险动作，例如删除旧 truth、重命名 domain、迁移 archive，应该要求明确证据或用户确认。

## 9. 可借鉴的统一分类模型

结合上面的系统，Wingman 可以先采用五类 memory，而不是先纠结文件名。

### 9.1 Working Memory

用途：当前任务上下文。

对应：

```text
activeContext.md 或 context.md
```

内容：

- 当前任务。
- 当前未完成 todo。
- 最近高信号日志。
- 当前正在依赖的 domain。
- 指向历史细节的引用。

不应该包含：

- 长期完整 changelog。
- 大量过期调试日志。
- 稳定业务规则的唯一副本。

读取策略：

- 非平凡任务默认读取。
- 文件应该短。
- 维护时保留近期高信号内容，其余归档或提炼。

### 9.2 Semantic / Domain Memory

用途：当前有效的领域事实和业务知识。

对应：

```text
domains/<domain>.md
domains/<domain>/index.md
```

内容：

- canonical fields。
- API contracts。
- state flows。
- permissions。
- money/order/payment rules。
- domain-specific debugging conclusions。
- domain boundaries。

不应该包含：

- “上次改了哪些文件”这种过程日志。
- 没有证据的一次性猜测。
- 已被替代但未标记的旧规则。

读取策略：

- 通过 Domain Registry 选择相关 domain。
- 跨域任务读取主 domain 和 related domains。
- 大 domain 先读 index，再读必要 subfile。

### 9.3 Procedural / Project Memory

用途：全局做事规则、项目级 ADR、agent 工作约束。

对应：

```text
projectBrief.md / brief.md
ADR section
```

内容：

- 全局架构决策。
- memory 语言设置。
- domain registry。
- 全项目适用的禁止规则。
- 发布/测试/平台约束。

不应该包含：

- 某个 domain 内部细节。
- 临时任务日志。
- 需要频繁变化的大量历史。

读取策略：

- 非平凡任务默认读取。
- 作为 memory 路由入口。
- ADR 有状态和替代关系。

### 9.4 Episodic / History Memory

用途：历史事件和过去工作记录。

对应候选：

```text
archive/YYYY-MM.md
history/<domain>.md
history/index.md
```

内容：

- 完整 active log 归档。
- 历史调试过程。
- 过去方案尝试。
- 已完成工作记录。
- 用户问“之前做过什么”时需要的材料。

不应该包含：

- 当前唯一有效规则。
- 未标记状态的旧 contract。
- 需要默认读取的关键知识。

读取策略：

- 默认不读。
- 用户问历史时读。
- 当前 memory 明确引用时读。
- 如果保留按月归档，必须有 index 或 domain registry 指向。
- 如果改成按业务历史，必须有跨域引用规则。

### 9.5 Index / Routing Memory

用途：帮助 agent 找到该读哪些 memory。

对应候选：

```text
projectBrief.md 的 Domain Registry
memory/index.md
history/index.md
```

内容：

- domain 列表。
- read triggers。
- aliases。
- related domains。
- current file。
- history file。
- status。
- superseded names。

不应该包含：

- 大段业务规则。
- 完整历史日志。
- 具体实现细节。

读取策略：

- `memory-load` 在读完 brief/context 后使用它做路由。
- 索引必须短。
- 索引不替代 domain 文件，只负责定位。

## 10. archive 方案对比

### 方案 A：继续按月 archive

结构：

```text
archive/
  2026-02.md
  2026-03.md
  2026-04.md
  2026-05.md
```

优点：

- 写入简单。
- 从 active log 移动到月文件很自然。
- 适合回答“某个月做了什么”。
- 不需要判断主 domain。

缺点：

- 按模块查历史困难。
- 一个模块跨多月时需要聚合多个文件。
- 必须引入 `archive/index.md` 或搜索机制。
- 历史发现依赖关键词质量。

适合场景：

- 项目历史追溯以时间为主。
- archive 很少被按模块查询。
- memory 设计希望保持最小复杂度。

### 方案 B：按业务/模块 archive

结构：

```text
history/
  upload.md
  checkout.md
  billing.md
```

优点：

- 适合回答“这个模块之前做过什么”。
- 读取路径直观。
- 可以和 domain registry 绑定。
- 不需要跨月聚合。

缺点：

- 继承 domain 边界不稳定问题。
- 跨域任务需要主 domain 和 related domains 规则。
- domain 重命名时需要迁移或别名。
- `domains/upload.md` 和 `history/upload.md` 容易混淆。

适合场景：

- 用户经常按模块问历史。
- 项目业务域相对清晰。
- 愿意维护 domain registry 和别名。

### 方案 C：按业务 history + 全局 history index

结构：

```text
history/
  index.md
  upload.md
  checkout.md
  billing.md
```

`history/index.md`：

```markdown
# History Index

| Domain | History File | Aliases | Related Domains | Last Updated |
| --- | --- | --- | --- | --- |
| upload | `history/upload.md` | file-upload, resumable-upload | billing, task-queue | 2026-05-12 |
```

优点：

- 按模块读取方便。
- alias 和 related domains 显式。
- 可以回答“upload 之前做过什么”。
- 可以保留跨域引用。

缺点：

- 多维护一个 index。
- 对 memory-sync 要求更高。
- 重命名和拆分 domain 时要维护 history index。

适合场景：

- Wingman 想成为长期项目 memory，而不只是 session handoff。
- 希望减少 archive 全局搜索。

### 方案 D：history 只存事件卡片，索引负责多维查询

结构：

```text
history/
  index.md
  events/
    2026-05-12-upload-worker-retry.md
    2026-05-14-checkout-billing-contract.md
```

每张事件卡：

```markdown
# Upload worker retry fix

- **Date**: 2026-05-12
- **Primary Domain**: upload
- **Related Domains**: task-queue
- **Files**: ...
- **Outcome**: ...
- **Promoted Truths**:
  - `domains/upload.md#...`
```

优点：

- 避免复制跨域日志。
- 一个事件可以有 primary domain 和 related domains。
- 适合索引和未来自动检索。
- 事件粒度清晰。

缺点：

- 文件数量多。
- 初始复杂度高。
- 对 Markdown 管理要求更高。

适合场景：

- 项目长期运行，历史量大。
- 希望支持多维检索：时间、domain、文件、事件类型。

## 11. 推荐优先参考的组合

短期最实用的组合：

```text
LangGraph taxonomy
  决定 memory 类型

Letta/MemGPT hierarchy
  决定什么常驻、什么按需搜索

ADR
  决定项目级决策格式

Cline Memory Bank
  参考 Markdown 落地方式
```

中长期可以借鉴：

```text
Zep/Graphiti
  加入时间、状态、失效、实体关系

Generative Agents / Reflexion
  强化从事件到反思、从失败到规则的提炼机制

CoALA
  把 memory 操作拆成更明确的 action gates
```

## 12. 面向 Wingman 的候选目标结构

这不是最终决定，只是一个参考结构：

```text
.wingman/memory/
  brief.md
  context.md
  domains/
    upload.md
    checkout.md
  history/
    index.md
    upload.md
    checkout.md
```

或者更偏事件卡片：

```text
.wingman/memory/
  brief.md
  context.md
  domains/
    upload.md
    checkout.md
  history/
    index.md
    events/
      2026-05-12-upload-worker-retry.md
```

### 文件职责

`brief.md`：

- 全局规则。
- ADR。
- memory settings。
- domain registry。
- domain alias / related domains。

`context.md`：

- 当前任务。
- 当前 todo。
- 最近高信号日志。
- 本轮正在依赖的 domains。

`domains/<domain>.md`：

- 当前有效的领域规则。
- canonical fields。
- contracts。
- state flows。
- debugging truths。
- status / evidence / applies when。

`history/<domain>.md` 或 `history/events/*.md`：

- 历史事件。
- 过去做过什么。
- 已经提炼到 domain 的来源记录。
- 不作为当前 truth。

`history/index.md`：

- 历史检索入口。
- domain 到 history 文件的映射。
- aliases。
- related domains。
- 时间范围。

## 13. 可落地的写入决策表

后续可以让 `memory-sync` 用这个决策表：

| 发现的信息 | 写入位置 | 是否默认读取 | 是否可覆盖当前实现 |
| --- | --- | --- | --- |
| 当前任务和下一步 | `context.md` | 是 | 否 |
| 最近完成的有意义工作 | `context.md` | 是，短期 | 否 |
| 稳定业务规则 | `domains/<domain>.md` | 按需 | 是 |
| API 字段含义 | `domains/<domain>.md` | 按需 | 是 |
| 项目级架构决策 | `brief.md` ADR | 是 | 是 |
| 旧工作日志 | `history/*` | 否 | 否 |
| 失败反思 | 先 `context.md` 或 `history/*`，有证据后升格到 `domains/` | 视情况 | 只有升格后才是 |
| 被替代规则 | 原位置标记 `Superseded`，不要无痕删除 | 按需 | 否 |

## 14. 可落地的读取决策表

后续可以让 `memory-load` 用这个决策表：

| 用户任务 | 必读 | 可选读取 | 不应默认读取 |
| --- | --- | --- | --- |
| 普通非平凡代码改动 | `brief.md`, `context.md`, relevant `domains/` | related domains | history |
| 用户问“之前做过什么” | `brief.md`, `context.md`, history index | matched history files | all history |
| 用户问“现在该怎么做” | `brief.md`, relevant `domains/` | `context.md` | history unless cited |
| 调试历史问题 | `brief.md`, `context.md`, relevant `domains/` | matched history/reflection logs | unrelated history |
| 架构决策 | `brief.md` ADR | relevant domains/history | unrelated domains |

## 15. 最重要的设计原则

1. 当前 truth 和历史事件必须分离。
2. 默认读取的是当前工作和当前规则，不是历史全集。
3. archive/history 的主要用途是追溯，不是约束未来实现。
4. 任何未来会影响实现的知识都必须进入 domain 或 project ADR。
5. Domain Registry 应该是路由表，不只是列表。
6. 跨域知识必须记录 primary domain 和 related domains。
7. domain 重命名必须保留 alias 或 superseded 记录。
8. 历史内容被读取时，必须低于 current domain truth 和 project ADR。
9. 每次归档前必须检查是否有稳定知识需要提炼。
10. 文件越少越易上手，索引越强越利于长期维护；需要在发布前明确取舍。

## 16. 后续设计问题清单

在真正改 skill 前，需要回答：

1. Wingman 是否要从 `projectBrief.md` / `activeContext.md` 改成 `brief.md` / `context.md`。
2. `domains/README.md` 是否删除，还是改成可选文档。
3. `archive` 是否改名为 `history`，以降低“历史就是当前知识库”的误解。
4. 历史归档按月、按业务、按事件卡片，还是 index + 文件混合。
5. Domain Registry 是否升级成表格路由结构。
6. 每个 domain truth 是否强制包含 `Evidence`、`Applies When`、`Status`。
7. 是否允许 memory-sync 自动重命名、拆分、迁移 domain。
8. 跨域任务写入时，是否只写 primary domain 并记录 related domains。
9. 历史日志升格为 domain truth 的证据门槛是什么。
10. archive/history 的读取优先级如何写进 `memory-load`。

## 17. 参考资料索引

- LangGraph memory overview: https://docs.langchain.com/oss/javascript/concepts/memory
- Letta memory overview: https://docs.letta.com/guides/agents/memory
- Letta MemGPT architecture: https://docs.letta.com/guides/agents/architectures/memgpt
- Letta archival memory: https://docs.letta.com/guides/core-concepts/memory/archival-memory
- Letta memory management: https://docs.letta.com/concepts/memory-management
- Zep key concepts: https://help.getzep.com/v2/concepts
- Zep graph overview: https://help.getzep.com/v2/understanding-the-graph
- Graphiti open source overview: https://www.getzep.com/product/open-source
- Zep agent memory: https://www.getzep.com/product/agent-memory/
- Cline Memory Bank: https://docs.cline.bot/features/memory-bank
- Cline Memory Bank prompting guide: https://docs.cline.bot/prompting/cline-memory-bank
- MIT Libraries ADR guide: https://mitlibraries.github.io/guides/misc/adr.html
- ADR templates and formats: https://www.adr.zone/
- Generative Agents paper: https://huggingface.co/papers/2304.03442
- Reflexion paper: https://huggingface.co/papers/2303.11366
- Reflexion Princeton publication page: https://collaborate.princeton.edu/en/publications/reflexion-language-agents-with-verbal-reinforcement-learning-2
- CoALA paper: https://huggingface.co/papers/2309.02427
- CoALA Princeton publication page: https://collaborate.princeton.edu/en/publications/cognitive-architectures-for-language-agents

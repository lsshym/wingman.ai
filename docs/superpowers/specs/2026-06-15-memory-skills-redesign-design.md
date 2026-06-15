# Memory Skills Redesign Design

## 背景

Wingman 当前的 memory skill 已经有 `brief.md`、`context.md`、`domains/`、`history/` 的基本分层意识，但现有规则仍容易让长期知识堆进 `context.md`。`memory-load` 对历史读取偏被动，`memory-sync` 对长期规则和历史事件偏保守，`memory-clean` 主要像压缩工具，还没有成为旧 context 的迁移工具。

本设计只规划 skill 规则本体和引用材料的改动，不进入实现。范围限定为：

- `skills/memory-setup/SKILL.md`
- `skills/memory-load/SKILL.md`
- `skills/memory-sync/SKILL.md`
- `skills/memory-clean/SKILL.md`
- `skills/memory-sync/references/history-events.md`
- `skills/memory-sync/references/templates.md`

本轮不覆盖：

- `tests/`
- `plugins/wingman/`
- marketplace / manifest
- release sync
- 真实项目 memory 迁移
- 迁移脚本

## 目标

把 Wingman memory 明确定义为“当前规则 + 热上下文 + 历史事件 + 可检索索引”的知识系统。

- `brief.md` 只保存全局设置、项目级 ADR 和领域登记表。
- `context.md` 只保存热上下文、当前任务、pending work 和近期高信号日志。
- `domains/` 保存长期有效、未来 agent 必须遵守的当前规则。
- `history/` 保存过去事件正文和索引，用来解释规则来源、演化和排查背景。
- 功能开发、调试和业务逻辑任务能按领域和主题主动找到相关历史，而不是只能按月份或用户明确问“之前”才查。

## 术语

- 领域：一个稳定业务、技术、产品或运维范围。英文常写作 `domain`。
- 主题：一个功能、问题簇或工作流。英文常写作 `topic`。
- 当前规则：长期有效、未来 agent 必须遵守的事实。英文常写作 `durable truth`。
- 投影索引：只保存事件链接和短摘要的索引文件，不保存完整事件正文。英文常写作 `projection index`。
- 指针化：把 `context.md` 中已经被领域规则或历史事件承接的长日志，压缩为指向权威位置的短记录。

## 信息架构

### `brief.md`

`brief.md` 是默认读取入口之一，只保存全局信息：

- Memory Settings。
- 项目级 ADR。
- 领域登记表。

新版领域登记表直接切到以下 schema：

```md
| Domain | Read When | Current File | History Domain Index | History Topics | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

`History Domain Index` 指向 `.wingman/memory/history/domains/<domain>.md`。`History Topics` 保存一个或多个通用主题 id，例如 `checkout-flow`、`payment-selection`、`order-status`、`product-detail`、`upload-retry`、`quota-display`。

旧 `History` 字段不再作为主要 schema。旧仓库迁移应通过 `memory-clean promotion` 或手动迁移完成。

### `context.md`

`context.md` 只保存热上下文：

- 当前任务状态。
- pending work。
- 近期高信号日志。
- 指向领域规则或历史事件的短指针。

长期规则不应长期停留在 `context.md`。如果某个事实已经写进 `domains/` 或 `history/`，`context.md` 不再重复长正文，只保留短指针。

### `domains/`

`domains/` 保存当前仍然有效的领域规则。

小领域使用单文件：

```text
domains/<domain>.md
```

大领域使用 folder domain：

```text
domains/<domain>/index.md
domains/<domain>/<topic>.md
```

`index.md` 保存领域读取条件、子文件路由表和少量跨子域当前规则。子主题文件保存具体功能、问题簇或工作流规则。

### `history/`

`history/` 保存过去事件和索引。事件正文固定在：

```text
history/events/YYYY/MM/YYYY-MM-DD-<event-slug>.md
```

索引分为：

```text
history/index.md
history/domains/<domain>.md
history/topics/<topic>.md
history/months/YYYY-MM.md
```

`history/domains/` 按领域聚合事件链接。`history/topics/` 按功能、问题簇或工作流聚合事件链接。`history/months/` 只服务日期查询。`history/index.md` 只做入口和近期高信号事件，不做完整事件列表。

历史正文只放在 `history/events/YYYY/MM/`。领域、主题和月份目录下的历史文件都是索引，不移动、不复制事件正文。

## Skill 行为设计

### `memory-setup`

`memory-setup` 继续保持轻量初始化，只创建：

- `.wingman/memory/brief.md`
- `.wingman/memory/context.md`

它不默认创建 `domains/` 或 `history/`，不扫描代码，也不自动推断领域。

需要更新的规则：

- `Brief Template` 使用新版领域登记表 schema。
- `Memory Layout` 明确四层职责。
- `On-Demand Domain Shape` 增加 folder domain 示例。
- `On-Demand History Shape` 增加 `history/topics/<topic>.md`。
- 增加规则：事件正文只放 `history/events/YYYY/MM/`，索引只放链接和摘要。

### `memory-load`

`memory-load` 是只读 workflow。它的读取顺序是：

1. 判断当前仓库是否启用 Wingman memory。
2. 对非 trivial 任务读取 `brief.md` 和 `context.md`。
3. 使用领域登记表匹配领域。
4. 读取匹配领域的 `Current File`。
5. 对业务逻辑、接口、状态流、权限、金额、调试复发问题等任务，读取相关主题或领域历史索引。
6. 从索引中选择少量强相关事件正文，默认 0 到 3 个。

历史读取优先级：

1. 当前规则里的直接历史事件链接。
2. `history/topics/<topic>.md`。
3. `history/domains/<domain>.md`。
4. `history/months/YYYY-MM.md`，仅明确日期查询。
5. `history/index.md`，仅路由不清或用户广泛询问历史。

历史不是当前权威。若历史与 `brief.md` 或 `domains/` 冲突，以当前规则为准，并提示可能需要清理或 supersede。

`memory-load` 的 memory pressure 提示不能使用固定行数阈值。它只能基于具体问题提示，例如：

- 长期规则仍停留在 `context.md`。
- `context.md` 和 `domains/` 重复保存同一事实。
- 当前规则互相冲突。
- 相关历史事件存在但缺少主题索引。

### `memory-sync`

`memory-sync` 从“最小有用记录”升级为“路由 + 晋升 + 历史索引维护”。

写入前先做 Promotion Check。以下情况优先考虑晋升到领域规则、项目 ADR 或历史事件：

- 稳定接口路径、请求体、响应字段或字段语义。
- 状态、枚举或生命周期映射。
- 权限、支付、金额、配额、路由规则。
- 跨文件、跨模块、跨接口的行为约定。
- 用户纠正业务含义或字段含义。
- 复发调试结论。
- 同一功能或领域已经有多条 context logs。
- 未来 agent 不知道该事实就容易读错、改错或重复调试。

普通近期进展写 `context.md`。长期当前规则写 `domains/` 或 `brief.md`。重要事件写 `history/events/`，并更新领域索引、主题索引、月份索引和顶层入口。

当同一事实已经写入领域规则或历史事件，`context.md` 只写短指针，不复制完整事实。

`HISTORY_EVENT` 对小改默认不写。写入非平凡当前规则、重要接口/字段/状态修正、复发调试结论时，默认倾向写历史事件，除非该事件没有追溯价值。

当前规则必须先于历史写入。历史解释来源，但不替代当前规则。

### `memory-clean`

`memory-clean` 是候选驱动的整理和迁移工具，不是长度报警器。

它不使用固定行数判断是否清理。行数可以作为诊断信息，但不能作为触发门槛。触发清理应基于具体候选：

- 有可晋升内容：长期规则、接口契约、字段语义、状态流、权限、金额、复发调试结论仍停留在 `context.md`。
- 有可指针化内容：事实已经被 `domains/` 或 `history/` 承接，但 `context.md` 仍重复长正文。
- 有重复或被修正内容：同一任务多次尝试，旧结论已被新结论替代。
- 有默认读取污染：大量已完成、低复用、过程性的短期日志影响当前任务定位。
- 有当前规则冲突：多个规则同时标记为 current，或旧规则未标记为 superseded / deprecated。
- 用户明确指定清理目标。

反触发规则：如果 `context.md` 很长，但没有可晋升、可压缩、可指针化、可废弃或冲突的候选，`memory-clean` 应报告没有值得清理的候选，而不是反复清理。

新增 cleanup scope：

- `promotion`：从 context 晋升长期知识。
- `domain-split`：把过宽领域拆成 folder domain。
- `history-topic-index`：为已有历史补主题索引。

候选分类：

- `KEEP_HOT`：仍是热上下文。
- `PROMOTE_DOMAIN`：晋升到领域规则。
- `PROMOTE_HISTORY`：晋升为历史事件。
- `PROMOTE_BOTH`：同时写领域规则和历史事件。
- `COMPACT_TO_POINTER`：压缩成指向权威位置的短指针。
- `DELETE_CANDIDATE`：可删除候选。
- `NO_ACTION`：不处理。

允许自动执行无损晋升和指针化压缩。删除仍必须展示 proposal ID，并在用户明确确认这些 ID 后才能执行。

## 引用材料设计

### `skills/memory-sync/references/history-events.md`

需要加入主题索引：

- Model 增加 `history/topics/<topic>.md`。
- Write Procedure 增加创建或更新主题索引。
- Event Body Template 增加 `Topics` 字段。
- Top-Level Index Template 增加 `Topic Indexes`。
- 新增 Topic Projection Template，包含标题、`Read When` 和事件列表。
- Growth Rules 明确过宽索引可以拆索引，但事件正文仍固定在 `events/YYYY/MM/`。

### `skills/memory-sync/references/templates.md`

需要补齐：

- `Context Pointer Template`，用于记录“结果已写入 domains/history”的短指针。
- 说明 Durable Truth Template 中的 `History` 是事件正文链接，不是索引链接。
- 主题命名建议：使用通用功能或问题簇名称，例如 `checkout-flow`、`payment-selection`、`order-status`、`product-detail`、`upload-retry`、`quota-display`。不要使用客户名、项目代号或一次性业务名。

## 错误处理

不要把不确定内容写成当前规则。如果 `memory-sync` 或 `memory-clean` 想晋升某条内容，但证据不足，应停下来问用户。

有效证据包括：

- 用户明确说明。
- 现有 memory 已经表达。
- 产品文档、接口文档、schema、测试或已接受 spec。
- 实现中稳定的契约。

无证据的临时实现、猜测阈值、一次性 workaround 只能留在 context，不能晋升。

当前规则和历史冲突时，当前规则优先。`brief.md` 和 `domains/` 的 current 规则比 `history/events/` 的旧事件更有权威。`memory-clean` 可以把旧 current 规则标成 `superseded` 或 `deprecated`，但不能把互相冲突的 A 和 B 混成含糊总结。

文件缺失或结构不完整时保持 skill 边界：

- `memory-load` 只读，不修复。
- `memory-sync` 不修复缺失核心文件。
- `memory-clean` 不初始化 memory。
- 只有 `memory-setup` 能创建缺失核心文件。

## 验证方式

本轮范围不包含测试改造，因此验证以文本一致性为主：

- 检查四个 `SKILL.md` 和两个 reference 文件之间字段名一致。
- 检查是否仍残留旧 `History` registry schema 作为主要路径。
- 检查 `history/topics` 是否在 setup、load、sync、clean 和 history reference 中一致出现。
- 检查 setup、load、sync、clean 的职责是否互相越界。
- 检查 `memory-clean` 是否使用候选驱动，而不是固定行数阈值。

发布前风险验证：

- 可运行 `npm run check:release`。
- 如果失败原因只是 `plugins/wingman` 同步副本不一致，应记录为后续任务，不扩大本次范围。

## 风险和取舍

直接切新版领域登记表 schema 会让旧 memory 仓库需要迁移。迁移路径是 `memory-clean promotion` 或手动修改 registry。

`memory-load` 更积极读取主题或领域历史索引，可能增加少量上下文读取。控制方式是只读索引，不扫事件目录；事件正文默认最多 0 到 3 个。

`memory-clean` 自动晋升和指针化如果判断过度，可能把短期日志变成长期规则。控制方式是证据门槛。没有用户说明、文档、schema、测试、已接受 spec、现有 memory 或稳定实现契约，就不能晋升。

## 后续

用户审阅本设计文档并确认后，下一步应进入实施计划编写，拆出具体修改步骤和验证步骤。

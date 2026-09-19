# data-contracts 设计逻辑与 Review 指南

这份文档解释 Wingman `data-contracts` Skill 和配套 CLI 的设计边界，帮助 Reviewer 判断实现是否仍然符合初衷。协议细节以 [`docs/specs/data-contracts.md`](specs/data-contracts.md) 为准；实际用法以 [`skills/data-contracts/references/cli.md`](../skills/data-contracts/references/cli.md) 为准。

## 1. 要解决的不是“类型报错”，而是数据交接

`data-contracts` 面对的是一个方向性问题：真实数据从 Source 进入 Receiver 时，结构和业务含义是否足以支持接收方行为。

典型风险包括：

- 字段在真实输入中不存在，却被补进 Source 类型；
- snake_case 和 camelCase 看起来相似，就被当成同一业务概念；
- Source 可空、可缺失或取值更宽，Receiver 却要求更严格；
- 用 cast、空字符串、兜底链或兼容别名掩盖未知；
- 同一个转换散落在多个调用点；
- CLI 没发现问题就被误解为业务语义和实现已完成。

所以这个 Skill 的交付不是一份“schema 相等”报告，而是一条受控工作流：证据 → 决定 → binding → 实现 → 真实验证。

## 2. 为什么引入 CLI

不同模型在字段遍历、可空性推导、枚举方向、证据冲突和输出格式上会有波动。CLI 承担可以机械化且应当稳定的部分：

- 输入协议和资源上限；
- 支持子集的解析；
- 多份证据的确定性 reconciliation；
- Source → Receiver 的方向性结构比较；
- diff 中有限、可定位的风险扫描；
- required decision ID、状态优先级和退出码；
- 稳定 JSON/Markdown 输出。

模型仍然负责 CLI 无法可靠完成的判断：

- 哪份规格或领域规则具有权威性；
- 两个字段是否真的是同一业务概念；
- Receiver 改动会影响哪些调用者、持久化或公开接口；
- translation 应放在哪个既有架构 seam；
- 用户决定意味着什么；
- 最后应该运行哪条真实验证路径。

这条分工线是核心设计，不应把语义判断逐步塞进启发式规则，也不应让 Agent 用自由文本重新实现结构分析。

## 3. 为什么不用大型 manifest

大型 manifest 会把一次局部交接变成长期维护的第二套架构模型，并引入陈旧、重复和跨模型填充差异。当前协议只记录推动一次边界工作流所需的最小信息：

- 一个稳定 `boundaryId`；
- Source、Receiver 和相关 diff 证据；
- 全局语义状态与 authority references；
- CLI 当前产生的 required decisions 及其 resolutions；
- 一个 binding mode 和必要时的唯一 location。

不记录自由文本 rationale、验证成功声明、复杂 owner 图谱、跨边界依赖图或项目级拓扑。真正的领域与架构知识继续保存在项目自己的代码、规格和文档中；请求只引用它们。

边界以“谁拥有一个独立约定”为准，而不是以函数调用次数为准。中间模型若有自己的声明、业务含义、公共/持久化消费者或独立演进能力，就形成新的 request；纯透传 helper 不形成新边界。因此 API → project domain → UI 通常是两个 request。

## 4. 一个正常命令，而不是多阶段命令编排

正常接口只有：

```text
check --request <file|-> [--format json|markdown] [--detail]
```

Agent 对同一请求迭代：

1. 第一次不填 `decision`，获得结构事实、`requiredDecisions` 和 `nextActions`。
2. 补齐 authority-backed 决定，再运行同一个 `check`。
3. 实现 binding，把相关 diff 加入同一请求，再运行同一个 `check`。
4. 到 `ready_to_verify` 后，由 Agent 执行项目真实验证。

`extract`、`compare`、`scan` 是诊断探针，不能替代正常流程。`analyze` 仅是旧结构协议的一次 1.x 兼容别名，不应出现在新的 Agent 工作流中。

一个命令的价值不是命令少，而是避免不同模型自行选择、跳过或错误组合阶段。

## 5. 为什么状态必须拆成三维

旧式单一状态会混淆“结构上没发现问题”“业务决定已完成”“可以实现”和“验证通过”。`check` 明确拆成：

| 维度 | 回答的问题 |
|---|---|
| `structuralStatus` | 所供结构证据里发现了什么？ |
| `decisionStatus` | 语义、逐项 resolution 和 binding 是否完整一致？ |
| `workflowStatus` | 下一步允许做什么？ |

`structuralStatus: compatible` 只代表支持子集和当前证据内没有结构 finding；它不证明字段同义。

`decisionStatus: resolved` 只代表 decision record 具备合法形状、引用已知证据或存在的本地材料，并覆盖当前 required decisions；CLI 不理解 authority 内容。

`workflowStatus: ready_to_verify` 只代表可以进入真实验证。CLI 永远不输出 `complete`、`aligned`、`approved` 或 `verified`。

状态优先级是：

```text
error > needs_evidence > blocked > needs_decision > ready_to_verify > ready_to_implement
```

这保证语义声明无法覆盖结构证据缺失，结构 finding 也不会在有依据的显式 resolution 之后永远阻塞实现。

## 6. 最小 decision gate 的边界

Gate 是纯函数：输入结构结果、required decisions、decision record 和是否存在 diff；输出 decision/workflow 状态、decision diagnostics 和 next actions。

它可以判断：

- 是否缺少全局语义状态；
- resolved 项是否有 authority reference；
- evidence reference 是否指向当前请求；
- local authority 是否存在；
- current decision 是否缺 resolution；
- 是否出现重复、未知或陈旧 decision ID；
- binding mode 与 location 条件是否一致；
- 哪个状态按优先级胜出。

它不能判断：

- authority 内容是否真的支持结论；
- translation seam 在架构上是否最佳；
- fallback 是否符合业务，除非请求明确引用授权来源；
- 项目验证是否通过。

如果未来需求要求 Gate 读取大量业务字段、自由文本或项目拓扑，应先质疑是否正在重建大型 manifest。

## 7. required decision ID 为什么必须稳定

同一输入重复运行必须产生同一 ID，resolution 才能被安全复用和审查。ID 只使用稳定输入：

- 语义差异：kind + Source path + Receiver path；
- diff 线索：kind + file + line；
- 证据问题：diagnostic kind + path。

禁止数组序号、时间戳、随机 UUID 或输出顺序。Gate 必须拒绝重复和已经消失的 ID，防止旧决定误套到新结构上。

## 8. binding 的设计意图

Binding 不是 mapper 配置，而是实现方向的最小选择：

- `direct`：语义相同且无需转换；
- `translate`：Source/Receiver 有意保持独立，在唯一既有边界转换；
- `change_receiver`：接收要求本身应改变；
- `blocked`：缺少外部决定，依赖工作暂停。

CLI 只检查 `translate` 有 location，`direct`/`change_receiver` 没有假 location。Agent 在选择前必须调查 Receiver 是否为项目拥有的独立概念、两侧是否独立演进、是否公共/持久化/共享，以及现有 seam 在哪里。

对 external/vendor Source → project-owned domain，只要 domain 表达独立概念或可能独立演进，即使当前同形且只有一个调用点，也默认在唯一既有边界 `translate`。`direct` 只留给明确接受耦合、局部/临时/纯展示且不构成独立项目约定的 Receiver。

用户决定可以授权行为或 fallback，但不能替代结构事实：它不能证明 Source 字段存在、两个 alias 同义或某个 provider version 支持该字段。这些仍然属于 evidence。

## 9. 结构引擎必须保持保守

结构引擎的关键不变量：

- JSON observation 不升级为 required 或 closed enum；
- sample 中出现过的字段不能单独证明 Receiver 可以要求它；
- Source 可选/可空/值域更宽时按方向报告；
- exact name 才直接配对，命名风格相似只产生 candidate；
- candidate 不消除 missing finding；
- 证据冲突返回 blocking diagnostic，不能按新旧、多数或文件类型选边；
- unsupported 且可能改变结论的语法必须使结构结果 incomplete；
- 所有路径、provenance、finding 和 ID 的排序必须确定；
- 超限不能静默截断成 ready 状态。

实现模块应保持深接口：

```text
data-contracts.mjs (process I/O)
        ↓
cli.mjs (invocation protocol) → commands.mjs (command workflow)
                                  ↓
                        analysis.mjs (structural pipeline)
                                  ↓
             request → extract/reconcile → compare/scan
                                  ↓
                              gate → report
```

`data-contracts.mjs` 只负责进程输入输出和失败出口；`cli.mjs` 封装参数/help interface；`commands.mjs` 组装各命令的公开结果；`analysis.mjs` 隐藏 load、reconcile、compare、scan、预算与排序；`request.mjs` 负责请求协议和本地路径；`gate.mjs` 不读文件；`report.mjs` 不重新推导业务状态；解析器不参与工作流决定。避免把条件散落回 CLI 入口，或让诊断命令各自复制结构分析管线。

## 10. 安全边界

CLI 必须始终：

- 只读、本地、无网络、非交互；
- 不动态 import、编译、eval 或执行输入代码；
- 无第三方运行依赖；
- 对 request、文件、证据数量、深度、节点、token、finding 和输出设上限；
- 对错误只输出一份结构化 stdout 文档，内部堆栈仅到 stderr；
- 对相同输入产生 byte-for-byte 稳定 JSON。

## 11. 文档和测试的责任分层

| 文件 | 责任 |
|---|---|
| `skills/data-contracts/SKILL.md` | Agent 何时触发、如何推进和何时停 |
| `skills/data-contracts/references/cli.md` | 请求、状态、命令和排障手册 |
| `docs/specs/data-contracts.md` | canonical 机器与行为规范 |
| `docs/data-contracts-design.md` | 设计动机和 Review 视角 |
| `tests/data-contracts/check-workflow.test.mjs` | gate、状态、退出码和稳定 ID |
| 其他 `tests/data-contracts/*.test.mjs` | parser、reconciliation、comparison、scan、安全回归 |
| `scripts/check-release.mjs` | 发布时确认 `check` 是正常入口且行为测试通过 |

不要在多份文档中维护互相不同的状态表。协议变化先改 canonical spec，再改 CLI reference、Skill 和测试。

## 12. Review 清单

Review 变更时逐项确认：

- 正常流程是否仍然只有 `check`？
- `check` 是否要求 `schemaVersion`、`boundaryId` 和每边至少一份证据？
- 是否仍然可以第一次不填 decision？
- `compatible` 是否仍会要求全局语义与 binding 决定？
- 每个当前 semantic/heuristic required decision 是否有稳定 ID 和唯一 resolution，evidence remediation 是否通过修复证据而不是声明解决？
- unknown/stale/duplicate resolution 是否会阻塞？
- `needs_evidence` 是否高于所有语义声明？
- finding 是否能在明确 resolution 后进入实现，而不是永久失败？
- 是否出现 `complete`、`aligned`、`approved` 或 `verified` 的错误承诺？
- `ready_to_verify` 后是否仍明确要求 Agent 运行真实验证？
- 缺字段/fallback 是否验证缺失输入，nullable/enum 是否覆盖 null、known、unknown，API→UI 是否用真实形状 fixture 穿过消费路径？
- CLI 是否仍然只读、无网络、不执行输入？
- 新规则是否属于确定性结构/gate 逻辑，还是不该硬编码的业务语义？
- 文档、help、测试和 release check 是否使用同一协议？

如果答案依赖模型“应该能理解”，而没有进入明确的请求、状态或确定性规则，就说明接口还不够深；如果答案要求新增大量长期业务字段，就说明协议可能正在膨胀成不必要的 manifest。

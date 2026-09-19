# `data-contracts check` 执行方案

## 1. 目标

将 `data-contracts` 收敛为一个以确定性 CLI 为控制层的深模块：不同能力和行为风格的 Agent 面对同一个数据交接点时，使用同一个日常命令、得到同一组结构事实、进入同一个工作流状态，并且不能在缺少必要证据或决定时报告完成。

第一版只实现三个能力：

1. 单一日常命令：`check --request <file|->`。
2. 明确且互斥的工作流状态。
3. 最小 decision gate：语义检查、机器产生的待决事项、唯一 binding 决定。

当前结构提取、证据合并、Source → Receiver 比较、diff 扫描、资源限制和确定性输出继续作为内部实现复用。

## 2. 明确非目标

本方案不建设大型 manifest，也不为以后建设大型 manifest 预留抽象层。只有跨模型评测或真实使用反复证明缺少某项机器可验证信息时，才单独扩展请求协议。

第一版明确不做：

- 项目级数据交接目录或 contract catalog；
- decision history、审批流、负责人列表、时间戳或迁移记录；
- rollout、rollback、兼容期和版本治理；
- 自动判断字段业务含义；
- 自动判断最优 seam 或项目架构；
- 让自然语言 rationale 充当可验证证据；
- 执行任意项目验证命令；
- 仅凭请求中的 `verificationStatus: passed` 声称验证通过；
- Git hook、编辑器 hook、CI 集成或项目常驻配置；
- 新增语言、YAML OpenAPI、远程 `$ref` 或完整编译器能力；
- 恢复多个日常工作流命令，例如 `checkpoint`、`verify`、`clean` 或 `risk`。

## 3. 设计原则与不变量

### 3.1 CLI 是确定性控制层

只要本次修改涉及一个受支持的数据交接点，并且能够提供至少一份 Source 与一份 Receiver 证据，Agent 必须运行 `check`。模型不得自行以“改动简单”为由跳过。

Node.js 不可用、版本不足或真实结构无法由支持的输入种类表达时，才允许进入人工降级流程。降级结果不能冒充 CLI 状态。

### 3.2 一个请求只表达一个数据交接点

一个 request 表达且只表达一个 Source → Receiver 数据交接点：

- 多份 Source 是同一个 Source 约定的不同证据；
- 多份 Receiver 是同一个 Receiver 约定的不同证据；
- 多个不相关的数据交接点必须分别运行 `check`；
- CLI 无法仅靠结构证明所有证据确实属于同一个交接点，因此 Skill 必须明确要求 Agent 先枚举交接点；
- `boundaryId` 为报告、decision ID 和重复运行提供稳定身份，不代表 CLI 已经证明证据归属正确。

### 3.3 结构事实与业务决定分离

CLI 可以确定：

- 输入是否可解析；
- 证据是否冲突或不足；
- Source 是否结构兼容 Receiver；
- 是否存在 naming candidate、缺失字段、可选性、可空性或枚举差异；
- diff 是否包含达到阈值的风险线索；
- 请求是否记录了必须的语义和 binding 决定。

CLI 不可以确定：

- 两个字段在业务上是否确实同义；
- Receiver 是否是正确的领域模型；
- 某个 fallback 是否符合产品要求；
- 某个 seam 是否是项目中的最佳设计；
- 项目验证是否真的通过，除非 CLI 自己执行并获得结果。本方案不让 CLI 执行项目命令。

### 3.4 缺决定必须阻塞

结构兼容不等于业务语义已证明。即使 Source 与 Receiver 使用完全相同的字段名和结构，请求仍必须明确记录全局语义检查状态和 binding 决定，才能进入可实现状态。

### 3.5 不输出虚假的整体成功

CLI 不使用 `aligned`、`approved`、`correct` 或笼统的 `complete` 表示数据对接完成。CLI 的最远状态是 `ready_to_verify`，表示结构与 decision gate 允许 Agent 进入项目验证，不表示验证已经执行或业务上已经正确。

## 4. 公共 interface

### 4.1 日常命令

```text
data-contracts.mjs check --request <file|-> [--format json|markdown] [--detail]
```

这是 Skill 正常流程唯一要求 Agent 使用的命令。

### 4.2 诊断命令

现有 `extract`、`compare` 和 `scan` 保留为诊断 interface：

```text
extract --input <file|-> --kind <kind> [--selector <selector>]
compare --request <file|-> [--format json|markdown] [--detail]
scan --diff <file|-> [--format json|markdown]
```

它们不得替代 `check`，也不得输出最终工作流状态。

### 4.3 `analyze` 的迁移

长期不保留 `analyze` 作为第二个日常 interface：

- 如果当前新协议尚未正式发布，直接由 `check` 取代 `analyze`；
- 如果已存在外部调用者，`analyze` 只作为一个发布周期的弃用别名，并在输出中提供机器可读的 deprecation diagnostic；
- 弃用别名必须调用与 `check` 相同的 implementation，不能形成两套行为；
- 迁移期结束后删除别名和对应文档。

## 5. 最小请求协议

### 5.1 请求示例

```json
{
  "schemaVersion": 1,
  "boundaryId": "api-user-to-user-view",
  "sources": [
    {
      "id": "api-schema",
      "path": "openapi.json",
      "kind": "openapi",
      "selector": "#/components/schemas/User"
    }
  ],
  "receivers": [
    {
      "id": "user-view",
      "path": "src/user-view.ts",
      "kind": "typescript",
      "selector": "UserView"
    }
  ],
  "diffs": [
    {
      "id": "current-change",
      "path": "change.diff"
    }
  ],
  "decision": {
    "semantic": {
      "status": "unresolved",
      "authorityRefs": []
    },
    "resolutions": [],
    "binding": {
      "mode": "blocked"
    }
  }
}
```

`decision` 可以在第一次调用时省略。CLI 必须返回缺少哪些决定以及允许值，而不是把缺少 decision 当作调用错误。这样 Agent 可以先运行 `check` 获得结构事实和确定性的下一步，再补充决定后重复运行同一命令。

### 5.2 顶层字段

只允许以下字段：

| 字段 | 必需 | 说明 |
|---|---:|---|
| `schemaVersion` | 是 | request 协议版本，第一版为 `1` |
| `boundaryId` | 是 | 当前 Source → Receiver 数据交接点的稳定 ID |
| `sources` | 是 | 1–16 份同一 Source 约定的证据 |
| `receivers` | 是 | 1–16 份同一 Receiver 约定的证据 |
| `diffs` | 否 | 0–16 份与当前交接点有关的 unified diff |
| `decision` | 否 | 可逐次补全的最小 decision record |

继续拒绝未知字段，防止协议无控制膨胀。

### 5.3 全局语义状态

```json
{
  "semantic": {
    "status": "resolved",
    "authorityRefs": [
      {
        "kind": "local",
        "path": "docs/user-api.md",
        "selector": "display_name"
      }
    ]
  }
}
```

`semantic.status` 允许：

- `unresolved`：业务含义尚未建立，工作流必须停在 `needs_decision`；
- `resolved`：Agent 声明已经根据列出的 authority 完成语义调查；
- `blocked`：现有材料无法决定，需要用户或其他外部决定，工作流为 `blocked`。

`resolved` 必须包含至少一个 `authorityRef`。CLI 只验证引用格式、已引用 evidence ID 或本地路径是否有效，不判断引用内容是否真的证明业务语义。

第一版 authority 只支持：

```json
{ "kind": "evidence", "id": "api-schema" }
```

```json
{ "kind": "local", "path": "docs/user-api.md", "selector": "display_name" }
```

```json
{ "kind": "user_decision", "id": "display-name-mapping" }
```

不加入自由文本 rationale。`selector` 对本地引用可选；CLI 不解释 selector 的业务含义。

### 5.4 CLI 产生的待决事项

CLI 为每一个 `requiredDecision` 产生稳定 `decisionId`。ID 必须只由稳定输入构成，例如：

```text
semantic:naming_candidate:$.display_name:$.displayName
fallback:semantic_fallback:src/user.ts:42
```

不要使用数组顺序或随机 UUID。相同请求重复运行必须产生相同 ID。

请求使用 `resolutions` 对这些事项逐项记录：

```json
{
  "resolutions": [
    {
      "decisionId": "semantic:naming_candidate:$.display_name:$.displayName",
      "status": "resolved",
      "authorityRefs": [
        {
          "kind": "local",
          "path": "docs/user-api.md",
          "selector": "display_name"
        }
      ]
    }
  ]
}
```

`resolution.status` 只允许：

- `unresolved`；
- `resolved`；
- `blocked`。

规则：

- 所有 CLI 产生的 required decision 都必须有对应 resolution，才能离开 `needs_decision`；
- `resolved` 必须有 authority reference；
- `blocked` 使整体工作流为 `blocked`；
- 未知、重复或已经消失的 `decisionId` 返回 decision diagnostic，防止沿用陈旧决定；
- diff scan 发现的 fallback、cast 或语义候选可以通过同一 resolution 机制处理，不新增独立 fallback manifest。

### 5.5 Binding 决定

```json
{
  "binding": {
    "mode": "translate",
    "location": "src/api/map-user.ts"
  }
}
```

`binding.mode` 只允许：

- `blocked`；
- `direct`；
- `translate`；
- `change_receiver`。

规则：

- `translate` 必须提供唯一 `location`；
- `blocked` 使整体工作流为 `blocked`；
- `direct` 和 `change_receiver` 不接受为了占位而提供的假 location；
- CLI 只验证选择完整且内部一致，不判断 seam 是否在架构上正确；
- Skill 正文必须要求 Agent 在决定 binding 前调查 Receiver 是否表达项目拥有的独立概念、Source 与 Receiver 是否独立演进、现有 seam 和改动影响。

## 6. 输出协议

### 6.1 状态维度

输出拆成结构状态、决定状态和工作流状态，避免单个 `status` 同时表达多个含义：

```json
{
  "schemaVersion": 1,
  "toolVersion": "1.0.0",
  "command": "check",
  "boundaryId": "api-user-to-user-view",
  "structuralStatus": "findings",
  "decisionStatus": "unresolved",
  "workflowStatus": "needs_decision",
  "inputs": [],
  "scope": {},
  "summary": {},
  "findings": [],
  "diagnostics": [],
  "requiredDecisions": [],
  "nextActions": []
}
```

### 6.2 结构状态

`structuralStatus` 只允许：

- `compatible`：在所供结构证据和支持子集内没有结构 finding；
- `findings`：存在结构差异或达到报告阈值的 diff 线索；
- `incomplete`：证据不足、冲突、不支持、无法解析或资源受限；
- `error`：调用或内部错误。

`compatible` 不表示业务含义、binding、实现或验证完成。

### 6.3 决定状态

`decisionStatus` 只允许：

- `missing`：没有 decision record；
- `unresolved`：全局语义、required decision 或 binding 尚未解决；
- `resolved`：所有当前 required decision 已有格式有效的 resolution，语义状态和 binding 已明确；
- `blocked`：请求明确记录需要外部决定或不允许继续；
- `invalid`：decision record 与当前 findings、允许值或条件约束冲突。

### 6.4 工作流状态

`workflowStatus` 只允许：

| 状态 | 含义 |
|---|---|
| `needs_evidence` | 结构分析不完整；先修复、补充或缩小证据 |
| `needs_decision` | 结构分析可用，但语义、required decision 或 binding 未解决 |
| `blocked` | 请求明确记录无法继续，或 decision record 存在阻塞性矛盾 |
| `ready_to_implement` | 决定完整且没有提供实现 diff；可以开始或继续实现 |
| `ready_to_verify` | 决定完整并提供了实现 diff；必须执行真实项目验证 |
| `error` | 调用错误或内部错误 |

第一版没有 `complete`、`aligned`、`approved` 或 `verified` 状态。

状态优先级：

```text
error
  > needs_evidence
  > blocked
  > needs_decision
  > ready_to_verify
  > ready_to_implement
```

### 6.5 `nextActions`

每个非 ready 状态必须输出机器可读的 `nextActions`，包括：

- 稳定 `kind`；
- 相关路径或 `decisionId`；
- 允许值；
- 一句具体下一步，不使用宽泛建议。

示例：

```json
{
  "kind": "resolve_required_decision",
  "decisionId": "semantic:naming_candidate:$.display_name:$.displayName",
  "allowedStatuses": ["resolved", "unresolved", "blocked"],
  "message": "Record an evidence-backed semantic decision for this naming candidate."
}
```

### 6.6 退出码

保留现有错误语义，新增工作流阻塞码：

| 退出码 | 状态 |
|---:|---|
| `0` | `ready_to_implement` 或 `ready_to_verify` |
| `1` | `needs_decision` 或 `blocked` |
| `2` | 无效调用或请求 |
| `3` | 内部错误 |
| `5` | `needs_evidence` |

结构 findings 本身不再直接决定退出码；如果所有 required decision 已被显式解决且 binding 完整，结构差异可以合法进入 `ready_to_implement` 或 `ready_to_verify`。这允许有依据的命名转换和边界适配，同时不允许未决差异假成功。

## 7. 工作流

### 7.1 第一次检查

1. Agent 先枚举本次修改涉及的数据交接点。
2. 每个交接点创建独立 request，填写 `boundaryId`、Source、Receiver 和可用 diff。
3. 不要求 Agent 在第一次运行前猜测 decision。
4. 运行 `check`。
5. `needs_evidence` 时补材料或明确进入人工限制说明。
6. `needs_decision` 时依据 `requiredDecisions` 调查规格、领域规则、现有代码或询问用户。

### 7.2 补充决定

1. 填写全局 `semantic` 状态和 authority references。
2. 对每个 required decision 填写 resolution。
3. 根据项目 seam、Receiver 的模块归属、独立演进关系和改动影响选择 binding。
4. 再次运行同一个 `check` 命令。
5. `blocked` 时只停止依赖该决定的映射或行为，继续不依赖它的工作。

### 7.3 实现后检查

1. 实现最小的 direct、translate 或 change-receiver 方案。
2. 将只与该数据交接点相关的 unified diff 加入 request。
3. 再次运行 `check`。
4. `ready_to_verify` 仅表示可以进入项目验证。
5. Agent 执行真正穿过数据交接点的测试、类型检查、解析、渲染或集成路径。
6. CLI 不记录或宣称验证成功；Agent 必须报告实际运行的命令和结果。

## 8. Implementation 变更计划

### 阶段 A：先冻结规范

1. 将本文确认的请求字段、状态、条件约束和退出码合并进 canonical spec。
2. 明确 `check` 是唯一日常 interface。
3. 明确 Analyzer 只提供结构事实，decision gate 只验证记录完整性和内部一致性。
4. 明确 CLI 最大状态是 `ready_to_verify`。
5. 删除或改写所有把 `no_findings`、`complete` 或 `analyze` 当正常最终流程的说明。

完成条件：只阅读 canonical spec 就能实现 CLI，不需要从设计讨论猜测状态语义。

### 阶段 B：请求模型与 gate

主要文件：

- `skills/data-contracts/scripts/lib/request.mjs`
- 新增 `skills/data-contracts/scripts/lib/gate.mjs`
- `skills/data-contracts/scripts/lib/model.mjs`

任务：

1. 扩展 request 校验，加入 `schemaVersion`、`boundaryId` 和可选 `decision`。
2. 保持未知字段拒绝和资源限制。
3. 校验 authority references、resolution 和 binding 的条件约束。
4. 为 required decisions 生成确定性 ID。
5. 新增纯函数 gate：输入结构结果、required decisions、decision record 和 diff 存在性，返回 `decisionStatus`、`workflowStatus`、diagnostics 与 `nextActions`。
6. gate 不读文件、不运行项目代码、不修改 analyzer findings；文件引用存在性由 request loader 处理。

完成条件：gate 可以通过纯输入测试覆盖所有状态转换，且内部结构重构不会改变公开行为。

### 阶段 C：单一 `check` 编排

主要文件：

- `skills/data-contracts/scripts/data-contracts.mjs`
- `skills/data-contracts/scripts/lib/report.mjs`

任务：

1. 新增 `check` 命令并设为帮助文档的 normal workflow。
2. 复用当前 load → extract → reconcile → compare → scan implementation。
3. 在结构分析后调用 gate。
4. 输出新的三维状态和 `nextActions`。
5. 根据 `workflowStatus` 决定退出码。
6. 保留 `extract`、`compare`、`scan` 的诊断用途，但不让它们输出 `ready_*`。
7. 按发布状态选择直接删除或短期弃用 `analyze`。

完成条件：普通 Agent 只需要知道一个命令，诊断命令不能伪装成完整工作流。

### 阶段 D：Skill 与 reference 收敛

主要文件：

- `skills/data-contracts/SKILL.md`
- `skills/data-contracts/references/cli.md`
- `skills/data-contracts/references/anti-patterns.md`
- `README.md`
- `README.zh-CN.md`

任务：

1. 主 Skill 改为始终运行 `check`，不再要求 Agent组合多个 CLI 命令。
2. 明确先枚举数据交接点，每个交接点一个 request。
3. 明确 `blocked` 只阻塞受影响的决定。
4. 将 binding 判断从“Receiver 是否局部/稳定”修正为同时考虑模块归属、是否表达独立项目概念、Source/Receiver 是否独立演进、现有 seam 和改动影响。
5. Reference 只保留 request 构造、状态解释和故障处理；规范性细节只保留在 canonical spec。
6. README 只保留定位和一个 `check` 示例。

完成条件：主 Skill 保持短小，Agent 不需要阅读设计文档才能正确调用正常流程。

### 阶段 E：测试与跨模型评测

CLI 行为测试至少覆盖：

1. 缺少 `boundaryId` 或错误 `schemaVersion`；
2. 无 decision record 时返回 `needs_decision`，不是 input error；
3. 完全相同的结构仍要求全局语义状态和 binding；
4. `semantic.resolved` 缺 authority 返回 unresolved/invalid decision；
5. naming candidate 产生稳定 decision ID；
6. required decision 缺 resolution；
7. resolution 引用未知、重复或陈旧 decision ID；
8. `translate` 缺 location；
9. `blocked` 的优先级；
10. 结构冲突或不支持语法返回 `needs_evidence`；
11. 决定完整、无 diff 返回 `ready_to_implement`；
12. 决定完整、有 diff 返回 `ready_to_verify`；
13. 相同请求重复运行逐字节确定；
14. JSON 与 Markdown 表达相同状态；
15. 诊断命令不能输出 ready 状态；
16. 旧 `no_findings` 和笼统 `complete` 不出现在 `check` 协议中；
17. 所有现有结构分析、安全和资源限制回归测试继续通过。

跨模型评测至少覆盖：

- 应触发：mock 替换、API/DB/webhook/SDK/配置/表单/AI 输出接入、mapper/parser 修改、类型或枚举不一致、fallback 和 cast；
- 不应触发：CSS、文案、静态设计 token、不经过运行输入的局部重命名；
- 多数据交接点必须拆成多个 request；
- naming candidate 不能被弱模型自动批准；
- 结构兼容不能跳过语义状态；
- Receiver 为项目拥有的独立概念时，单一调用点也不能仅因“局部”直接泄漏 vendor shape；
- unresolved/blocked 时只能停止受影响的工作；
- `ready_to_verify` 后必须真实运行项目验证；
- Node.js 不可用时明确人工降级且不编造状态。

完成条件：至少选取多个能力层级的模型运行同一批案例，记录触发、request 构造、decision、binding 和验证行为的差异；任何新增 manifest 字段必须由重复出现的失败案例证明必要性。

### 阶段 F：发布检查

1. 更新 `scripts/check-release.mjs`，要求 `check` normal workflow 和对应行为测试存在。
2. 如果保留短期 `analyze` alias，发布检查必须要求 deprecation diagnostic 和删除期限。
3. 检查 README、SKILL、CLI reference、canonical spec 和 `--help` 的命令名、状态和退出码一致。
4. 运行 `git diff --check`、`npm run test:data-contracts` 和 `npm run check:release`。

## 9. 推荐提交拆分

遵循仓库中文 Conventional Commits 偏好：

1. `docs: 定义 data-contracts check 工作流协议`
2. `feat: 添加最小数据约定 decision gate`
3. `feat: 将 check 设为数据约定单一入口`
4. `test: 补充 check 状态转换与跨模型评测`
5. `docs: 收敛 data-contracts 使用说明`

每个提交保持可测试；不要在同一提交中同时大改解析器和公开协议。

## 10. 风险与控制

### 模型伪造 authority

CLI 只能验证引用存在和格式，不能证明引用内容真的支持决定。控制方式：

- 不把 `resolved` 命名为 `approved`；
- 报告 authority provenance；
- 通过跨模型评测发现无依据引用；
- 业务高风险决定仍由用户或项目规则确认。

### Manifest 逐渐膨胀

控制方式：新增字段必须同时满足：

1. 多个模型重复出现同类失败；
2. 现有字段无法阻止；
3. 新字段会改变工作流控制；
4. CLI 能确定性验证；
5. 至少两个真实案例需要。

自然语言解释、方便展示但不改变控制流的字段不进入 request 协议。

### 状态协议破坏兼容性

控制方式：

- request schema 和 output schema 独立版本化；
- 发布前确认现有外部调用者；
- 如需兼容，只提供一个有期限的薄 alias；
- 不长期维护两套正常工作流。

### `ready_to_verify` 被误读为完成

控制方式：

- CLI 永不输出 `complete` 或 `verified`；
- `nextActions` 明确要求真实项目验证；
- Skill 完成标准要求报告实际运行和结果；
- 跨模型评测专门检查模型是否在该状态提前结束。

## 11. 验收标准

全部满足后，本方案才算完成：

- Agent 正常流程只有一个 `check` 命令；
- 一个 request 明确对应一个 `boundaryId`；
- 当前所有结构分析能力和安全限制继续工作；
- 结构状态、决定状态和工作流状态互相独立；
- 完全结构兼容也不能绕过全局语义状态和 binding；
- 所有 CLI required decisions 都有稳定 ID 和逐项 resolution；
- 未解决或阻塞决定不会返回 ready 状态；
- `translate` 只有一个明确 binding location；
- CLI 最大状态为 `ready_to_verify`，不声称业务正确或验证通过；
- 诊断命令不能替代 `check`；
- Node.js 不可用时存在明确人工降级路径；
- CLI 行为测试、发布检查和跨模型评测通过；
- 第一版 request 中不存在 project catalog、审批流、历史记录或其他大型 manifest 字段；
- 没有真实、重复、可机器验证的失败案例时，不扩大 manifest。

## 12. 执行顺序摘要

```text
冻结 check 协议与状态
        ↓
实现最小 request + decision gate
        ↓
将现有 analyzer 编排到 check
        ↓
收敛 SKILL / CLI reference / README
        ↓
补 CLI 状态转换测试
        ↓
运行跨模型评测
        ↓
只根据真实重复失败决定是否增加字段
```

第一版结束后不自动进入“大型 manifest”阶段。最小协议是默认长期形态，扩展是需要单独证据和单独设计决策的例外。

# data-contracts 跨模型前向评测

日期：2026-09-18

## 目的

验证新的单一 `check` 工作流能否在不同能力层级的模型上稳定约束触发、boundary 拆分、decision/binding、人工降级和真实验证行为，并只根据重复出现的失败决定是否扩展协议。

本次评测是只读前向行为评测：模型读取当前 `SKILL.md`、`references/cli.md` 和 `references/anti-patterns.md`，对同一批真实风格请求独立说明会采取的行为。它不伪造项目证据，也不代替 CLI 行为测试。

## 模型

- `gpt-6-astra`，medium reasoning；
- `gpt-5.6-terra`，medium reasoning；
- `gpt-5.6-luna`，medium reasoning。

## 相同评测场景

1. 将用户页 mock 替换为 API；存在 snake/camel 命名差异且 API 没有 Receiver 必需的 `avatarUrl`。
2. 将 nullable DB status 映射到非空内部 enum，并提议用 `unknown as` 强转。
3. webhook 缺 `displayName` 时使用 `display_name || name || 'Unknown'`。
4. 只修改静态按钮颜色。
5. 只重命名局部变量，不涉及运行时输入。
6. API → `DomainUser` → `UserCard` 同时修改两个交接点。
7. `VendorUser` 和 project-owned `DomainUser` 当前同形且只有一个调用点。
8. Node.js 不可用时完成 API 字段对接。
9. `check` 已返回 `ready_to_verify`，改动很小时是否可以直接结束。

每个模型都需说明：是否触发 Skill、request 数量、首次请求、各 workflow 状态的下一步、binding 判断、真实验证，以及容易误用之处。

## 结果矩阵

| 场景 | Astra | Terra | Luna | 结论 |
|---|---|---|---|---|
| 1 mock → API | 触发；不猜命名；缺字段不能伪造 | 触发；缺字段需真实来源/改 Receiver/阻塞 | 触发；禁止假默认值 | 通过 |
| 2 nullable enum + cast | 触发；拒绝 cast；覆盖 null/known/unknown | 触发；边界 translate 或有依据地改 Receiver | 触发；命中三类反模式 | 通过 |
| 3 alias/fallback | 触发；指出用户行为授权不能证明结构事实 | 触发；要求版本与语义依据 | 触发；无证据不放行 fallback 链 | 通过，但发现规则张力 |
| 4 CSS | 不触发 | 不触发 | 不触发 | 通过 |
| 5 局部 rename | 不触发 | 不触发 | 不触发 | 通过 |
| 6 两个交接点 | 两个 request | 两个 request | 两个 request | 通过 |
| 7 同形 Vendor → Domain | 触发；指出 direct/translate 文本存在分叉 | 触发；倾向 domain boundary translate | 触发；指出相同张力 | 发现重复歧义 |
| 8 Node 不可用 | 手工七项检查；不编造状态 | 手工七项检查；不安装/不写 shell parser | 手工七项检查；不编造 ready | 通过 |
| 9 ready_to_verify | 必须运行真实跨界验证 | 必须报告命令/路径和结果 | 不可直接结束 | 通过 |

三个模型都正确区分了结构状态、决定状态和工作流状态，没有把结构兼容当成语义批准，也没有把 `ready_to_verify` 当作验证完成。低层模型同样能拒绝 CSS/局部 rename 触发、拆出两个显式交接点，并在 Node.js 缺失时走人工流程。

## 重复出现的问题

三个模型都指出了以下波动源：

1. **同形 external/vendor → project-owned domain 的 binding 判据不够明确。** “无需翻译可 direct”与“避免 vendor shape 泄漏”可能让弱模型因单调用点而选 direct，也可能让强模型过度建立 adapter。
2. **用户决定与结构证据的授权范围不够明确。** 用户可以授权 fallback 行为，但不能凭此证明 alias 存在、同义或版本受支持。
3. **真实验证下限偏主观。** 模型可能只跑 typecheck，而没有覆盖缺失输入、null、未知 enum 或真实 UI 消费路径。
4. **多级链路的 boundary 判定可更明确。** 模型需要知道何时 intermediate model 是独立约定，何时只是透明 helper。

Authority 内容真实性也仍依赖 Agent/用户判断，但这是既定的人机边界：CLI 只验证引用存在和协议一致性。没有观察到需要新增机器字段才能解决的重复失败。

## 根据评测采取的修正

本轮只收紧 Skill/reference/spec，不扩大 request：

- 明确 intermediate model 只有在拥有声明、含义、公共/持久化消费者或独立演进能力时才形成新 boundary；透明 helper 不拆 request。
- 明确 external/vendor → independent project domain 默认在一个既有边界 `translate`，即使同形且只有一个调用点；`direct` 只用于明确接受耦合且非独立约定的局部/临时/纯展示 Receiver。
- 明确 user decision 可授权行为/fallback，但不能证明字段存在、alias 同义或版本支持。
- 明确 `needs_evidence`、`needs_decision`、`blocked` 的操作边界。
- 明确验证下限：missing/fallback 覆盖缺失输入；nullable/enum 覆盖 null/absence、known、unknown；API→UI 用真实形状 fixture 穿过 mapper/parser 和消费路径。

没有新增 rationale、claim、owner graph、verification record 或其他 manifest 字段。按照最小协议原则，这些扩展只有在后续多个真实任务持续出现且 CLI 能确定性验证时才重新评估。

## 最终判断

单一 `check`、三维状态、稳定 decision ID 和最小 binding gate 已把模型差异主要限制在应由 Agent/用户承担的语义与架构判断上。经上述文字收紧后，三种能力层级模型暴露的共同歧义已经得到处理，未出现需要大型 manifest 的证据。

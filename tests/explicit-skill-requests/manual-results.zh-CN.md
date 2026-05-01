# Explicit Skill Requests 人工审核结果

审核方式：由 Codex 根据当前 Wingman skill 契约人工阅读 prompt，并判断用户显式请求的 skill 是否应在其他工具前加载。本文不是自动模型 runner 输出，也不证明 Claude/Codex CLI 在真实运行时一定会作出相同选择。

## 结果摘要

| Scenario | 显式请求 | 人工审核 | 结论 |
| --- | --- | --- | --- |
| `memory-sync-explicit` | `memory-sync` | 应先加载并遵守 `memory-sync` | 通过 |
| `refactor-explicit` | `refactor` | 应先加载并遵守 `refactor`，先输出诊断表并等待批准 | 通过 |
| `refactor-types-explicit` | `refactor-types` | 应先加载并遵守 `refactor-types`，先提出类型归属方案 | 通过 |

## 逐项说明

### `memory-sync-explicit`

Prompt 明确说 “Use memory-sync”。这是直接点名 skill，应先加载 `memory-sync`，再根据该 skill 判断是否写入 active context、domain memory 或 archive。用户还要求保持简洁并不要归档无关历史，符合 `memory-sync` 的约束方向。

### `refactor-explicit`

Prompt 使用 `/refactor`，这是显式 workflow invocation。Agent 不应直接编辑组件，而应先加载 `refactor`，输出诊断表，并等待用户批准后再改代码。

### `refactor-types-explicit`

Prompt 使用 `/refactor-types`，这是显式 type refactor workflow。Agent 不应直接移动或改写类型，而应先加载 `refactor-types`，分析 inline TypeScript interfaces，并提出每个类型应放在哪里。

## 剩余风险

- 本审核不能替代真实 agent CLI 日志断言。
- 如果未来接入 live runner，应检查显式请求场景中是否在调用其他工具前先调用对应 skill。
- 当前 `npm test` 只检查 prompt、expectation 和引用 skill 的完整性，不启动外部 AI。

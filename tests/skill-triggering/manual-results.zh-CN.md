# Skill Triggering 人工审核结果

审核方式：由 Codex 根据当前 Wingman skill 契约人工阅读 prompt，并判断预期 skill 是否应该触发。本文不是自动模型 runner 输出，也不证明 Claude/Codex CLI 在真实运行时一定会作出相同选择。

## 结果摘要

| Scenario | 预期 | 人工审核 | 结论 |
| --- | --- | --- | --- |
| `memory-load-nontrivial` | `memory-load` | 应触发 `memory-load`；不应触发 `memory-setup` | 通过 |
| `align-contracts-api-ui` | `align-contracts` | 应触发 `align-contracts`；不应触发 `memory-setup` | 通过 |
| `reuse-select-before-building` | `reuse-select` | 应触发 `reuse-select`；不应触发 `memory-setup` | 通过 |
| `no-memory-setup-for-ordinary-task` | 无自动 skill；禁止显式 workflow | 不应触发 `memory-setup`、`refactor`、`refactor-types` | 通过 |

## 逐项说明

### `memory-load-nontrivial`

Prompt 要求检查 checkout 流程、payment webhook 和订单状态转移 bug。这是非平凡调试任务，触及现有行为、状态流和可能的业务规则。根据 `memory-load` 契约，应先判断并加载相关项目记忆。不应触发 `memory-setup`，因为用户没有要求初始化记忆文件。

### `align-contracts-api-ui`

Prompt 明确描述 API 响应字段从 `totalCents` 变为 `amount.total_minor_units`，并要求更新 React 组件且不要用 ad-hoc parent mapper 隐藏契约漂移。这是 provider/consumer contract boundary，且涉及 React/TypeScript UI 绑定。根据 `align-contracts` 契约，应触发该 skill。不应触发 `memory-setup`。

### `reuse-select-before-building`

Prompt 要求在构建新的 searchable customer picker 前检查项目是否已有 picker、combobox 或 selection pattern 可复用、扩展或包装。这正是 `reuse-select` 的选择场景，应先查 registry 并给出 reuse decision。不应触发 `memory-setup`。

### `no-memory-setup-for-ordinary-task`

Prompt 是 README 标题拼写修正，并明确说不要创建项目记忆或 workflow 文件。这是低风险、孤立、琐碎任务，不应触发 `memory-setup`，也不应进入 `refactor` 或 `refactor-types` 这类显式 workflow。

## 剩余风险

- 本审核是人工 AI 判断，不是自动启动 Claude Code、Codex 或 Cursor 的 live runner。
- 真实模型行为可能随模型版本、平台 skill loader、上下文和系统提示变化。
- 如果未来接入 live runner，应复用 `tests/skill-triggering/prompts/` 和 `EXPECTATIONS.json` 作为输入。

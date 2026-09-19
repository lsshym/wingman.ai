# Wingman

[English](README.md) | [中文](README.zh-CN.md)

Wingman 是一个面向编码代理的插件，提供项目记忆、数据约定对齐、项目地图发现以及聚焦的工作流指导。

## 安装

Codex 用户：

```bash
codex plugin marketplace add lsshym/wingman.ai
codex plugin add wingman@wingman-marketplace
```

安装后请打开一个新的 Codex 线程。

Cursor 或 Claude Code 用户可以使用本仓库中的插件元数据。技能名称可能会带有平台命名空间，例如 `/wingman:memory-setup`。

## 记忆技能

可以把这些技能作为每个仓库的简单记忆工作流。

### `memory-setup`

当你想在某个仓库中启用 Wingman 记忆时，使用一次即可。

```text
/memory-setup
```

### `memory-load`

在进行有意义的工作前使用，尤其是修复 bug、重构、业务逻辑、API 工作或修改现有功能前。

```text
Use `memory-load` before this bug fix.
```

```text
Load Wingman memory before changing the upload flow.
```

### `memory-sync`

在完成有意义的工作后使用，让代理记录有价值的项目知识。

```text
Use `memory-sync` to record the API contract decision from this change.
```

```text
Sync memory for this bug fix, but do not write unrelated history events.
```

### `memory-clean`

仅当你明确希望压缩、修剪、去重或修正记忆内容时使用。

```text
Use `memory-clean` to compact the current memory context.
```

## 独立技能

这些技能独立于记忆工作流。请在它们适合当前任务时使用。

### `data-contracts`

当真实来源数据需要接入接收方代码，且字段名、结构、可选性、枚举值或业务含义可能不一致时使用。

该技能把模型容易混在一起的三件事分开：结构证据、业务决定和实现就绪程度。只供代理调用的只读 CLI 对每个 Source → Receiver 交接点只提供一个正常入口 `check`。第一次运行会返回确定性的结构发现、稳定的待决事项 ID 和具体下一步；后续运行只验证最小的、有依据的语义与 binding 记录。输出分别使用 `structuralStatus`、`decisionStatus` 和 `workflowStatus`，因此“结构兼容”绝不会被误解为“语义已经批准”或“验证已经通过”。

Skill 的人工工作流不需要额外运行时。可选 CLI 需要 Node.js 18 或更高版本，只使用内置模块，无需 `npm install`。CLI 不会运行项目验证；`ready_to_verify` 只要求代理随后执行真实的测试、解析、类型检查、渲染或集成路径。如果没有可用的 Node.js，代理必须手工完成同样的检查，明确说明 CLI 没有运行，并且不得编造任何 CLI 状态。

```text
Use `data-contracts` to replace this mock payload with the real source contract without inventing fields.
```

### `project-map-find`

在构建新内容前使用，或当你需要查找项目里是否已有某个功能、流程、页面、组件、模块、契约、模式或业务概念时使用。

```text
Use `project-map-find` before creating a new upload progress component.
```

### `project-map-catalog`

当你创建或发现了一个未来代理应当能定位、理解或作为先例复用的稳定项目能力后使用。

```text
Use `project-map-catalog` for src/components/UploadProgress.tsx.
```

### `using-wingman`

这是 Wingman 面向会加载插件级指令的平台的入口技能。通常不需要直接调用它。

```text
Use `using-wingman` to load the Wingman skill guide.
```

## Slash 别名

```text
/memory-setup
/project-map-find
/project-map-catalog
```

## 说明

- 用户指令和项目本地指令仍然优先。
- Wingman 记忆文件位于当前仓库的 `.wingman/` 目录下。
- Wingman 项目地图文件位于当前仓库的 `.wingman/project-map/` 目录下。
- `memory-setup` 和 `memory-clean` 只会在你直接要求时运行。

## 许可证

MIT

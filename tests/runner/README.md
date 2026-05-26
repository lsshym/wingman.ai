# Wingman Evaluation Runner

这个目录放 Wingman skill 评测 runner。当前 runner 是**通用准备工具**，不是某个 skill 专用工具。

它现在只做一件事：根据 `tests/<skill>/cases.md` 生成隔离运行目录、prompt 和 evidence 模板。它还不会直接启动 Codex、Claude、Gemini 或其他 agent。

## 文件说明

- `skill/eval-skill.mjs`：A/B paired case prepare runner。当前主要用于 `align-contracts` 这类对照实验。
- `skill/eval-skill.test.mjs`：`skill/eval-skill.mjs` 的 Node 内置测试。
- `memory/eval-memory.mjs`：memory single case prepare runner。当前用于 `memory-setup`、`memory-load`、`memory-sync`、`memory-clean` 的普通 case。
- `memory/eval-memory.test.mjs`：`memory/eval-memory.mjs` 的 Node 内置测试。
- `inspect/`：可选 Inspect AI bridge。读取 `.eval-runs/` 里的 prepared prompt，生成 Inspect task/log。
- `phoenix/`：可选 Phoenix bridge。读取 `.eval-runs/`，导出 Phoenix 友好的 JSONL。

## 让 AI 启动 Runner

把下面 prompt 发给当前 AI 即可：

```text
请准备 Wingman evaluation 运行目录：

- 如果是 align-contracts A/B 对照 case，运行：
  node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002

- 如果是 align-contracts 全部 A/B 对照 case，运行：
  node tests/runner/skill/eval-skill.mjs all align-contracts

- 如果是 memory 普通 case，运行：
  node tests/runner/memory/eval-memory.mjs prepare memory-load MEMLOAD-004

- 如果是某个 memory skill 的全部普通 case，运行：
  node tests/runner/memory/eval-memory.mjs all memory-load

运行后告诉我生成的 .eval-runs 路径，以及下一步应该把哪个 prompt.md 交给独立 agent 会话执行。
```

## 准备 align-contracts A/B Prompt

```bash
node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002
```

这会生成：

```text
.eval-runs/align-contracts/<run-id>/ALIGN-002A/
  workspace/
  prompt.md
  evidence-template.json

.eval-runs/align-contracts/<run-id>/ALIGN-002B/
  workspace/
  prompt.md
  evidence-template.json
```

然后分别开启两个全新的 agent 会话：

1. 在第一个会话里运行 `ALIGN-002A/prompt.md`，并让 agent 只操作 `ALIGN-002A/workspace/`。
2. 在第二个会话里运行 `ALIGN-002B/prompt.md`，并让 agent 只操作 `ALIGN-002B/workspace/`。
3. 两边都把结果填到对应的 `evidence-template.json` 结构里。

这样可以避免同一个会话先读了 skill 后污染 baseline。

准备 `align-contracts` 的全部 A/B case：

```bash
node tests/runner/skill/eval-skill.mjs all align-contracts
```

## 准备 memory 单 case Prompt

```bash
node tests/runner/memory/eval-memory.mjs prepare memory-load MEMLOAD-004
```

这会生成：

```text
.eval-runs/memory-load/<run-id>/MEMLOAD-004/
  workspace/
  prompt.md
  evidence-template.json
  run.json
```

开启一个全新的 agent 会话，把 `prompt.md` 发给它，并让它只操作对应的 `workspace/`。

准备某个 memory skill 的全部普通 case：

```bash
node tests/runner/memory/eval-memory.mjs all memory-load
```

`all` 会跳过 `MEMLOAD-008A/B` 这类 mini comparison variant，只准备普通 case。mini comparison 和 token-efficiency A/B 后续需要专门 runner。

## 当前支持范围

`skill/eval-skill.mjs` 支持 `cases.md` 里的 paired A/B case，格式如下：

````markdown
## Pair ALIGN-002: ...

### Shared Initial Workspace

`path/to/file.ts`

```ts
file content
```

### ALIGN-002A baseline_without_skill

#### Task Prompt

```text
baseline prompt
```

### ALIGN-002B with_align_contracts

#### Task Prompt

```text
skill prompt
```
````

`memory/eval-memory.mjs` 支持 memory 普通 case，格式如下：

````markdown
## MEMLOAD-004: ...

### Initial Workspace

`path/to/file.md`

```markdown
file content
```

### Task Prompt

```text
memory task prompt
```
````

memory mini comparison 和 token-efficiency A/B 目前还没有专门 prepare runner。可以先手动运行，后续再扩展。

## 后续可扩展方向

- 增加 Codex、Claude、Gemini agent adapter，直接启动独立 agent 会话。
- 收集 worker agent 输出，生成 `raw-output.json` 和 `evidence.json`。
- 合并 A/B 结果，生成最终 report。
- 继续完善 Inspect AI bridge，或接入 Braintrust 等实验平台。
- 继续完善 Phoenix bridge，加入 trace/eval SDK 写入。

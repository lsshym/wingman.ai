# How To Test Wingman Skills

这份文档给日常使用。目标是：你在 Claude 里说“帮我测试某个 skill”，Claude 自动运行 runner、启动独立被测 agent、收集 evidence、最后总结结果。

## 一句话版本

在 Claude TUI 里输入：

```text
请测试 memory-load 这个 skill，用 Claude 作为被测 agent。

运行：
node tests/runner/run-skill-eval.mjs memory-load --agent claude

跑完后读取生成的 summary.md，总结 pass/fail/missing evidence，并列出失败 case。
```

如果先想确认目录和 case 解析是否正常，不花钱跑真实 agent：

```text
请 dry-run 检查 memory-load 的测试目录生成。

运行：
node tests/runner/run-skill-eval.mjs memory-load --dry-run

只告诉我生成的 runRoot、case 数量和 summary，不要启动真实 agent。
```

## Claude 在这里的两个角色

当前打开的 Claude TUI 是“总控 agent”：

- 它运行 shell 命令。
- 它读取 `summary.md`。
- 它给你总结结果。

runner 启动的 `claude -p` 是“被测 agent”：

- 每个 case 都是一个新的 `claude -p` 子进程。
- 每个 case 都在独立 workspace 里运行。
- 这样可以避免当前会话读过 skill 后污染 baseline。

默认 Claude 命令是：

```bash
claude -p
```

Codex 也可以作为被测 agent：

```bash
codex exec --cd <workspace> --sandbox workspace-write --ask-for-approval never -
```

## 常用命令

测试某个 skill 的全部 ordinary case：

```bash
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

测试某个单独 case：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude
```

测试 `data-contracts` 全部 A/B case：

```bash
node tests/runner/run-skill-eval.mjs data-contracts --agent claude
```

如果要让 `data-contracts` 的 TypeScript case 能完整运行 `tsc` 验证，使用共享 TypeScript toolchain：

```bash
node tests/runner/run-skill-eval.mjs data-contracts \
  --agent claude \
  --setup-toolchain typescript
```

这只会在下面目录安装一次 TypeScript：

```text
.eval-runs/.toolchains/typescript/
```

不会安装到项目根目录，也不会给每个 case workspace 都创建 `node_modules/`。

测试 `data-contracts` 单个 pair：

```bash
node tests/runner/run-skill-eval.mjs data-contracts --case ALIGN-002 --agent claude
```

用 Codex 跑单个 case：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent codex
```

只准备目录，不启动 agent：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --dry-run
```

## 如果你要用 claude-ds

如果 `claude-ds` 在你的 shell 里可用，并且支持 `-p` 非交互模式：

```bash
WINGMAN_EVAL_AGENT_CMD="claude-ds -p" \
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

也可以写成参数：

```bash
node tests/runner/run-skill-eval.mjs memory-load \
  --agent claude \
  --agent-cmd "claude-ds -p"
```

如果 `claude-ds` 只是你的交互 shell alias，runner 的子进程可能找不到它。这种情况下优先用默认的：

```bash
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

默认会调用真实命令：

```bash
claude -p
```

## TypeScript 验证

默认 runner 不安装依赖。如果 worker 需要 `tsc` 但没有可用工具，它应该在 `evidence.failure_reasons` 里记录 `verification_missing`，不要自己安装依赖。

需要 TypeScript 验证时，使用：

```bash
node tests/runner/run-skill-eval.mjs data-contracts \
  --agent claude \
  --setup-toolchain typescript
```

runner 会准备：

```text
.eval-runs/.toolchains/typescript/node_modules/.bin/tsc
```

并把这个路径写进每个 `prompt.md`。worker 应使用这个 `tsc`，不要运行：

```bash
npm install
npm install -D typescript
npx tsc
```

toolchain 安装日志在：

```text
.eval-runs/.toolchains/typescript/setup.json
.eval-runs/.toolchains/typescript/setup-output.txt
.eval-runs/.toolchains/typescript/setup-error.txt
```

## 让 AI 分析测试结果

默认 runner 会生成 `analysis.md/json`。分析层会先检查 evidence 是否有效；如果 `method.md` 里声明了 `## Built-in Checks`，还会对修改后的 workspace 跑轻量规则，命中 forbidden pattern 就直接判 fail。没有这些规则时，它才会镜像 worker status。

`data-contracts` 已经内置了少量规则来抓明显违规：

- `ALIGN-002`：给 `ApiJob` 发明 workflow kind、`as WorkflowKind`、把 queued/running/done 硬映射成 import/export。
- `ALIGN-004`：给 `ApiUser` 发明 `avatarUrl`、保留 `avatarUrl: ""`、发明默认头像路径。

这能防止“worker 自报 pass 但代码明显违反 Forbidden Behavior”的情况。更复杂的判断仍然建议加 judge。

如果你希望另一个 AI 来判断“这个 case 到底有没有通过”，可以加 judge：

```bash
node tests/runner/run-skill-eval.mjs memory-load \
  --case MEMLOAD-004 \
  --agent claude \
  --judge-agent claude
```

这会在 worker agent 跑完后，再启动一个独立 judge agent。judge 会读取：

- `cases.md` 里的原始 case spec，包括 Expected Behavior、Forbidden Behavior、Pass Assertions
- `evidence.json`
- `agent-output.txt`
- `agent-error.txt`
- 修改后的 `workspace/`

然后返回：

```json
{
  "status": "pass | fail | not_run",
  "reasons": [{"code": "short_code", "detail": "specific reason"}],
  "notes": "brief explanation"
}
```

runner 会把 judge 结果写入：

```text
<case-id>/analysis.json
<case-id>/analysis.md
```

`summary.md` 的 `Final` 列会使用 judge 的判断。

如果你有自己的 judge 命令：

```bash
WINGMAN_EVAL_JUDGE_CMD="claude-ds -p" \
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude
```

或者：

```bash
node tests/runner/run-skill-eval.mjs memory-load \
  --case MEMLOAD-004 \
  --agent claude \
  --judge-cmd "claude-ds -p"
```

注意：加 judge 会多调用一次 AI，所以成本大约会增加。第一次调试建议先跑单 case。

## 推荐第一次怎么跑

先跑一个单 case：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude
```

跑完后看终端输出里的 `runRoot`，例如：

```text
.eval-runs/memory-load/2026-05-27T15-00-00-000Z
```

然后读取：

```text
.eval-runs/memory-load/<run-id>/summary.md
.eval-runs/memory-load/<run-id>/MEMLOAD-004/analysis.md
.eval-runs/memory-load/<run-id>/MEMLOAD-004/evidence.json
.eval-runs/memory-load/<run-id>/MEMLOAD-004/agent-output.txt
.eval-runs/memory-load/<run-id>/MEMLOAD-004/agent-error.txt
.eval-runs/memory-load/<run-id>/MEMLOAD-004/workspace/
```

确认单 case 闭环正常后，再跑全量：

```bash
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

## 结果在哪里

每次运行会生成：

```text
.eval-runs/<skill>/<run-id>/
  run.json
  summary.json
  summary.md
  <case-id>/
    workspace/
    prompt.md
    evidence-template.json
    evidence.json
    analysis.json
    analysis.md
    agent-output.txt
    agent-error.txt
    agent-run.json
```

重点看：

- `summary.md`：给人看的汇总。
- `summary.json`：给脚本读的汇总。
- `<case-id>/evidence.json`：被测 agent 写出的结构化证据。
- `<case-id>/analysis.md`：runner 的分析视图，包含 worker status、analysis status、final status、agent stdout/stderr、workspace 文件列表。
- `<case-id>/analysis.json`：给脚本读的分析结果。
- `<case-id>/agent-output.txt`：被测 agent 的 stdout。
- `<case-id>/agent-error.txt`：被测 agent 的 stderr。
- `<case-id>/workspace/`：被测 agent 修改后的完整工作区，用来调试它到底改了什么。

`evidence-template.json` 是模板，不是结果。真实结果应该写到 `evidence.json`。

## summary 里的状态是什么意思

summary 现在区分三列：

- `Worker`：被测 agent 自己写在 `evidence.json` 里的状态。
- `Analysis`：runner 分析层给出的状态。
- `Final`：最终用于统计的状态。当前等于 `Analysis`。

默认分析层会检查 evidence 是否存在、是否合法，并运行 `method.md` 里可选的 `Built-in Checks`。如果没有内置规则命中，它会镜像 worker 状态，同时把 stdout/stderr、case spec 和 workspace 文件列表写入 `analysis.md`，方便人工或总控 Claude 继续分析。独立 judge 也接在 `analysis.json` 这层。

- `pass`：最终状态是通过。
- `fail`：最终状态是失败。
- `not_run`：最终状态是未运行。
- `missing_evidence`：没有生成 `evidence.json`。dry-run 时这很正常；真实运行时通常表示 agent 没按要求写结果。
- `invalid_evidence`：`evidence.json` 不是合法 JSON，或 `status` 不是 `pass | fail | not_run`。

如果你要调试失败 case，优先看这几个文件：

```text
<case-id>/analysis.md
<case-id>/evidence.json
<case-id>/agent-output.txt
<case-id>/agent-error.txt
<case-id>/workspace/
```

paired A/B case 还会有 effect：

- `improved`：baseline fail，skill pass。
- `regressed`：baseline pass，skill fail。
- `unchanged_pass`：两边都 pass。
- `unchanged_fail`：两边都 fail。
- `inconclusive`：缺 evidence、not_run、invalid 等无法判断。

## 当前可以直接跑的 suite

```bash
node tests/runner/run-skill-eval.mjs memory-setup --agent claude
node tests/runner/run-skill-eval.mjs memory-load --agent claude
node tests/runner/run-skill-eval.mjs memory-sync --agent claude
node tests/runner/run-skill-eval.mjs memory-clean --agent claude
node tests/runner/run-skill-eval.mjs data-contracts --agent claude
```

暂时不要把 `memory-token-efficiency` 当成完整自动化结果看。它需要 token 计量和 cache 可见性处理，runner 目前还没有做专门支持。

## 新增 skill 怎么测试

新增目录：

```text
tests/<new-skill>/
  method.md
  cases.md
```

`cases.md` 用普通 case：

````markdown
## TASK-001: Short title

### Initial Workspace

`README.md`

```markdown
# Demo
```

### Task Prompt

```text
Use new-skill to do the task.
```
````

或者用 paired A/B：

````markdown
## Pair TASK-001: Short title

### Shared Initial Workspace

`README.md`

```markdown
# Demo
```

### TASK-001A baseline_without_skill

#### Task Prompt

```text
Do the task without the skill.
```

### TASK-001B with_skill

#### Task Prompt

```text
Use new-skill to do the task.
```
````

`method.md` 里写 `Required JSON Output` 的 JSON 示例，runner 会从示例里的 case 对象推断 `evidence-template.json` 的扩展字段。

然后运行：

```bash
node tests/runner/run-skill-eval.mjs <new-skill> --agent claude
```

## .venv 是什么

`.venv` 是 Python virtual environment，中文一般叫 Python 虚拟环境。

它通常由下面命令创建：

```bash
python3 -m venv .venv
```

用途是把 Python 包安装在项目本地目录里，避免污染系统 Python。之前如果为了 Inspect AI 或 Phoenix 试过：

```bash
pip install inspect-ai
pip install arize-phoenix
```

就可能创建了 `.venv`。

现在这个 runner 是 Node 脚本：

```bash
node tests/runner/run-skill-eval.mjs ...
```

所以当前测试 skill 不需要 `.venv`，也不需要激活它。

如果确认以后不再用 Python 版 Inspect/Phoenix，可以删除本地 `.venv`：

```bash
rm -rf .venv
```

注意：`.venv` 是本地环境目录，不应该提交到 git。

## Runner 自测

修改 runner 后运行：

```bash
node --test tests/runner/run-skill-eval.test.mjs
```

这个测试不会启动 Claude 或 Codex，不会花模型费用。

# Wingman Skill Evaluation Runner

这个目录现在只保留一条主路径：用本地 runner 准备隔离 case、启动独立 agent 子进程、收集 evidence、生成汇总报告。

## 文件

- `run-skill-eval.mjs`：唯一 runner。支持 prepare、执行 Claude/Codex、收集 `evidence.json`、生成 `summary.json` 和 `summary.md`。
- `run-skill-eval.test.mjs`：runner 的 Node 内置测试。
- `USAGE.md`：日常使用说明，包括 Claude 里怎么测试、结果怎么看、`.venv` 是什么。
- `HANDOFF.md`：给后续 agent 的交接说明。

旧的 `skill/`、`memory/`、`inspect/`、`phoenix/` runner 已删除，避免维护多套入口。

## 推荐用法

在 Claude 交互界面里可以直接说：

```text
帮我测试 memory-load 这个 skill，用 Claude 跑全部测试用例，最后统计结果。
```

总控 agent 应运行：

```bash
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

测试单个 case：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude
```

用 Codex 作为被测 agent：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent codex
```

为 TypeScript case 准备共享 `tsc`：

```bash
node tests/runner/run-skill-eval.mjs align-contracts \
  --agent claude \
  --setup-toolchain typescript
```

TypeScript 只会安装到 `.eval-runs/.toolchains/typescript/`，不会污染根项目，也不会给每个 case workspace 都装一份 `node_modules`。

只准备目录、不启动 agent：

```bash
node tests/runner/run-skill-eval.mjs align-contracts --case ALIGN-002 --dry-run
```

## Claude 和 Codex 的角色

当前 Claude TUI 是总控 agent：它负责运行 runner、读取汇总、向用户解释结果。

runner 启动的子进程才是被测 agent：

- Claude 默认命令：`claude -p`
- Codex 默认命令：`codex exec --cd <workspace> --sandbox workspace-write --ask-for-approval never -`

每个 case 都在独立 workspace 里执行，避免同一个会话先读 skill 后污染 baseline。

如果你的本机需要魔改命令，可以覆盖：

```bash
WINGMAN_EVAL_AGENT_CMD="claude-ds -p" \
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

也可以直接传参：

```bash
node tests/runner/run-skill-eval.mjs memory-load \
  --agent claude \
  --agent-cmd "claude-ds -p"
```

## 产物

runner 会写入：

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

`.eval-runs/` 是运行产物目录，不要提交。

共享 toolchain 产物在：

```text
.eval-runs/.toolchains/typescript/
  setup.json
  setup-output.txt
  setup-error.txt
  node_modules/.bin/tsc
```

## 支持的 case 格式

### Paired A/B

任意 skill 都可以用 paired case。runner 看到 `## Pair ...` 就按 A/B 解析，不依赖 skill 名称：

````markdown
## Pair CASE-002: ...

### Shared Initial Workspace

`path/to/file.ts`

```ts
file content
```

### CASE-002A baseline_without_skill

#### Task Prompt

```text
baseline prompt
```

### CASE-002B with_skill

#### Task Prompt

```text
skill prompt
```
````

### Ordinary

任意 skill 都可以用 ordinary case。runner 会解析不带字母后缀的二级标题，跳过 `CASE-008A` 这类 comparison variant：

````markdown
## TASK-004: ...

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

`TASK-008A` 这类带字母后缀的 mini comparison case 会被普通 case runner 跳过。后续如果要测 token efficiency 或 mini comparison，再扩展同一个 runner，而不是恢复多套 runner。

## Evidence 模板

runner 会始终生成通用字段：

```json
{
  "id": "TASK-004",
  "skill": "some-skill",
  "status": "not_run",
  "files_read": [],
  "files_changed": [],
  "commands_run": [],
  "final_answer": "",
  "observed_output": "",
  "expected_behavior": "",
  "failure_reasons": []
}
```

如果 `tests/<skill>/method.md` 里有 `Required JSON Output` 的 `json` 示例，runner 会从示例里的 case 对象自动推断扩展字段，例如：

```json
{
  "cases": [
    {
      "id": "TASK-004",
      "status": "pass",
      "risk_level": "",
      "findings": []
    }
  ]
}
```

会让 `evidence-template.json` 自动带上：

```json
{
  "risk_level": "",
  "findings": []
}
```

因此新增 skill 时不要改 runner；优先在 `method.md` 写清楚 evidence JSON 结构，在 `cases.md` 保持 paired 或 ordinary 格式即可。

## 结果判定

runner 不做 numeric scoring。每个 case 有三层状态：

- `workerStatus`：被测 agent 在 `evidence.json` 里自报的状态。
- `analysisStatus`：runner 分析层产出的状态，写在 `analysis.json`。
- `status`：最终统计状态，当前等于 `analysisStatus`。

默认分析层会检查 evidence 是否存在、是否合法。没有额外规则时，它会镜像 worker 状态，并把调试材料写入 `analysis.md`：

- agent stdout/stderr
- 修改后的 workspace 文件列表
- analysis reasons/notes

如果 `method.md` 里有 `## Built-in Checks` JSON，runner 会在 worker 完成后对修改后的 workspace 跑这些轻量规则。规则命中会让 `analysisStatus/final status` 变成 `fail`，即使 worker 自报 `pass`。当前支持的规则是 `forbidden_patterns`：

```json
{
  "forbidden_patterns": {
    "CASE-001": [
      {
        "file": "src/example.ts",
        "pattern": "forbiddenRegex",
        "code": "failure_code",
        "detail": "Human-readable reason."
      }
    ]
  }
}
```

`align-contracts` 现在用这层检查 `ALIGN-002` 的语义漂移和 `ALIGN-004` 的伪造缺失字段。新增 skill 不需要写 checker；只有那些“明显不能出现”的代码形态值得加这种规则。

如果运行时传入 `--judge-agent claude` 或 `--judge-cmd "claude-ds -p"`，runner 会在 worker 完成后启动独立 judge agent。judge 读取 evidence、agent stdout/stderr 和修改后的 workspace，返回 `pass | fail | not_run`，并写入 `analysis.json/md`。summary 的最终统计使用 `analysis.json` 里的 `final_status`。

因此失败 case 的调试入口是：

- `<case-id>/analysis.md`
- `<case-id>/evidence.json`
- `<case-id>/agent-output.txt`
- `<case-id>/agent-error.txt`
- `<case-id>/workspace/`

summary 统计：

- `pass | fail | not_run`
- missing evidence
- invalid evidence

paired case 还会汇总 A/B pair effect：

- `improved`
- `regressed`
- `unchanged_pass`
- `unchanged_fail`
- `inconclusive`

真正的 pass/fail 依据仍然是各 skill 的 `method.md` 和 `cases.md`。

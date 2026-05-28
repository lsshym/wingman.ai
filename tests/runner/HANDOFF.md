# Wingman Skill Evaluation Handoff

本文是给后续 AI 智能体的交接说明。用户希望能在 Claude 里说“帮我测试某个 skill”，然后 agent 自动运行测试用例、收集结果、统计这个 skill 是否有效。

## 当前方向

不要再优先接 Inspect AI 或 Phoenix。它们已经从仓库删除。

当前主路径是一个轻量本地 runner：

```text
tests/<skill>/cases.md
        ↓
tests/runner/run-skill-eval.mjs
        ↓
.eval-runs/<skill>/<run-id>/<case-id>/
        ↓
独立 agent 子进程执行 prompt.md
        ↓
写 evidence.json
        ↓
生成 analysis.json + analysis.md
        ↓
summary.json + summary.md
```

Claude TUI 是总控 agent；`claude -p` 或 `codex exec` 是每个 case 的被测 agent 子进程。这样可以避免当前会话读过 skill 后污染 baseline。

## 当前文件结构

```text
tests/
  README.md
  align-contracts/
    method.md
    cases.md
  memory-setup/
    method.md
    cases.md
  memory-load/
    method.md
    cases.md
  memory-sync/
    method.md
    cases.md
  memory-clean/
    method.md
    cases.md
  memory-token-efficiency/
    method.md
    cases.md
  runner/
    README.md
    HANDOFF.md
    run-skill-eval.mjs
    run-skill-eval.test.mjs
```

`.eval-runs/` 是运行产物目录，已写入 `.gitignore`，不要提交其中内容。

## 已完成

### 1. 测试定义文件

每个 topic 都有：

- `method.md`：执行协议、通过条件、失败原因代码、输出 JSON 结构。
- `cases.md`：fixture workspace、任务 prompt、期望行为、禁止行为、通过断言。

这些文件现在只做：

- `status: pass | fail | not_run`
- evidence
- failure reasons
- observed vs expected

### 2. 单入口 runner

文件：

```text
tests/runner/run-skill-eval.mjs
tests/runner/run-skill-eval.test.mjs
```

用途：

- 读取 `tests/<skill>/cases.md`
- 看到 `## Pair ...` 就解析 paired A/B case
- 否则解析 ordinary case，普通 case 标题形如 `## TASK-001: ...`
- 跳过 `TASK-008A` 这类带字母后缀的 mini comparison variant
- 从 `tests/<skill>/method.md` 的 Required JSON 示例自动推断 evidence 扩展字段
- 为每个 case 生成隔离目录、workspace、prompt、evidence template
- 可启动 `claude -p` 或 `codex exec` 执行 case
- 收集 `evidence.json`
- 保留被测 agent 修改后的 `workspace/`
- 保留 `agent-output.txt` 和 `agent-error.txt`
- 生成 `analysis.json` 和 `analysis.md`
- 运行 `method.md` 中可选的 `Built-in Checks`，用轻量 forbidden pattern 捕获明显违规
- 生成 `summary.json` 和 `summary.md`

命令：

```bash
node tests/runner/run-skill-eval.mjs align-contracts --agent claude
node tests/runner/run-skill-eval.mjs align-contracts --case ALIGN-002 --agent claude
node tests/runner/run-skill-eval.mjs memory-load --agent claude
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent codex
node tests/runner/run-skill-eval.mjs memory-load --dry-run
node tests/runner/run-skill-eval.mjs align-contracts --agent claude --setup-toolchain typescript
```

默认 agent 命令：

```text
claude -> claude -p
codex  -> codex exec --cd <workspace> --sandbox workspace-write --ask-for-approval never -
```

TypeScript toolchain：

- 参数：`--setup-toolchain typescript`
- 安装位置：`.eval-runs/.toolchains/typescript/`
- worker prompt 会包含共享 `tsc` 路径。
- 不要在根项目安装 TypeScript，也不要让 worker 自己运行 `npm install`。
- 安装日志：`setup.json`、`setup-output.txt`、`setup-error.txt`。

可覆盖：

```bash
WINGMAN_EVAL_AGENT_CMD="claude-ds -p" \
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

或：

```bash
node tests/runner/run-skill-eval.mjs memory-load \
  --agent claude \
  --agent-cmd "claude-ds -p"
```

## 产物

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

`evidence-template.json` 是模板。被测 agent 应写 `evidence.json`，不要覆盖模板。

`analysis.md` 是调试入口：它记录 worker status、analysis status、final status、agent stdout/stderr、workspace 文件列表。失败时先看这个文件，再看 `workspace/` 里的改后代码。

可选 judge：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude --judge-agent claude
```

或：

```bash
WINGMAN_EVAL_JUDGE_CMD="claude-ds -p" \
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude
```

judge 会读取原始 case spec、evidence、agent output/error、修改后的 workspace，并把独立判断写入 `analysis.json/md`。summary 的 `Final` 使用 judge/analysis 的 `final_status`。

## 为什么 A/B 必须隔离

paired case 的对照实验需要：

- A：baseline，不加载被测 skill，prompt 也不提 skill。
- B：skill variant，明确使用被测 skill。

如果同一个会话先读了 skill，再跑 A，baseline 就被污染，评测无效。因此 runner 对每个 case 启动新的子进程 agent。

## 当前限制

1. Runner 现在有分析层，但默认不是 LLM judge。
   - 默认分析层检查 evidence 是否存在、是否合法。
   - 如果 `method.md` 有 `## Built-in Checks` JSON，会对修改后的 workspace 跑轻量 forbidden pattern，命中则判 fail。
   - 没有规则命中时，它会镜像 worker status。
   - 它会生成 `analysis.json` 和 `analysis.md`，把 case spec、stdout/stderr、workspace 文件列表等调试材料集中起来。
   - 独立 judge 仍然可选，用 `--judge-agent` 或 `--judge-cmd` 接入。

2. Runner 不做 numeric score。
   - 用户明确不需要 worker agent 自评分。
   - 当前只保留 `pass | fail | not_run`。

3. Mini comparison 和 token-efficiency 还没专门支持。
   - `MEMLOAD-008A/B`
   - `MEMSYNC-009A/B`
   - `MEMCLEAN-008A/B`
   - `memory-token-efficiency` 的 `MEMTOK-*`
   - 后续如果要做，应扩展 `run-skill-eval.mjs`，不要恢复旧的多 runner 架构。

4. 新增 skill 不需要改 runner。
   - `cases.md` 用 paired 或 ordinary 格式。
   - `method.md` 里的 JSON 示例决定 `evidence-template.json` 的扩展字段。
   - runner 不再依赖 `align-contracts`、`memory-load` 等固定 skill 名。

5. Markdown parser 是轻量正则解析。
   - 目前适配现有 cases 格式。
   - 如果 cases.md 结构变化，需要同步更新 runner。

6. `claude-ds` 可能是用户交互 shell 的 alias 或 wrapper。
   - 非交互 shell 未必能找到。
   - 默认使用 `claude -p`。
   - 需要时用 `WINGMAN_EVAL_AGENT_CMD` 或 `--agent-cmd` 覆盖。

## 测试

运行：

```bash
node --test tests/runner/run-skill-eval.test.mjs
```

基础 dry-run 验证：

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --dry-run
```

真实 agent 验证会花钱，并且依赖本机 Claude/Codex 登录状态。除非用户明确要求，不要随便跑全量真实 agent eval。

# Wingman Skill Evaluation Handoff

本文是给后续 AI 智能体的交接说明。用户后续可能不会带上当前对话上下文，请先阅读本文，再继续评测 runner 或 Inspect AI 接入工作。

## 背景

本仓库是 Wingman 插件仓库，核心内容是 Markdown skill：

- `align-contracts`
- `memory-setup`
- `memory-load`
- `memory-sync`
- `memory-clean`

用户想要一套“AI 智能体可读取并执行”的 skill 评测体系，用来测试这些 skill 是否真的改善 agent 行为。

早期只写了 `tests/<topic>/method.md` 和 `tests/<topic>/cases.md`，但用户实际测试后发现：

- 同一个 AI 会话里先读 skill 再跑 baseline，会污染 A/B 对照。
- 只靠 Markdown case 不足以保证隔离 workspace。
- 执行 case 的 agent 不应该给自己打分。
- 需要 runner 生成独立 prompt、workspace 和 evidence 模板。

因此现在的方向是：

```text
tests/<skill>/method.md + cases.md
        ↓
tests/runner/* prepare
        ↓
.eval-runs/<skill>/<run-id>/<case-id>/
        ↓
独立 agent 会话执行 prompt.md
        ↓
填写 evidence-template.json
        ↓
后续再接 Inspect AI / report / judge
```

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
    skill/
      eval-skill.mjs
      eval-skill.test.mjs
    memory/
      eval-memory.mjs
      eval-memory.test.mjs
    inspect/
      README.md
      eval_runs.py
      test_eval_runs.py
      wingman_eval.py
    phoenix/
      README.md
      export_phoenix.py
      test_export_phoenix.py
```

`.eval-runs/` 是运行产物目录，已写入 `.gitignore`，不要提交其中内容。

## 已完成

### 1. 测试定义文件

每个 topic 都有：

- `method.md`：执行协议、通过条件、失败原因代码、输出 JSON 结构。
- `cases.md`：fixture workspace、任务 prompt、期望行为、禁止行为、通过断言。

这些文件里已经移除了 numeric score / scoring 语义。现在只做：

- `status: pass | fail | not_run`
- evidence
- failure reasons
- observed vs expected

### 2. align A/B runner

文件：

```text
tests/runner/skill/eval-skill.mjs
tests/runner/skill/eval-skill.test.mjs
```

用途：

- 读取 `tests/align-contracts/cases.md`
- 解析 `## Pair ALIGN-xxx`
- 生成 A/B 隔离目录
- A 组 prompt 禁止使用 `align-contracts` 或任何 Wingman skill
- B 组 prompt 要求使用 `align-contracts`

命令：

```bash
node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002
node tests/runner/skill/eval-skill.mjs all align-contracts
```

生成：

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

### 3. memory ordinary-case runner

文件：

```text
tests/runner/memory/eval-memory.mjs
tests/runner/memory/eval-memory.test.mjs
```

用途：

- 读取 `tests/<memory-skill>/cases.md`
- 解析普通 `## MEM...-001` case
- 生成单 case 隔离目录
- 不处理 mini comparison A/B case

命令：

```bash
node tests/runner/memory/eval-memory.mjs prepare memory-load MEMLOAD-004
node tests/runner/memory/eval-memory.mjs all memory-load
```

`all` 当前会跳过 `MEMLOAD-008A/B` 这类 mini comparison variant，只准备普通 case。

### 4. Inspect AI bridge

文件：

```text
tests/runner/inspect/
```

用途：

- 读取 `.eval-runs/` 里已经 prepare 好的 prompt/workspace/evidence-template
- 暴露成 Inspect AI task/sample
- 为后续标准 eval log 和平台接入做准备

当前本机没有安装 `inspect-ai`。这个 bridge 是可选层，不影响 Node runner。

安装方式：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install inspect-ai
```

准备一个 case：

```bash
node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002 inspect-demo
```

运行 Inspect：

```bash
WINGMAN_EVAL_REPO="$PWD" \
inspect eval tests/runner/inspect/wingman_eval.py@prepared_wingman_eval
```

注意：当前 Inspect task 还不会自动启动 Codex/Claude/Gemini。它只是把 prepared prompt 变成 Inspect sample。

### 5. Phoenix bridge

文件：

```text
tests/runner/phoenix/
```

用途：

- 和 Inspect bridge 分开维护。
- 读取 `.eval-runs/` 里已经 prepare 好的 prompt/workspace/evidence-template。
- 导出 Phoenix 友好的 JSONL。
- 后续可接 Phoenix trace/eval SDK。

命令：

```bash
python3 tests/runner/phoenix/export_phoenix.py \
  --eval-runs .eval-runs \
  --out .eval-runs/phoenix/prepared-cases.jsonl
```

当前没有强制安装 Phoenix。后续可在单独评测环境中安装：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install arize-phoenix
```

## 为什么这样做

### A/B 必须隔离

`align-contracts` 的对照实验需要：

- A：baseline，不加载 `align-contracts`，prompt 也不提 skill。
- B：skill variant，明确使用 `align-contracts`。

如果同一个会话先读了 skill，再跑 A，baseline 就被污染，评测无效。

### memory 和 align 需要不同 runner

`align-contracts` 重点是 A/B contract drift 对照。

memory 重点是：

- memory state gate
- selective reading
- read/write routing
- current truth vs history
- safe cleanup
- token/context footprint

所以现在有两个 runner：

- `tests/runner/skill/`：paired A/B runner。
- `tests/runner/memory/`：ordinary memory case runner。

### 不让 worker 自评分

用户明确要求删掉评分。当前文件不再要求 worker agent 给自己 numeric score。worker 应只输出 evidence。后续 pass/fail 可以由 runner、judge 或人工根据 `method.md` 判定。

## 当前限制

1. 还没有 agent adapter。
   - runner 只 prepare prompt/workspace。
   - 还不会自动启动 Codex、Claude、Gemini。

2. 还没有 report merger。
   - 目前不会自动收集 `evidence-template.json` 的填写结果。
   - 不会合并 A/B evidence。

3. Inspect bridge 只是第一步接入。
   - 当前 scorer 是占位。
   - 还不能代表完整自动化评测。

4. memory mini comparison 和 token-efficiency 没有专门 runner。
   - `memory-load` 的 `MEMLOAD-008A/B`
   - `memory-sync` 的 `MEMSYNC-009A/B`
   - `memory-clean` 的 `MEMCLEAN-008A/B`
   - `memory-token-efficiency` 的 `MEMTOK-*`

5. Markdown parser 是轻量正则解析。
   - 目前适配现有 cases 格式。
   - 如果 cases.md 结构变化，需要同步更新 runner。

## 工具选择记录

用户担心 Inspect AI 可能不够热门或未来落伍。当前判断：

- Inspect AI 没有停滞，适合作为本地、代码化、sandbox/task/log 风格的 agent eval 桥接层。
- Inspect AI 不是最产品化的 dashboard 工具，因此不要把核心 runner 绑死在 Inspect 上。
- 当前做法是可选 bridge：`tests/runner/inspect/` 可以删换，不影响 `tests/runner/skill/` 和 `tests/runner/memory/`。

如果后续想要更产品化的可视化和 trace，优先考虑 Phoenix：

- Phoenix GitHub: https://github.com/Arize-ai/phoenix
- Phoenix 官方站点: https://phoenix.arize.com/
- 适合用途：trace 可视化、LLM observability、eval 结果排查、agent 读取文件/调用步骤的复盘。

Braintrust 和 LangSmith 也更产品化，但当前不建议立即接：

- Braintrust：实验管理和 scorer/UI 很成熟，但更像平台产品，可能需要账号、项目、API key 和远程数据上报。
- LangSmith：如果项目本身使用 LangChain/LangGraph 会很自然；本仓库目前不是 LangChain 项目，因此不作为第一优先。

建议路线：

```text
本地 runner 作为事实来源
  -> 可选 Inspect bridge: 标准 task/log
  -> 可选 Phoenix bridge: trace/可视化
  -> 以后需要团队实验管理再考虑 Braintrust
```

## 下一步建议

### Step 1: 安装 Inspect AI

用户准备回家后安装：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install inspect-ai
inspect --version
python3 -c "import inspect_ai; print(inspect_ai.__version__)"
```

然后跑：

```bash
node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002 inspect-demo

WINGMAN_EVAL_REPO="$PWD" \
inspect eval tests/runner/inspect/wingman_eval.py@prepared_wingman_eval
```

### Step 2: 决定 agent adapter

需要明确未来由谁执行 `prompt.md`：

- 手动开 Codex 新会话。
- Codex CLI 可脚本化执行。
- Claude Code / Gemini CLI。
- Inspect 自己调用普通模型，但这可能不是 coding-agent 文件系统行为。

不要在 adapter 未明确前，把 runner 写死到某个平台。

### Step 3: 增加 evidence collection

期望生成：

```text
.eval-runs/<skill>/<run-id>/<case-id>/
  raw-output.json
  evidence.json
```

可以先支持人工把 worker 输出保存为 `raw-output.json`，runner 校验它是否符合 evidence schema。

### Step 4: 增加 report merger

对 align：

```text
ALIGN-002A/evidence.json
ALIGN-002B/evidence.json
        ↓
pair-report.json
```

对 memory：

```text
MEMLOAD-001/evidence.json
MEMLOAD-002/evidence.json
        ↓
suite-report.json
```

### Step 5: 补 memory comparison / token runner

后续可新增：

```text
tests/runner/comparison/
tests/runner/token/
```

或在 `memory/` runner 里加专门子命令，但不要把普通 memory case 和 token-efficiency 混在同一套逻辑里。

## 常用验证命令

```bash
node --test tests/runner/**/*.test.mjs
python3 -m unittest discover -s tests/runner/inspect -p 'test_*.py'
npm run check:release
```

当前这些命令已经跑通过。

## 注意事项

- 不要提交 `.eval-runs/`。
- 不要恢复或修改用户无关改动。
- 如果新增 Python 依赖，优先文档化为可选 eval 环境，不要强制改变 Node-only 发布流程。
- 如果继续接平台工具，先保持现有 runner 命令兼容。

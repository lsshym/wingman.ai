# Phoenix Bridge

这个目录是 Phoenix/Arize 的可选接入层。它和 Inspect bridge 分开：

```text
tests/runner/inspect/
tests/runner/phoenix/
```

当前 Phoenix bridge 不依赖 Phoenix 包，也不会启动 Phoenix 服务。它先把 `.eval-runs/` 里的 prepared case 导出成 JSONL，后续可以导入 Phoenix 或用 Phoenix trace/eval SDK 继续处理。

## 先准备 eval run

例如准备一个 align A/B case：

```bash
node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002 phoenix-demo
```

或者准备 memory case：

```bash
node tests/runner/memory/eval-memory.mjs prepare memory-load MEMLOAD-004 phoenix-demo
```

## 导出 Phoenix 友好的 JSONL

```bash
python3 tests/runner/phoenix/export_phoenix.py \
  --eval-runs .eval-runs \
  --out .eval-runs/phoenix/prepared-cases.jsonl
```

输出每行包含：

- `skill`
- `run_id`
- `case_id`
- `prompt_path`
- `workspace_path`
- `evidence_template_path`
- `prompt`

## 后续安装 Phoenix

Phoenix GitHub:

https://github.com/Arize-ai/phoenix

常见安装方式请以 Phoenix 官方文档为准。后续可以在单独评测环境中安装，例如：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install arize-phoenix
```

## 当前限制

- 当前只导出 prepared case JSONL。
- 还没有启动 Phoenix server。
- 还没有写入 OpenTelemetry/OpenInference trace。
- 还没有自动执行 Codex、Claude、Gemini agent。

推荐下一步是：先用本地 runner 生成 `.eval-runs`，用本 bridge 导出 JSONL；确认 Phoenix 安装和数据展示方式后，再接 trace/eval SDK。

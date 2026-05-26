# Inspect AI Bridge

这是第二步 eval 工具接入层，用来把 `.eval-runs/` 里的 prepared prompt 暴露给 Inspect AI。

当前状态：**可选桥接层**。仓库本身不依赖 `inspect-ai`，本机没有安装也不影响 Node runner。

## 使用流程

先用本地 runner 准备运行目录：

```bash
node tests/runner/skill/eval-skill.mjs prepare align-contracts ALIGN-002 inspect-demo
```

然后在安装了 Inspect AI 的环境里运行：

```bash
WINGMAN_EVAL_REPO="$PWD" \
inspect eval tests/runner/inspect/wingman_eval.py@prepared_wingman_eval
```

Inspect task 会读取：

```text
.eval-runs/<skill>/<run-id>/<case-id>/prompt.md
.eval-runs/<skill>/<run-id>/<case-id>/workspace/
.eval-runs/<skill>/<run-id>/<case-id>/evidence-template.json
```

并把这些路径放到 sample metadata 里。

## 当前限制

- 这个 bridge 还不会自动启动 Codex、Claude、Gemini 这类 coding agent。
- 当前 scorer 只是占位，用于产生 Inspect 标准日志；最终 pass/fail 仍以 `method.md` 和 evidence 为准。
- 真正的 agent adapter 需要下一步单独实现。

## 为什么先这样接

这样可以先获得 Inspect 的标准 task/log 结构，同时保留现有 `.eval-runs/` 和手动独立 agent 会话流程。等 agent adapter 确定后，再把 worker 执行和 evidence 收集合并进 Inspect task。

# Wingman Hooks 说明

这份文档解释 Wingman 的 `hooks/` 目录为什么存在、每个文件负责什么，以及 hook 和 `/` 调用 skill 的区别。

## 先说最重要的结论

`/` 菜单能不能唤起 skill，主要取决于插件的 `skills/` 有没有被平台发现。

Hook 的作用不是让 `/using-wingman` 出现在菜单里。

Hook 的作用是：

```text
新 Agent 会话开始时，自动把 using-wingman 的完整说明注入上下文。
```

也就是说：

```text
没有 hook：
  用户仍然可以通过 /using-wingman 手动调用 skill。

有 hook：
  Agent 会话一开始就知道 Wingman 的入口协议，不需要用户先手动调用 /using-wingman。
```

## 为什么需要自动注入 using-wingman

`using-wingman` 不是普通任务 skill，它是 Wingman 的入口说明。

它告诉 Agent：

```text
Wingman 是什么
什么时候使用 memory-load
什么时候使用 memory-sync
什么时候使用 reuse-select
什么时候使用 reuse-catalog
什么时候使用 align-contracts
哪些 workflow 只能在用户明确要求时使用
项目规则和 Wingman 规则谁优先
```

如果没有自动注入，Agent 可能只知道有这些 skill 名称和 description，但不一定知道 Wingman 的完整工作方式。

所以 hook 的价值是：

```text
让每个新会话默认带上 Wingman 的入口协议。
```

## hooks 目录的 4 个文件

Wingman 现在和 Superpowers 一样，使用 4 个 hook 文件：

```text
hooks/
├── hooks-cursor.json
├── hooks.json
├── run-hook.cmd
└── session-start
```

它们不是重复的，各自面向不同平台和职责。

## `hooks/hooks-cursor.json`

这是 Cursor 专用 hook 配置。

内容：

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "./hooks/session-start"
      }
    ]
  }
}
```

它告诉 Cursor：

```text
新 Agent 会话开始时，执行 ./hooks/session-start
```

Cursor 使用小驼峰事件名：

```text
sessionStart
```

Cursor 插件 manifest 需要指向这个文件：

```json
{
  "skills": "./skills/",
  "hooks": "./hooks/hooks-cursor.json"
}
```

## `hooks/hooks.json`

这是 Claude Code 风格的 hook 配置。

内容：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ]
  }
}
```

它告诉 Claude Code：

```text
在 startup、clear、compact 这些会话启动类事件发生时，
运行 hooks/run-hook.cmd session-start。
```

Claude Code 使用大驼峰事件名：

```text
SessionStart
```

这里不直接运行 `session-start`，而是通过 `run-hook.cmd` 包一层，是为了兼容 Windows。

## `hooks/run-hook.cmd`

这是跨平台 wrapper。

它的目标是：

```text
在 Windows 上找到 bash，然后运行 hooks/session-start。
在 Unix/macOS/Linux 上直接用 bash 运行 hooks/session-start。
```

为什么文件名是 `.cmd`？

因为 Claude Code / Windows 环境下需要一个能被 Windows 识别的入口。

为什么不是 `session-start.sh`？

因为一些平台会对 `.sh` 文件做自动处理，比如自动在命令前加 `bash`。Superpowers 采用 extensionless 脚本名 `session-start`，可以避免这类干扰。

`run-hook.cmd` 是 polyglot 文件：

```text
Windows cmd.exe 会执行 batch 部分。
Unix shell 会把 batch 部分当作 heredoc 跳过，然后执行后面的 shell 部分。
```

## `hooks/session-start`

这是实际干活的脚本。

它做三件事：

1. 找到插件根目录。
2. 读取 `skills/using-wingman/SKILL.md`。
3. 输出平台需要的 JSON，让平台把内容注入 Agent 上下文。

核心输入：

```text
skills/using-wingman/SKILL.md
```

核心输出：

```text
additional context
```

## 为什么输出格式有三种

不同平台接收 hook 输出的字段名不同。

### Cursor

Cursor 设置环境变量：

```text
CURSOR_PLUGIN_ROOT
```

Cursor 期望输出：

```json
{
  "additional_context": "..."
}
```

注意字段名是 snake_case：

```text
additional_context
```

### Claude Code

Claude Code 设置环境变量：

```text
CLAUDE_PLUGIN_ROOT
```

Claude Code 期望输出：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "..."
  }
}
```

注意字段名是 camelCase：

```text
additionalContext
```

并且嵌套在：

```text
hookSpecificOutput
```

### Copilot CLI / SDK 标准格式 / 未知平台

如果既不是 Cursor，也不是 Claude Code，脚本输出：

```json
{
  "additionalContext": "..."
}
```

这是更通用的 SDK 风格字段。

## 为什么不能同时输出多个字段

Superpowers 的注释里提到：

```text
Claude Code 会同时读取 additional_context 和 hookSpecificOutput，
而且不会自动去重。
```

所以脚本不能一次性输出所有格式，否则某些平台可能会收到重复上下文。

正确做法是：

```text
检测当前平台环境变量
只输出当前平台会消费的那一种格式
```

Wingman 的 `session-start` 也是这个逻辑。

## 为什么要转义 JSON

`SKILL.md` 里有换行、引号、反斜杠等字符。

这些内容要放进 JSON 字符串，必须转义。

脚本会把：

```text
反斜杠
双引号
换行
回车
tab
```

转成 JSON 安全格式。

但有一个关键点：

```text
只转义 skill 文件内容，不要二次转义整个 session_context。
```

否则会变成：

```text
<EXTREMELY_IMPORTANT>\\nYou have Wingman...
```

这里的 `\\n` 是字面量，不是真换行。

正确效果应该是 JSON 解析后得到真实换行：

```text
<EXTREMELY_IMPORTANT>
You have Wingman.

---
name: using-wingman
...
```

## 怎么验证 Cursor 输出

```bash
cd "$HOME/.cursor/plugins/local/wingman"

CURSOR_PLUGIN_ROOT="$PWD" ./hooks/session-start | node -e '
let s = "";
process.stdin.on("data", d => s += d);
process.stdin.on("end", () => {
  const o = JSON.parse(s);
  console.log(Boolean(o.additional_context));
  console.log(o.additional_context.includes("\n# Using Wingman"));
});
'
```

期望：

```text
true
true
```

## 怎么验证 Claude Code 输出

```bash
cd "$HOME/.cursor/plugins/local/wingman"

CLAUDE_PLUGIN_ROOT="$PWD" ./hooks/session-start | node -e '
let s = "";
process.stdin.on("data", d => s += d);
process.stdin.on("end", () => {
  const o = JSON.parse(s);
  console.log(o.hookSpecificOutput.hookEventName);
  console.log(o.hookSpecificOutput.additionalContext.includes("\n# Using Wingman"));
});
'
```

期望：

```text
SessionStart
true
```

## 怎么验证通用输出

```bash
cd "$HOME/.cursor/plugins/local/wingman"

./hooks/session-start | node -e '
let s = "";
process.stdin.on("data", d => s += d);
process.stdin.on("end", () => {
  const o = JSON.parse(s);
  console.log(Boolean(o.additionalContext));
  console.log(o.additionalContext.includes("\n# Using Wingman"));
});
'
```

期望：

```text
true
true
```

## 怎么验证 wrapper

在 macOS/Linux 上：

```bash
cd "$HOME/.cursor/plugins/local/wingman"

CLAUDE_PLUGIN_ROOT="$PWD" ./hooks/run-hook.cmd session-start | node -e '
let s = "";
process.stdin.on("data", d => s += d);
process.stdin.on("end", () => {
  const o = JSON.parse(s);
  console.log(o.hookSpecificOutput.hookEventName);
});
'
```

期望：

```text
SessionStart
```

## 最后再强调一次

`/` 菜单调用 skill 和 hook 是两条链路。

### `/` 菜单链路

```text
plugin.json
  -> skills 字段
  -> skills/*/SKILL.md
  -> / 菜单可以调用 skill
```

### hook 自动注入链路

```text
plugin.json
  -> hooks 字段或平台默认 hooks.json
  -> sessionStart / SessionStart
  -> session-start
  -> using-wingman 注入上下文
```

所以：

```text
删除 hook，/ 菜单仍然可以调用 skill。
删除 hook，Agent 不会在会话开始时自动获得 using-wingman 完整入口说明。
```


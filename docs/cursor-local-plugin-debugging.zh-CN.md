# Cursor 本地插件排障记录：`ln -s`、symlink、skills 和 hooks

这份文档记录 Wingman Cursor 插件本地测试时为什么一开始识别不到，以及最终怎么修好。

重点结论先放前面：**这次最大的问题不是技能内容写错，而是 Cursor 本地插件加载对 symlink 不稳定。**

## 先说结论

Cursor 文档里提到可以这样本地测试插件：

```bash
ln -s /path/to/my-plugin ~/.cursor/plugins/local/my-plugin
```

这个命令在这次环境里不可靠。

更准确地说：

```text
不要把插件根目录直接 symlink 到 ~/.cursor/plugins/local/<plugin-name>
```

也就是不要依赖这种结构：

```text
~/.cursor/plugins/local/wingman -> /Users/apple/Documents/GitHub/wingman.ai
```

最终稳定方案是：

```text
~/.cursor/plugins/local/wingman/
```

必须是一个真实目录，里面也尽量放真实文件/目录副本，而不是 symlink。

## Symlink 是什么意思

`symlink` 是 symbolic link，中文一般叫“符号链接”。

可以把它理解成 macOS / Linux 里的“快捷方式”。

例如：

```bash
ln -s /Users/apple/Documents/GitHub/wingman.ai ~/.cursor/plugins/local/wingman
```

这条命令不是复制插件，而是创建一个指向真实插件目录的快捷方式：

```text
~/.cursor/plugins/local/wingman
  -> /Users/apple/Documents/GitHub/wingman.ai
```

终端里你 `cd ~/.cursor/plugins/local/wingman` 可能能进去，所以人看起来会觉得它就是一个目录。

但程序扫描目录时可能会区分：

```text
真实目录 directory
符号链接 symlink
```

这次 Cursor 的本地插件扫描就疑似踩在这里。

它可能用了类似这样的判断：

```js
fs.readdir(..., { withFileTypes: true })
dirent.isDirectory()
```

对于 symlink，`isDirectory()` 不一定返回 true。结果就是：

```text
人看着像目录
Cursor 扫描时不一定当目录
```

## 这次 `ln -s` 到底哪里有问题

原本期望：

```bash
ln -s /Users/apple/Documents/GitHub/wingman.ai ~/.cursor/plugins/local/wingman
```

然后 Cursor 应该从这个路径读到：

```text
~/.cursor/plugins/local/wingman/
├── .cursor-plugin/
│   └── plugin.json
├── skills/
└── hooks/
```

实际现象是：

```text
Cursor 没有稳定把这个 symlink 当成本地插件目录处理。
```

后来把顶层改成真实目录后：

```text
~/.cursor/plugins/local/wingman/
```

Cursor 能看到插件了，日志出现：

```text
loadUserLocalPlugin wingman loaded
```

但这还不够。

因为当时里面的 `skills`、`hooks` 等目录还是 symlink，导致后续仍然出现：

```text
插件看起来 loaded
但 Agent 里没有 Wingman skills/hooks
```

所以最后采取了最稳的方案：**本地插件目录下全部使用真实文件副本。**

## 最终工作的本地目录结构

最终本地测试目录是这样：

```text
~/.cursor/plugins/local/wingman/
├── .cursor-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks-cursor.json
│   └── session-start
├── skills/
│   ├── using-wingman/
│   │   └── SKILL.md
│   ├── memory-load/
│   │   └── SKILL.md
│   ├── memory-sync/
│   │   └── SKILL.md
│   ├── memory-setup/
│   │   └── SKILL.md
│   ├── align-contracts/
│   │   └── SKILL.md
│   ├── reuse-select/
│   │   └── SKILL.md
│   ├── reuse-catalog/
│   │   └── SKILL.md
│   ├── refactor/
│   │   └── SKILL.md
│   └── refactor-types/
│       └── SKILL.md
├── assets/
├── README.md
├── LICENSE
├── PRIVACY.md
└── TERMS.md
```

这些关键路径都应该是：

```text
symlink=false
```

## 可复制的本地安装命令

在插件仓库根目录执行：

```bash
repo="$PWD"
local_root="$HOME/.cursor/plugins/local/wingman"

mkdir -p "$local_root"

rm -rf "$local_root/.cursor-plugin" \
       "$local_root/skills" \
       "$local_root/hooks" \
       "$local_root/assets"

cp -R "$repo/.cursor-plugin" "$local_root/.cursor-plugin"
cp -R "$repo/skills" "$local_root/skills"
cp -R "$repo/hooks" "$local_root/hooks"

if [ -d "$repo/assets" ]; then
  cp -R "$repo/assets" "$local_root/assets"
fi

for f in README.md LICENSE PRIVACY.md TERMS.md; do
  rm -f "$local_root/$f"
  if [ -f "$repo/$f" ]; then
    cp "$repo/$f" "$local_root/$f"
  fi
done

chmod +x "$local_root/hooks/session-start"
```

然后在 Cursor 里执行：

```text
Developer: Reload Window
```

再新开一个 Agent 会话。

## 怎么验证不是 symlink

运行：

```bash
node - <<'NODE'
const fs = require('fs');

for (const p of [
  `${process.env.HOME}/.cursor/plugins/local/wingman`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/.cursor-plugin`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/.cursor-plugin/plugin.json`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/hooks`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/hooks/hooks-cursor.json`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/hooks/session-start`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/skills`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/skills/using-wingman`,
  `${process.env.HOME}/.cursor/plugins/local/wingman/skills/using-wingman/SKILL.md`,
]) {
  const st = fs.lstatSync(p);
  console.log(`${p}: dir=${st.isDirectory()} file=${st.isFile()} symlink=${st.isSymbolicLink()}`);
}
NODE
```

期望关键路径都是：

```text
symlink=false
```

如果看到：

```text
symlink=true
```

说明它还是快捷方式，不是真文件/真目录。

## 怎么验证 Cursor 真的吃到了 skills

Cursor Agent 日志里有一条很关键：

```text
CursorPluginsAgentSkillsService ... skillCount:14
```

这次环境里，`14` 正好是 Superpowers 的 14 个 skills。

Wingman 有 9 个 skills。

所以如果 Superpowers + Wingman 都被 Agent runtime 吃到，理想结果应该是：

```text
skillCount:23
```

如果一直是：

```text
skillCount:14
```

说明：

```text
Wingman 插件可能 loaded 了
但 Wingman skills 没进 Agent skills 服务
```

这个现象就是 symlink 问题最容易造成的迷惑点。

## 这和 hook 有关系吗

有关系，但要分清楚两件事：

```text
/ 菜单能不能唤起 skill
Agent 会话启动时会不会自动知道 using-wingman
```

这两件事不是一回事。

### `/` 唤起 skill 不依赖 hook

如果你删除 hook 后，仍然可以通过 `/` 唤起 Wingman skill，这个现象是正常的。

它说明：

```text
Cursor 已经发现了 plugin.json
Cursor 已经发现了 skills 目录
所以 / 菜单可以列出并调用 skill
```

也就是说，`/` 方式调用 skill 的关键是：

```json
{
  "skills": "./skills/"
}
```

以及本地目录结构必须能被 Cursor 正确扫描到。

这部分主要和 symlink 问题有关，和 hook 没有直接关系。

### Hook 的作用是自动注入入口说明

Hook 的作用不是让 `/` 菜单出现 skill。

Hook 的作用是：

```text
新 Agent 会话开始时
自动运行 hooks/session-start
把 using-wingman 的说明注入到 Agent 上下文
```

所以有 hook 时，即使用户还没有手动输入 `/using-wingman`，Agent 也可以在会话一开始就知道：

```text
这里有 Wingman
using-wingman 是入口协议
其他 Wingman skills 应该按需使用
```

没有 hook 时，只要 skills 被发现，用户仍然可以手动通过 `/` 调用 skill。

### 这次真正卡住的优先级

这次排障优先级其实是：

```text
第一层：Cursor 能不能发现本地插件目录
第二层：Cursor 能不能发现 skills
第三层：/ 菜单能不能调用 skill
第四层：hook 能不能在会话启动时自动注入 using-wingman
```

一开始主要卡在前两层：本地目录 symlink 让 Cursor 没有稳定发现插件组件。

hook 是后面为了对齐 Superpowers 的启动体验加上的，不是 `/` 调用 skill 的必要条件。

## 为什么要参考 Superpowers

因为 Superpowers 可以正常工作，而且它也没有依赖 `commands/` 来实现启动时的 `using-superpowers` 入口说明。

它的关键机制是：

```text
Superpowers plugin
├── .cursor-plugin/plugin.json
├── skills/
│   └── using-superpowers/
│       └── SKILL.md
└── hooks/
    ├── hooks-cursor.json
    └── session-start
```

Superpowers 的 `.cursor-plugin/plugin.json` 里声明：

```json
{
  "skills": "./skills/",
  "hooks": "./hooks/hooks-cursor.json"
}
```

它的 `hooks/hooks-cursor.json` 注册：

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

然后 `hooks/session-start` 在新 Agent 会话启动时，把 `using-superpowers` 技能内容作为 `additional_context` 注入进去。

注意：这解释的是“为什么 Superpowers 的入口说明会自动进入会话”，不是说 `/` 菜单调用 skill 必须依赖 hook。

所以 Wingman 如果想获得同样的“会话启动自动知道入口协议”的体验，也可以采用同样方式：

```text
sessionStart -> 注入 skills/using-wingman/SKILL.md
```

## 仓库里改了什么

### `.cursor-plugin/plugin.json`

加入：

```json
{
  "skills": "./skills/",
  "hooks": "./hooks/hooks-cursor.json"
}
```

`skills` 用来告诉 Cursor 技能目录在哪里。

`hooks` 用来告诉 Cursor hook 配置在哪里。它是为了自动注入入口说明，不是为了让 `/` 菜单发现 skill。

### `hooks/hooks-cursor.json`

新增：

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

这表示：

```text
新 Agent 会话开始时，运行 ./hooks/session-start
```

### `hooks/session-start`

新增脚本。

它读取：

```text
skills/using-wingman/SKILL.md
```

然后输出：

```json
{
  "additional_context": "..."
}
```

Cursor 会把这个 `additional_context` 合并进 Agent 上下文。

## Hook 输出也修过一个问题

初版 Wingman hook 输出曾经长这样：

```text
<IMPORTANT>\\nYou have Wingman.\\n\\n...
```

这里的 `\\n` 是字面量，不是真换行。

这会让 Agent 收到的内容不像正常 Markdown。

修复后采用和 Superpowers 一样的方式：

```bash
using_wingman_escaped=$(escape_for_json "$using_wingman_content")
session_context="<EXTREMELY_IMPORTANT>\nYou have Wingman.\n\n${using_wingman_escaped}\n</EXTREMELY_IMPORTANT>"

printf '{\n  "additional_context": "%s"\n}\n' "$session_context"
```

关键点：

```text
只转义技能文件内容，不要二次转义整个 session_context。
```

## 怎么验证 hook 输出

```bash
cd "$HOME/.cursor/plugins/local/wingman"

./hooks/session-start | node -e '
let s = "";
process.stdin.on("data", d => s += d);
process.stdin.on("end", () => {
  const o = JSON.parse(s);
  console.log("json ok");
  console.log("has actual heading newline:", o.additional_context.includes("\n# Using Wingman"));
  console.log("has literal slash-n heading:", o.additional_context.includes("\\n# Using Wingman"));
});
'
```

期望：

```text
json ok
has actual heading newline: true
has literal slash-n heading: false
```

## 怎么看 hook 是否真的执行

Hook 日志位置类似：

```text
~/Library/Application Support/Cursor/logs/.../output_*/cursor.hooks.workspaceId-*.log
```

只有 Superpowers 时：

```text
Found 1 hook(s) to execute for step: sessionStart
Running script in directory: .../superpowers/...
```

Wingman 也生效时：

```text
Found 2 hook(s) to execute for step: sessionStart
Running script in directory: ~/.cursor/plugins/local/wingman
Running script in directory: .../superpowers/...
```

## 最终排障链路

如果只关心 `/` 菜单能不能唤起 skill，链路是：

```text
真实本地插件目录
  -> Cursor 能识别 plugin.json
  -> Cursor 能发现 skills
  -> / 菜单能列出并调用 skill
```

如果还希望新 Agent 会话一开始就自动知道 Wingman 入口协议，链路是：

```text
真实本地插件目录
  -> Cursor 能识别 plugin.json
  -> Cursor 能发现 skills
  -> Cursor 能发现 hooks
  -> 新 Agent 会话触发 sessionStart
  -> session-start 输出 additional_context
  -> using-wingman 注入 Agent 上下文
  -> Agent 不需要用户先手动 /using-wingman，也能知道 Wingman 入口说明
```

这次主要卡点：

```text
ln -s 创建的是 symlink
Cursor 对 symlink 插件目录/组件目录识别不稳定
导致插件看起来 loaded，但 Agent 里没有完整识别 skills/hooks
```

## 最终建议

本地测试 Cursor 插件时，先不要用：

```bash
ln -s /path/to/my-plugin ~/.cursor/plugins/local/my-plugin
```

优先使用：

```bash
mkdir -p ~/.cursor/plugins/local/my-plugin
cp -R /path/to/my-plugin/.cursor-plugin ~/.cursor/plugins/local/my-plugin/
cp -R /path/to/my-plugin/skills ~/.cursor/plugins/local/my-plugin/
cp -R /path/to/my-plugin/hooks ~/.cursor/plugins/local/my-plugin/
```

如果后续为了迭代速度一定要用 symlink，也建议先确认当前 Cursor 版本确实支持：

```text
顶层插件目录 symlink
组件目录 symlink
SKILL.md 文件 symlink
hook 文件 symlink
```

否则排障时优先切回真实文件副本。

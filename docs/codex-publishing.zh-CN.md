# Codex 插件本地测试与发布说明

本文记录 Wingman 目前面向 Codex 的测试和发布流程。

## 先把几个概念分开

Codex 插件有三层东西：

1. **插件本体**：真正被安装的目录，里面必须有 `.codex-plugin/plugin.json`，通常还会有 `skills/`、`assets/` 等。
2. **Marketplace 清单**：`.agents/plugins/marketplace.json`，它不是插件本体，只是告诉 Codex “有哪些插件、插件目录在哪里”。
3. **Codex 安装缓存**：用户安装插件后，Codex 会把插件复制到 `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`，之后从缓存加载。

官方文档要求 repo marketplace 的插件通常放在 `$REPO_ROOT/plugins/<plugin-name>`，然后让 `source.path` 指向这个插件目录。

## Wingman 当前本地测试结构

源码仓库保留真实内容在根目录：

```text
wingman.ai/
  .codex-plugin/plugin.json
  skills/
  assets/
  .agents/plugins/marketplace.json
```

为了符合 Codex marketplace 的读取模型，仓库里提交了一个 Codex payload 副本：

```text
wingman.ai/
  plugins/
    wingman/
      .codex-plugin/plugin.json
      skills/
      assets/
      README.md
      LICENSE
      PRIVACY.md
      TERMS.md
```

`.agents/plugins/marketplace.json` 指向这个副本：

```json
"source": {
  "source": "local",
  "path": "./plugins/wingman"
}
```

每次修改根目录的 `.codex-plugin/`、`skills/`、`assets/` 或 policy 文件后，都要运行 `npm run prepare:codex-local`，把变更同步到 `plugins/wingman/`。

## 安装 Codex CLI

OpenAI Codex CLI 官方 README 提供两种常用安装方式：

```bash
npm install -g @openai/codex
```

或 macOS Homebrew：

```bash
brew install --cask codex
```

安装后确认：

```bash
codex --version
```

然后运行：

```bash
codex
```

按提示登录 ChatGPT 账号或配置 API Key。

## 本地测试 Wingman

在 `wingman.ai` 仓库里执行：

```bash
npm test
npm run prepare:codex-local
```

第一条检查插件文件、skill、manifest、hook 和测试资产。第二条把当前源码同步到 `plugins/wingman/`，供 Codex marketplace 读取。

然后把这个仓库作为本地 marketplace 加到 Codex：

```bash
codex plugin marketplace add /Users/apple/Documents/GitHub/wingman.ai
```

如果之前已经添加过但路径改了，先移除再添加：

```bash
codex plugin marketplace remove wingman-marketplace
codex plugin marketplace add /Users/apple/Documents/GitHub/wingman.ai
```

最后重启 Codex，打开：

```text
/plugins
```

在 marketplace 下拉/来源选择里选 `Wingman Marketplace`，应该能看到 `Wingman`。安装或启用后，新开会话测试：

```text
Use /refactor to analyze this file. Produce the diagnostic table first and wait for approval before making code changes.
```

预期：只输出诊断表，不直接编辑代码。

## 推荐安装方式

给普通用户使用时，推荐用安装脚本，而不是只让用户手动运行 `codex plugin marketplace add`：

```bash
curl -fsSLO https://raw.githubusercontent.com/lsshym/wingman.ai/main/scripts/install-codex-wingman.sh
bash install-codex-wingman.sh
```

脚本会做四件事：

1. 执行 `codex plugin marketplace add lsshym/wingman.ai`。
2. 检查 Codex 是否自动创建了 `~/.codex/plugins/cache/wingman-marketplace/wingman/1.0.0/`。
3. 如果 Codex 没有自动创建 cache，就从 `~/.codex/.tmp/marketplaces/wingman-marketplace/plugins/wingman/` 复制一份过去。
4. 确保 `~/.codex/config.toml` 里有：

```toml
[plugins."wingman@wingman-marketplace"]
enabled = true
```

最后用户重启 Codex 即可。

## 如果 `/plugins` 看不到 Wingman

按这个顺序排查：

1. 确认 `plugins/wingman/.codex-plugin/plugin.json` 存在：

```bash
find plugins/wingman -maxdepth 3 -type f | sort
```

2. 确认 marketplace 指向 `./plugins/wingman`，不是 `./`：

```bash
cat .agents/plugins/marketplace.json
```

3. 确认 Codex 配置里有 marketplace：

```bash
cat ~/.codex/config.toml
```

应能看到：

```toml
[marketplaces.wingman-marketplace]
source_type = "local"
source = "/Users/apple/Documents/GitHub/wingman.ai"
```

4. 本地 marketplace 不能用 `codex plugin marketplace upgrade` 刷新。它只适合 Git marketplace。路径变化后要 remove 再 add。

5. 重启 Codex，再进 `/plugins`。注意 Codex 插件目录可能有 marketplace 来源选择，别只看官方 `openai-curated`。

## 发布给别人使用

当前采用方案 B：直接把 `wingman.ai` 作为公开 Codex marketplace 仓库。用户安装：

```bash
curl -fsSLO https://raw.githubusercontent.com/lsshym/wingman.ai/main/scripts/install-codex-wingman.sh
bash install-codex-wingman.sh
```

等 Codex 官方开放明确收录渠道，或需要更干净的 marketplace 仓库时，再拆出单独仓库，例如：

```text
wingman-codex-plugins/
  .agents/plugins/marketplace.json
  plugins/
    wingman/
      .codex-plugin/plugin.json
      skills/
      assets/
      README.md
      LICENSE
      PRIVACY.md
      TERMS.md
```

如果拆出单独仓库，别人可以这样添加：

```bash
codex plugin marketplace add lsshym/wingman-codex-plugins
```

这个仓库可以用同步脚本更新：

```bash
npm run sync:codex -- --dest /path/to/wingman-codex-plugins
```

`sync:codex` 会把当前 Wingman 的 Codex payload 同步到目标仓库的 `plugins/wingman/`，并排除 `.agents/`、`.claude-plugin/`、`.cursor-plugin/`、`hooks/`、`tests/`、`scripts/` 等开发/其他平台文件。

如果目标 marketplace 仓库还没 clone，本脚本也支持 bootstrap，但需要显式提供目标 fork 或 remote：

```bash
npm run sync:codex -- --bootstrap --fork your-org/wingman-codex-plugins
```

## Superpowers 是怎么做的

Superpowers 的公开源码仓库是 `obra/superpowers`。它没有 `.agents` 目录，因为它不是 marketplace 仓库；它是插件源码仓库。

它有一个同步脚本，会把源码同步到另一个 Codex 插件集合仓库的 `plugins/superpowers/`。脚本里写的目标是 `prime-radiant-inc/openai-codex-plugins`，但这个目标仓库当前看起来不是公开可访问的。

所以可以理解成：

```text
obra/superpowers
  源码仓库
  ↓ sync script
prime-radiant-inc/openai-codex-plugins
  marketplace / 发布仓库，可能是私有
  ↓
Codex Plugin Directory
```

Wingman 现在可以走同样的形态：`wingman.ai` 保持为源码仓库，另建一个 `wingman-codex-plugins` 作为公开 marketplace 仓库。

## 参考

- Codex CLI README: https://github.com/openai/codex
- Codex 插件文档: https://developers.openai.com/codex/plugins/build
- Superpowers 源码仓库: https://github.com/obra/superpowers
- Superpowers Codex 同步脚本: https://github.com/obra/superpowers/blob/main/scripts/sync-to-codex-plugin.sh

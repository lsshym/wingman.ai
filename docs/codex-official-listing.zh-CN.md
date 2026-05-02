# Codex 官方插件目录收录申请指南

本文记录 Wingman 申请进入 Codex 官方插件目录的准备材料和跟进路径。

## 当前结论

截至目前，OpenAI 没有公开文档化的 Codex 插件官方目录自助提交入口。

也就是说，目前没有看到类似下面这样的官方入口：

- Submit plugin
- Publish to Codex Plugin Directory
- Apply for listing
- Plugin review form
- Marketplace submission

Wingman 现在可以通过 GitHub marketplace 自主分发，但如果要出现在 Codex 官方 `/plugins` 目录里，需要联系 OpenAI/Codex 团队获取收录流程。

## 当前可用分发方式

Wingman 已经可以通过公开 GitHub marketplace 安装：

```bash
curl -fsSLO https://raw.githubusercontent.com/lsshym/wingman.ai/main/scripts/install-codex-wingman.sh
bash install-codex-wingman.sh --self-delete
```

这不是官方目录收录。它的作用是让用户在官方收录前也能安装和测试 Wingman。

## 申请材料

联系官方前，准备下面这份材料。

```text
Plugin name:
Wingman

Repository:
https://github.com/lsshym/wingman.ai

Category:
Coding

Short description:
Execution, memory, and reuse workflows for coding agents.

What it does:
Wingman is a Codex plugin that packages engineering workflow skills for project memory, contract alignment, reuse decisions, and explicit refactor workflows.

Why it belongs in the Codex Plugin Directory:
Wingman helps Codex work more safely in existing codebases by preserving project context, aligning API/type/UI contracts, avoiding duplicate implementations, and using approval-first refactor workflows.

Install / test:
curl -fsSLO https://raw.githubusercontent.com/lsshym/wingman.ai/main/scripts/install-codex-wingman.sh
bash install-codex-wingman.sh --self-delete

Validation:
npm test passes.
Codex marketplace install has been tested.
The installer includes a cache fallback for current third-party marketplace install friction.

Privacy:
Wingman is skill/prompt content. It does not require a third-party service account or collect user data.

Policy links:
https://github.com/lsshym/wingman.ai/blob/main/PRIVACY.md
https://github.com/lsshym/wingman.ai/blob/main/TERMS.md
```

## 联系渠道

建议按这个优先级尝试。

### 1. OpenAI Developer Community

入口：

```text
https://developers.openai.com/community/
```

建议标题：

```text
How can third-party developers submit Codex plugins to the official Plugin Directory?
```

建议正文：

```text
Hi, I built a Codex plugin called Wingman and would like to submit it for inclusion in the official Codex Plugin Directory.

Repository:
https://github.com/lsshym/wingman.ai

Wingman packages engineering workflow skills for project memory, contract alignment, reuse decisions, and explicit refactor workflows.

It is currently installable as a GitHub marketplace:
curl -fsSLO https://raw.githubusercontent.com/lsshym/wingman.ai/main/scripts/install-codex-wingman.sh
bash install-codex-wingman.sh --self-delete

Is there an official submission or review process for third-party Codex plugins?
```

### 2. OpenAI Support

入口：

```text
https://help.openai.com/
```

建议问题：

```text
I built a Codex plugin and want to submit it for inclusion in the official Codex Plugin Directory. Is there a submission or review process?

Repository:
https://github.com/lsshym/wingman.ai
```

### 3. GitHub openai/codex

入口：

```text
https://github.com/openai/codex
```

如果仓库开启 Issues 或 Discussions，可以提问：

```text
How can third-party developers submit Codex plugins to the official Plugin Directory?
```

附上 Wingman 仓库和安装命令。

### 4. Business / Enterprise / Edu 支持渠道

如果使用 Business、Enterprise 或 Edu workspace，通过管理员或客户支持渠道咨询会更容易得到明确答复。

建议问题：

```text
We have a Codex plugin we would like to submit for official directory review. What is the process for third-party plugin listing?
```

## 跟进策略

1. 先保持 GitHub marketplace 安装可用。
2. 在 README 明确说明 Wingman 当前未上架官方目录，需要通过 GitHub marketplace 安装。
3. 收集真实用户安装反馈，尤其是 `/plugins` 看不到插件、cache fallback 是否生效等问题。
4. 每次发布前运行：

```bash
npm run prepare:codex-local
npm test
```

5. 如果官方回复要求单独 marketplace 仓库，再拆出类似：

```text
wingman-codex-plugins/
  .agents/plugins/marketplace.json
  plugins/wingman/
```

当前仓库已有 `npm run sync:codex`，可以用于同步到这类目标仓库。

## 参考链接

- Codex CLI: https://github.com/openai/codex
- Codex 插件文档: https://developers.openai.com/codex/plugins/build
- OpenAI Developer Community: https://developers.openai.com/community/
- OpenAI Help Center: https://help.openai.com/
- Wingman Codex 发布说明: ./codex-publishing.zh-CN.md

# Wingman 测试体系路线图

本文记录 Wingman 当前测试体系的设计理由、已经覆盖的发布前检查，以及后续如何逐步补齐 Superpowers 风格的运行时与行为测试。

## 背景

Superpowers 项目有一套更完整的 `tests/`，它不仅测试插件文件结构，还覆盖平台加载、skill 触发、显式 skill 请求、subagent workflow 等行为。

Wingman 目前已经补了一版测试，但没有 1:1 复制 Superpowers 的完整测试体系。当前目标是先保证插件包结构、元数据和基础 skill 约束稳定，再逐步扩展到平台运行时测试和 agent 行为测试。

## 当前设计

Wingman 的现有测试集中在发布前静态校验和轻量行为约束上。

已经新增：

- `scripts/check-plugin.mjs`
- `tests/plugin/plugin-check.test.mjs`
- `tests/package/package-fixtures.test.mjs`
- `tests/behavior/behavior-assets.test.mjs`
- `npm test`
- `npm run test:plugin`
- `npm run test:package`
- `npm run test:behavior`
- `npm run test:all`
- `npm run check:plugin`

当前覆盖内容：

- 检查关键 JSON 是否存在且合法。
- 检查 `.claude-plugin/marketplace.json` 是否包含 `owner.name` 和 `owner.email`。
- 检查 Claude、Codex、Cursor plugin manifest 的基础字段。
- 检查 `package.json` 的 name/version 是否与平台 manifest 一致。
- 检查 `skills/`、hooks、assets 路径是否存在。
- 检查所有 `skills/*/SKILL.md` 是否有合法 frontmatter。
- 检查 skill `description` 是否以 `Use when` 开头，保持 trigger-focused 写法。
- 检查 `using-wingman` 是否显式覆盖所有已打包 skill。
- 检查 `memory-setup`、`refactor`、`refactor-types` 这类显式 workflow 是否仍然保留“必须用户明确请求”的 gating。
- 检查 `package.json.files` 是否覆盖发布包必须包含的 manifests、skills、hooks、assets 和根文档。
- 当 manifest 链接到 `PRIVACY.md` 或 `TERMS.md` 时，检查这些 policy 文件是否进入发布包。
- 检查 Cursor、Codex、Claude/Codex marketplace wrapper 是否保持本地安装布局。
- 执行 hook smoke test，验证 `hooks/session-start` 和 `hooks/run-hook.cmd session-start` 能返回 Wingman context JSON。
- 检查 `tests/skill-triggering/` 和 `tests/explicit-skill-requests/` 的 prompt、expectation、人工审核记录是否完整。

## 为什么这样设计

当前设计优先解决 Wingman 最容易出问题、也最适合自动化拦截的部分：发布前结构和元数据错误。

1. 先拦截真实发生过的问题

   Wingman 已经出现过 marketplace manifest 缺字段导致发布或加载失败的问题。静态校验能直接防止这类问题再次发生。

2. 先建立最小可运行测试骨架

   项目此前没有 `npm test`、没有测试目录、没有 test runner。当前方案先建立轻量、稳定、可持续扩展的测试入口，避免一开始引入过重的测试 harness。

3. Superpowers 的测试不能直接复制

   Superpowers 的测试绑定它自己的 skill 体系、平台适配、brainstorm server、subagent workflow。直接复制会测错对象，甚至让 Wingman 为不存在的能力维护测试。

4. 当前测试稳定、快、无外部依赖

   现在的测试只依赖 Node.js，不需要真的启动 Claude Code、Codex、Cursor、OpenCode，也不需要网络或模型调用。它适合放进 CI 和发布前检查。

5. 先测“插件包是否健康”，再测“agent 是否按预期行动”

   Superpowers 的完整测试包含 agent 行为测试。这类测试更有价值，但也更脆、更贵、更难维护。Wingman 应先保证包结构正确，再扩展行为测试。

## 尚未覆盖

当前测试还没有完全对标 Superpowers，主要缺少以下能力：

- live `skill-triggering` 行为测试：还没有用真实 Claude Code、Codex 或 Cursor runner 自动验证模型是否会触发 `memory-load`、`reuse-select`、`align-contracts` 等 skill。
- live `explicit-skill-requests` 运行时测试：还没有用真实 agent 日志验证用户明确说“使用 memory-sync / refactor”时，agent 是否真的先加载并遵守对应 skill。
- 平台运行时加载测试：还没有真的启动 Claude Code、Cursor、Codex、OpenCode 去验证插件能被平台发现和加载。
- marketplace 安装测试：还没有从 GitHub marketplace source 模拟安装 Wingman。
- 跨平台同步测试：还没有类似 Superpowers `codex-plugin-sync` 的测试，验证多个平台 wrapper 是否从同一个内容源同步生成。
- CI 集成：测试命令已经存在，但还没有 GitHub Actions 或发布前自动 gate。
- 文档一致性测试：README、`using-wingman`、manifest 描述之间目前只做了很少的覆盖检查。

## 推进计划

建议分阶段推进，不一次性把 Superpowers 的复杂度全部搬过来。

### Phase 1: 强化当前静态检查

- 已完成：增加负面 fixtures，覆盖 README 漏 skill、alias 漏 README/skill 说明、trigger contract 漏关键触发语言。
- 已完成：检查 README 是否覆盖所有 `skills/` 目录中的 skill。
- 已完成：检查当前正式 alias，比如 `/reuse-catalog`、`/reuse-select`、`/memory-setup` 是否有对应 skill 或命令说明。
- 已完成：增加轻量 trigger contract 检查，确保 `memory-load`、`align-contracts`、`reuse-select` 等核心 skill 的触发语义仍然留在 skill 文本中。
- 已完成：扩大 fixtures 到完整 package 级别，覆盖 good package、missing owner、missing skill、invalid path、invalid frontmatter 等端到端场景。

### Phase 2: 增加平台与包检查

- 已完成：增加 packaging check，确认发布包 allowlist 包含 manifest、skills、hooks、assets 和根文档；policy 文件按 manifest 链接条件检查。
- 已完成：增加 local install layout check，固定 Cursor、Codex、Claude/Codex marketplace wrapper 的本地布局契约。
- 已完成：增加 hook smoke test，验证 `hooks/session-start` 和 `hooks/run-hook.cmd session-start` 能执行并返回 Wingman context JSON。
- 已验证：使用 `npm pack --dry-run --json` 确认真实 npm 发布包清单包含 manifest、skills、hooks、assets、docs 和已链接 policy 文件。

### Phase 3: 增加 Superpowers 风格行为测试

- 已完成：建立 `tests/skill-triggering/`。
- 已完成：为核心 skill 写 prompt 场景：
  - 非平凡任务应触发 `memory-load`。
  - API、schema、type 边界任务应触发 `align-contracts`。
  - 重建已有实现前应触发 `reuse-select`。
  - 普通任务不应触发 `memory-setup`。
- 已完成：建立 `tests/explicit-skill-requests/`。
- 已完成：为 `memory-sync`、`refactor`、`refactor-types` 写显式请求场景。
- 已完成：新增 `EXPECTATIONS.json` 和 `manual-results.zh-CN.md`，由 `npm test` 检查 prompt、expectation、引用 skill、人工审核记录是否完整。
- 待后续可选：接入真实 Claude Code、Codex 或 Cursor live runner，自动读取这些 prompt 并断言 agent 日志。

### Phase 4: CI 与发布 gate

- 添加 GitHub Actions。
- PR 必须通过 `npm test`。需要定位问题时，可分别运行 `npm run test:plugin`、`npm run test:package`、`npm run test:behavior`、`npm run check:plugin`。
- 发布前必须通过完整 plugin health check。

## 验收标准

- `npm test` 作为总入口，覆盖 plugin contract、package fixture、behavior assets 和 plugin health check。
- 分项测试命令能单独运行，便于定位失败来源。
- `npm run check:plugin` 可作为发布前健康检查入口。
- 新增 skill 时，如果忘记更新 `using-wingman`，测试会失败。
- 修改 manifest 时，如果缺少关键字段或路径失效，测试会失败。
- 后续逐步补齐 platform runtime tests 和 agent behavior tests。

## 后续执行原则

- 每个阶段都应保持测试快速、可本地运行、可放入 CI。
- 先扩展确定性高的静态检查，再引入更昂贵或更脆的运行时行为测试。
- 行为测试应优先覆盖 Wingman 自己的核心 workflow，不为了“看起来像 Superpowers”而维护不相关能力。
- 新增测试能力时，应同步更新本文档或拆出对应 implementation plan。

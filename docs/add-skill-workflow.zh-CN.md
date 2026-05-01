# 新增 Wingman Skill 流程

本文说明以后给 Wingman 新增 skill 时需要改哪些文件，以及现有测试会自动检查什么。

## 最小流程

假设要新增一个 `code-review` skill：

```text
skills/code-review/SKILL.md
```

需要做四件事：

1. 新建 `skills/code-review/SKILL.md`。
2. 更新 `skills/using-wingman/SKILL.md`，加入 `` `code-review` ``。
3. 更新 `README.md`，加入 `` `code-review` `` 的说明。
4. 运行 `npm test`。

一般不需要为了 `code-review` 单独新增测试文件。

## 测试会自动检查什么

现有测试会扫描 `skills/` 目录，而不是只检查写死的几个 skill 名字。

新增 `skills/code-review/SKILL.md` 后，测试会自动检查：

- `SKILL.md` 是否存在。
- frontmatter 是否存在。
- frontmatter `name` 是否等于目录名，例如 `code-review`。
- frontmatter `name` 是否只使用小写字母、数字和连字符。
- frontmatter `description` 是否存在。
- `description` 是否以 `Use when` 开头，保持 trigger-focused 写法。
- 正文是否以 H1 标题开头。
- `skills/using-wingman/SKILL.md` 是否提到 `` `code-review` ``。
- `README.md` 是否提到 `` `code-review` ``。

如果忘记更新 `using-wingman` 或 `README.md`，`npm test` 会失败。

## 什么时候需要新增专项测试

普通 skill 不需要新增专项测试。

只有当新 skill 有特殊契约时，才需要新增或扩展测试。例如：

- 它是显式 workflow，只能在用户明确请求时触发。
- 它新增了斜杠别名，例如 `/code-review`。
- 它有必须保留的触发语义，不能被文案重写掉。
- 它依赖新的 manifest 字段、hook、asset、平台 wrapper 或发布包文件。
- 它引入了新的行为测试 fixture。

如果只是新增一个普通 skill，通常只需要新增 skill 文件并更新 `using-wingman` 和 `README.md`。

## 推荐的 `SKILL.md` 骨架

```markdown
---
name: code-review
description: Use when reviewing code for correctness, regressions, and missing tests
---

# Code Review

Describe when to use this skill, what it should inspect, and what output shape it should produce.
```

注意：`description` 应描述触发条件，不要写成泛泛的功能介绍。

推荐：

```text
Use when reviewing code for correctness, regressions, and missing tests
```

不推荐：

```text
Reviews code and writes a summary
```

## 快速自检

新增 skill 后运行：

```bash
npm test
```

`npm test` 会运行完整测试入口。如果只想检查新增 skill 相关规则，可以先运行 `npm run test:plugin`。

如果测试失败，优先看失败信息属于哪一类：

- `frontmatter name must match parent directory`：`name` 和目录名不一致。
- `description should start with "Use when"`：`description` 不是 trigger-focused 写法。
- `using-wingman should mention ...`：入口 skill 没有登记新 skill。
- `README.md: should mention skill ...`：公开文档没有说明新 skill。

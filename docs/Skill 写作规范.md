# Skill 写作规范

本文是 Wingman 项目内的 Skill 设计、编写、验证和维护规范。它综合了 OpenAI Codex Skills、Anthropic Agent Skills、Agent Skills 开放规范、Anthropic/skills 示例仓库、Composio awesome-codex-skills，以及本项目现有 skill 的实践经验。

写作目标很简单：让未来的 AI agent 在正确的场景自动触发正确的 skill，并且在加载 skill 后能稳定完成任务，而不是读完一大段 prompt 后仍然靠猜。

## 0. 快速结论

高质量 Skill 应该满足这些条件：

1. **职责单一**：一个 skill 只覆盖一个稳定、可复用的工作流或领域能力。
2. **触发明确**：`description` 写清楚“什么时候用”和“什么时候不用”，并包含用户真实会说的触发词、同义词、症状词。
3. **正文精简**：`SKILL.md` 只放核心协议、关键决策、必须立即知道的 gotchas、必要示例和资源导航。
4. **渐进披露**：长资料、变体、API 细节、语言示例放到 `references/`；可重复、易错、需要确定性的步骤放到 `scripts/`；模板和静态素材放到 `assets/`。
5. **给默认路径**：不要只列菜单。告诉 agent 默认怎么做、何时走例外路径。
6. **示例真实可用**：示例必须是可执行或可直接套用的真实结构，避免伪代码、占位符和“按需补充”。
7. **验证优先**：用真实 prompt、正负触发样例、输出断言、无 skill baseline 或旧版本 baseline 验证 skill 是否真的增加价值。
8. **持续迭代**：每次 agent 在该场景犯同类错误，把错误模式沉淀进 Gotchas、协议或脚本，而不是只在对话里纠正一次。

反过来，下面这些通常是坏 skill：

- `SKILL.md` 写成上千行长 prompt。
- `description` 写成营销介绍，没有真实触发条件。
- 一个 skill 同时管代码审查、提交、发布、排障、文档生成。
- 只写“遵循最佳实践”“处理错误”“保持代码整洁”这类空话。
- 把复杂 shell、curl、jq 管道散写在正文里，没有脚本、无参数说明、无错误输出。
- 放一堆 README、CHANGELOG、安装说明到 skill 文件夹里，挤占 agent 的发现和阅读路径。
- 从未用真实任务测试过，只因为“看起来清楚”就发布。

## 1. Skill 是什么

Skill 是一个文件夹，至少包含一个 `SKILL.md`。它把一类任务所需的指令、流程、参考资料、脚本和模板打包起来，让 agent 在遇到相关任务时按需加载。

可以把 Skill 理解为“任务能力包”：

- `description` 决定 agent 是否应该加载它。
- `SKILL.md` 正文告诉 agent 加载后如何执行。
- `references/` 提供按需阅读的长参考。
- `scripts/` 提供可重复、确定性的可执行能力。
- `assets/` 提供输出中会用到的模板、图片、样例、配置骨架等资源。

Skill 不是：

- 不是一次性 prompt 模板。
- 不是项目所有规则的垃圾桶。
- 不是 MCP 工具定义。
- 不是文档站点。
- 不是让 agent 复制粘贴的一次性答案。
- 不是绕过权限、安全、测试和 review 的捷径。

判断一个内容该不该变成 skill，可以问四个问题：

1. 这个任务会不会重复出现？
2. 没有这段指导，agent 是否经常走错、漏步、误判边界或浪费时间？
3. 这段指导是否能跨多个相似任务复用，而不是只服务当前一次需求？
4. 它是否需要按需触发，而不是每次进入仓库都要读？

如果答案大多是“是”，适合写 skill。如果只是项目全局约定，优先放 `AGENTS.md` 或项目记忆；如果是外部系统能力，优先做 MCP 或 CLI 工具；如果是普通说明文档，放 `docs/`。

## 2. Skill 与 AGENTS.md、MCP、脚本、普通文档的边界

| 类型 | 解决的问题 | 应放什么 | 不应放什么 |
| --- | --- | --- | --- |
| `AGENTS.md` / 项目级规则 | agent 进入仓库后总要知道的全局规则 | 构建命令、测试命令、代码风格、仓库约定、必须遵守的安全规则 | 只有特定任务才需要的大段流程 |
| Skill | 特定场景下的可复用工作流 | 触发条件、执行协议、决策树、gotchas、示例、资源导航 | 项目所有规范、长篇 API 文档、工具实现 |
| MCP / 工具 | agent 能调用什么外部能力 | API、数据库、issue 系统、搜索、内部服务等可执行接口 | 大段业务流程和场景判断 |
| `scripts/` | 可重复、易错、确定性的本地操作 | 验证器、转换器、打包器、解析器、生成器 | 需要 agent 灵活判断的业务推理 |
| `docs/` | 给人和 agent 查阅的普通说明 | 背景、设计、发布流程、概念说明 | 期望自动触发的任务协议 |

经验规则：

- **Skill 编排场景，MCP 暴露能力**。不要在 skill 里手写一堆复杂 curl 来模拟工具；应把稳定接口做成 MCP 或脚本，然后在 skill 里说明何时使用、如何组合、如何验证。
- **Skill 不是全局规则**。如果每次任务都必须遵守，放进 `AGENTS.md`、系统提示或项目记忆；如果只有某类任务需要，才写 skill。
- **Skill 可以引用脚本，但不要把脚本逻辑塞进正文**。正文说明“运行哪个脚本、输入输出是什么、失败如何处理”；复杂逻辑放 `scripts/`。

## 3. 加载模型：渐进披露

Skill 的核心设计是渐进披露。agent 不是一开始读取所有 skill 的完整正文，而是分层加载：

1. **元数据层**：所有可用 skill 的 `name`、`description`、路径会进入上下文。Codex 文档说明，初始 skill 列表有上下文预算；skill 过多时会先压缩 description，极端情况下还可能省略部分 skill 并给出警告。
2. **正文层**：当 agent 判断任务匹配某个 skill 后，才读取该 skill 的 `SKILL.md` 正文。
3. **资源层**：当正文明确指向某个 `references/`、`scripts/` 或 `assets/` 文件，且当前任务需要时，agent 才继续读取或运行。

这带来三个写作原则：

- **`description` 承担触发责任**。正文里的“何时使用”通常太晚了，因为正文只有触发后才会被读。
- **`SKILL.md` 承担主流程责任**。它不该是一座资料库，而应该是 agent 开始工作时必须知道的协议和路线图。
- **资源文件承担细节责任**。长表格、API 参考、语言示例、历史案例、模板和脚本按需加载。

推荐上限：

- `description`：最多 1024 字符，实际尽量控制在几句话到一小段。
- `SKILL.md`：尽量少于 500 行；更严格的常用 skill 可以控制在 200 行以内。
- `references/*.md`：超过 100 行要有目录；尽量保持一个文件解决一个主题。
- 高频加载 skill：越短越好，因为它们容易和其他 skill 一起占用上下文。

## 4. 本项目中的 Skill 存放方式

本仓库当前有两类 skill 位置：

```text
wingman.ai/
  skills/                         # 源 skill，日常编辑位置
  plugins/wingman/skills/          # Codex 插件 payload 副本
  docs/Codex 插件本地测试与发布说明.md
```

本项目写作规范：

1. 新建或修改 Wingman skill，优先编辑根目录 `skills/<skill-name>/SKILL.md`。
2. 如果该 skill 要随 Codex 插件分发，必须同步到 `plugins/wingman/skills/`。同步流程以 [Codex 插件本地测试与发布说明](./Codex%20插件本地测试与发布说明.md) 为准。
3. 不要只改 `plugins/wingman/skills/` 的副本，否则下一次同步可能覆盖修改。
4. skill 文件夹名、`SKILL.md` frontmatter 里的 `name` 必须一致。
5. 面向 Codex 官方本地发现时，Codex 还支持 `.agents/skills`、`$HOME/.agents/skills`、`/etc/codex/skills` 等位置；但本仓库作为插件项目时，插件 payload 是主要分发路径。

标准目录：

```text
skill-name/
  SKILL.md              # 必需：frontmatter + 主流程
  references/           # 可选：按需读取的长文档、示例、规范
  scripts/              # 可选：可执行脚本、验证器、生成器
  assets/               # 可选：模板、图片、样例文件、静态资源
  agents/openai.yaml    # 可选：Codex UI 元数据、隐式触发策略、依赖声明
```

除非有明确分发需要，不要在单个 skill 文件夹内添加这些文件：

- `README.md`
- `CHANGELOG.md`
- `INSTALLATION.md`
- `QUICK_REFERENCE.md`
- `NOTES.md`

这些文件会让 agent 难以判断哪个才是执行入口。安装说明、发布说明、维护记录应放在仓库级 `docs/` 或插件根目录，而不是 skill 内部。

## 5. SKILL.md 的基本结构

最小结构：

```markdown
---
name: skill-name
description: Use when ...
---

# Skill Name

一句话说明核心原则。

## Core Rule

必须遵守的主规则。

## Workflow

1. 第一步。
2. 第二步。
3. 验证。

## Gotchas

- 容易错的地方。
```

推荐结构：

```markdown
---
name: skill-name
description: Use when [触发条件、用户意图、症状词、边界]. Do not use for [相邻但不该触发的场景].
---

# Skill Name

用 1-3 句话说明这个 skill 的目标和核心原则。

## Core Rule

最重要的不可违反规则。只放 agent 一加载就必须知道的内容。

## Gate

进入流程前的判断条件。明确什么时候继续，什么时候停止，什么时候问用户。

## Workflow

按顺序列出执行步骤。复杂任务用 checklist；简单任务用短编号。

## Decision Rules

如果任务有分支，写清楚选择条件和默认路径。

## References

说明什么时候读取哪个 `references/` 文件。

## Scripts

说明什么时候运行哪个 `scripts/` 文件、参数、输出、失败处理。

## Ask The User When

只列真正无法从代码、文档、输入中判断且贸然决定会改变语义的情况。

## Gotchas

来自真实失败或高概率误判的坑。
```

不是每个 skill 都需要所有章节。优先保留能改变 agent 行为的部分，删掉常识解释。

## 6. Frontmatter 规范

### 6.1 必需字段

`SKILL.md` 必须以 YAML frontmatter 开头，至少包含：

```yaml
---
name: data-contracts
description: Use when aligning provider and consumer contracts across API payloads...
---
```

`name` 规则：

- 使用小写字母、数字、连字符。
- 长度不超过 64 个字符。
- 不以连字符开头或结尾。
- 不使用连续连字符。
- 与 skill 文件夹名保持一致。
- 优先用动词或动作名，避免 `helper`、`tools`、`utils`、`misc` 这种泛名。

推荐命名：

- `data-contracts`
- `memory-sync`
- `review-pr`
- `generate-release-notes`
- `diagnose-react-types`

不推荐命名：

- `helper`
- `project-tools`
- `api`
- `better-code`
- `skill-v2`

### 6.2 description 是触发器，不是简介

`description` 是最重要的字段。agent 先看到它，再决定是否读取正文。写错 description，正文再好也可能不会触发。

好的 `description` 应该包含：

- 任务意图：用户想完成什么。
- 触发场景：出现什么请求、文件、错误、症状时应该用。
- 同义词和自然语言表达：用户真实会怎么说。
- 边界：相近但不该触发的场景。
- 领域关键词：框架、文件类型、错误码、业务词、中文关键词等。

写作原则：

1. 前置关键用途。Codex 可能缩短长 description，核心触发词要放前面。
2. 使用第三人称或指令式，不要写“我可以”。
3. 聚焦用户意图，不要写内部实现细节。
4. 不要把完整 workflow 写进 description。否则 agent 可能只看 description 就按简化流程做，跳过正文。
5. 不要过宽。触发太多会污染上下文并导致错误流程介入。
6. 不要过窄。只写一个关键词会漏掉用户真实表达。

推荐模板：

```yaml
description: Use when [用户意图/任务类型] involving [对象/边界/文件类型]. Trigger for [常见说法、错误、症状、同义词、中文触发词]. Do not use for [近邻排除项].
```

好的例子：

```yaml
description: Use when aligning provider and consumer contracts across API payloads, webhooks, database rows, SDK responses, schemas, DTOs, UI props, or AI structured outputs. Trigger for API integration, field alignment, schema/type mismatch, missing fields, optional fields, 接口对接, 字段对齐, or 类型对不上. Do not use for pure styling or local renames with no data boundary.
```

差的例子：

```yaml
description: Helps with APIs.
```

问题：太宽，缺少触发词、边界、任务意图。

差的例子：

```yaml
description: This skill reads API docs, compares provider and consumer schemas, chooses the binding location, writes adapters, adds tests, and reports changes.
```

问题：它把 workflow 写进 description。agent 可能按这句话简化执行，不读正文里的细节和限制。

差的例子：

```yaml
description: I can help you write better TypeScript.
```

问题：第一人称、过宽、没有触发场景。

### 6.3 可选字段

Agent Skills 开放规范还定义了可选字段，例如：

- `license`
- `compatibility`
- `metadata`
- `allowed-tools`

本项目默认只写 `name` 和 `description`。只有在确有需要时才加可选字段：

- skill 将作为独立资产公开分发，需要声明许可证时，加 `license`。
- skill 对运行环境有硬要求，例如必须有 `uv`、`jq`、Docker、网络访问、某个 MCP server 时，加 `compatibility` 或在 `agents/openai.yaml` 的 `dependencies` 里声明。
- 客户端有明确需要读取额外元数据时，加 `metadata`。

不要为了“看起来完整”添加无用字段。不同 agent 对可选字段支持不完全一致，越少越稳。

## 7. description 触发测试

写完 description 后，至少做一次轻量触发测试。

准备 10-20 条查询：

- 5-10 条应该触发。
- 5-10 条不应该触发。
- 正例要包含直接表达、间接表达、中文表达、口语表达、带路径表达、带错误信息表达。
- 反例要包含近邻误触发，而不是完全无关的问题。

示例，以 `data-contracts` 为例：

```json
[
  {
    "query": "把这个真实 API 响应接到页面上，现在类型对不上",
    "should_trigger": true
  },
  {
    "query": "mock 数据字段是 userName，但后端返回 user_name，帮我对齐",
    "should_trigger": true
  },
  {
    "query": "这个按钮颜色和间距不符合设计稿，调一下样式",
    "should_trigger": false
  },
  {
    "query": "把 local variable userDto 改名成 user",
    "should_trigger": false
  }
]
```

评估标准：

- 应触发样例没有触发，说明 description 太窄或缺少同义词。
- 不应触发样例触发了，说明 description 太宽或边界不清。
- 如果只靠某个关键词触发，但任务语义不对，应该加排除边界。
- 如果用户没有说出 skill 名称但任务明显相关，也应该能触发。

更严格的做法：

1. 把查询分成训练集和验证集。
2. 用训练集改 description。
3. 用验证集检查是否泛化。
4. 避免把失败样例里的原句硬塞进 description 造成过拟合。

## 8. 正文写作原则

### 8.1 只写 agent 容易不知道或容易做错的内容

不要解释通用常识。agent 已经知道 HTTP 是什么、PDF 是什么、测试为什么重要。Skill 应该提供的是：

- 项目特定约定。
- 领域特定流程。
- 非显而易见的判断规则。
- 易错边界。
- 推荐默认工具。
- 输入输出格式。
- 验证方法。

每段内容都问一句：没有这段，agent 是否会明显更容易出错？如果不会，删掉。

### 8.2 写流程，不写愿望

弱指令：

```markdown
Ensure high quality and handle edge cases appropriately.
```

强指令：

```markdown
Before reporting completion:

1. Run the focused test for the changed behavior.
2. Run the relevant typecheck.
3. If either fails, fix the failure and rerun the same command.
4. Report commands run and remaining gaps.
```

Skill 要给 agent 一个可执行过程，而不是抽象价值观。

### 8.3 给默认路径，不要给大菜单

差：

```markdown
You can use pypdf, pdfplumber, PyMuPDF, OCR, or custom parsing.
```

好：

```markdown
Use `pdfplumber` for text PDFs. If extracted text is empty or obviously garbled, switch to OCR and record that the document is scanned.
```

agent 面对菜单会浪费时间或随机选择。Skill 作者应该根据经验给默认路径，只在必要时说明例外。

### 8.4 控制度要匹配任务脆弱度

| 任务类型 | 控制度 | 写法 |
| --- | --- | --- |
| 代码审查、架构分析、文档润色 | 高自由度 | 给检查维度、原则、输出格式，让 agent 按上下文判断 |
| API 映射、数据处理、报告生成 | 中自由度 | 给默认流程、关键分支、模板、示例 |
| 迁移、打包、格式转换、批量删除、发布 | 低自由度 | 给固定命令、脚本、验证门禁、失败回滚策略 |

原则：越容易造成破坏、越需要一致性、越依赖固定顺序，就越应该使用脚本和明确门禁。

### 8.5 Ask The User When 要少而准

不要把每一步都变成提问。agent 应该先从代码、文档、测试、schema、输入文件中找答案。

应该问用户的情况：

- 语义所有权无法从现有资料判断，贸然决定会改变业务含义。
- 会修改公共 API、稳定数据模型、持久化 schema、权限规则或用户可见行为。
- 缺少必要输入，且不能安全推断。
- 操作有破坏性或需要外部权限。

不应该问用户的情况：

- 文件路径可搜索得到。
- 项目命令在 `package.json`、`Makefile`、README、AGENTS.md 里能找到。
- 只是局部实现方式选择，且项目已有模式。
- 测试失败原因可以继续排查。

## 9. Gotchas 是高价值内容

Gotchas 是 agent 最容易凭常识猜错的地方。很多 skill 真正的价值不在主流程，而在这些“如果不说就会错”的事实。

好的 Gotchas：

```markdown
## Gotchas

- `history/` is trace context only; it is not current truth.
- If `.wingman/memory/brief.md` is missing, stop before writing memory.
- Do not invent placeholder fields just to satisfy TypeScript types.
- API `status` and UI `workflowKind` are not semantically interchangeable.
```

差的 Gotchas：

```markdown
## Gotchas

- Be careful.
- Follow best practices.
- Make sure code is clean.
```

Gotchas 来源：

- agent 真实犯过的错。
- code review 中重复出现的问题。
- 生产事故、排障记录、回滚原因。
- 项目里命名反直觉的字段、API、状态机。
- 平台、框架、工具的非常规行为。

维护规则：

1. 每次发现 agent 在某个 skill 场景下犯同类错误，优先判断是否应该新增或改写 Gotchas。
2. Gotchas 不要无限堆。过时的要删，重复的要合并，太长的要移到 `references/anti-patterns.md` 并在主文件给触发条件。
3. 高危 Gotchas 留在 `SKILL.md` 主文件，不要藏太深。agent 只有先知道坑，才会主动避开。

## 10. 示例规范

示例用于教 agent 模式，不是装饰。一个好示例胜过十个伪示例。

示例必须：

- 与 skill 任务高度相关。
- 可运行、可复制、可直接改造。
- 包含必要 imports、输入、输出、错误处理或验证。
- 使用真实结构，不使用 `TODO`、`...`、`your logic here`。
- 只展示推荐模式，不展示多个质量参差的写法。

差示例：

```ts
function mapApiToUser(api) {
  // TODO: map fields
  return {
    // ...
  };
}
```

好示例：

```ts
type ApiUser = {
  id: string;
  user_name: string;
  avatar_url?: string | null;
};

type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export function toUserProfile(api: ApiUser): UserProfile {
  return {
    id: api.id,
    displayName: api.user_name,
    avatarUrl: api.avatar_url ?? null,
  };
}
```

示例数量：

- 普通 skill：1 个高质量示例通常够。
- 多语言 skill：不要每种语言都塞进主文件。主文件说明“按项目语言选择示例”，具体放 `references/examples-typescript.md`、`references/examples-python.md`。
- 复杂工具 skill：主文件放最小 happy path，边界和高级示例放 references。

## 11. references/ 规范

`references/` 用来放按需阅读的长资料。它的价值是减少主文件负担，同时保持细节可发现。

适合放入 `references/`：

- 语言或框架专门示例。
- 长 API 文档摘要。
- schema、字段表、事件格式。
- 反模式清单。
- 复杂输出模板。
- 领域知识库。
- 多云、多框架、多平台的分支说明。

不适合放入 `references/`：

- agent 一开始就必须知道的门禁。
- 高危安全规则。
- 核心执行顺序。
- 必须先做的验证。

组织方式：

```text
skill-name/
  SKILL.md
  references/
    examples.md
    examples-typescript.md
    examples-python.md
    anti-patterns.md
    api-errors.md
```

主文件中要写清楚何时读取：

```markdown
## Example Use Rule

If implementation examples are needed, read `references/examples.md`, then one matching language example.

Read `references/anti-patterns.md` when fixing type errors, replacing mock data, mapping API fields, or handling missing provider fields.
```

不要写：

```markdown
See references/ for more details.
```

这太模糊，agent 不知道该读哪个文件，也不知道什么时候读。

层级规则：

- reference 文件尽量只在 `SKILL.md` 中被直接引用。
- 避免 `SKILL.md -> references/a.md -> references/b.md -> references/c.md` 的深链路。
- 超过 100 行的 reference 文件开头写目录。
- 一个 reference 文件只服务一个清晰主题。

## 12. scripts/ 规范

脚本用于确定性、重复性、易错性高的步骤。

适合写脚本：

- 解析固定格式文件。
- 验证输出结构。
- 批量转换。
- 生成模板。
- 打包、同步、发布前检查。
- 多次任务中 agent 反复临时写同一段代码。

不适合写脚本：

- 需要大量上下文判断的架构决策。
- 一次性探索。
- 项目已有命令已经很好用。
- 简单到一条稳定命令即可完成的操作。

脚本设计规则：

1. **非交互**：不能等待 TTY 输入、密码提示、确认菜单。所有输入来自 flags、环境变量或 stdin。
2. **有 `--help`**：说明用途、参数、示例、退出码。
3. **错误可修复**：错误信息说明收到什么、期望什么、下一步怎么改。
4. **输出可解析**：结构化数据优先用 JSON、CSV、TSV；诊断写 stderr，结果写 stdout。
5. **幂等**：agent 可能重试。优先 “create if missing / update if changed”，避免重复执行造成破坏。
6. **安全默认**：破坏性操作需要 `--dry-run`、`--confirm`、`--force` 等显式开关。
7. **版本固定**：依赖版本尽量 pin，避免今天可用明天变行为。
8. **输出可控**：大输出默认摘要，支持 `--limit`、`--offset` 或 `--output`。

在 `SKILL.md` 中引用脚本：

````markdown
## Scripts

- `scripts/validate-contracts.ts`: validates provider samples against consumer schemas.

Run after editing mappings:

```bash
node scripts/validate-contracts.ts --provider samples/api.json --schema src/schema.ts
```

If validation fails, fix the reported field mismatch and rerun the same command before reporting completion.
````

脚本路径使用相对 skill 根目录的路径。不要写本机绝对路径。

## 13. assets/ 规范

`assets/` 存放输出会用到的静态资源，而不是给 agent 阅读的大文档。

适合放：

- 文档模板。
- PPT 模板。
- 图片、图标、字体。
- 前端模板工程。
- 配置文件骨架。
- 示例输入文件。

规则：

- `SKILL.md` 要说明何时使用哪个 asset。
- 模板要尽量自解释，避免需要额外 README。
- 大型模板工程要保持最小可运行，并在 `SKILL.md` 中写启动、构建、验证命令。
- 不要把应该阅读的长规范塞进 `assets/`；那属于 `references/`。

## 14. agents/openai.yaml 规范

Codex 支持可选的 `agents/openai.yaml`，用于 UI 元数据、隐式触发策略和依赖声明。不是每个 skill 都需要。

适合添加的情况：

- skill 要在 Codex app 中显示更友好的名称、简介、图标。
- skill 需要声明 MCP 依赖或工具依赖。
- skill 不适合隐式触发，只允许用户显式 `$skill` 调用。

示例：

```yaml
interface:
  display_name: "Contract Alignment"
  short_description: "Align API, schema, DTO, and UI data contracts."
  default_prompt: "Use this skill to align the provider and consumer contract."

policy:
  allow_implicit_invocation: true

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

本项目默认不要求每个 skill 都有 `agents/openai.yaml`。如果添加，必须保持它与 `SKILL.md` 一致，尤其是名称、简介和触发策略。

## 15. Skill 类型与写法

### 15.1 流程型 Skill

用于多步任务，例如发布、排障、记忆同步、生成报告。

重点：

- Gate。
- 顺序步骤。
- 验证循环。
- 何时停止。
- 何时问用户。
- 完成报告格式。

### 15.2 规则型 Skill

用于强约束，例如 TDD、验证前不得声称完成、合规检查。

重点：

- 红线明确。
- 反例和常见借口。
- 违规后如何恢复。
- 不要留下“精神遵守即可”的漏洞。

### 15.3 参考型 Skill

用于 API、工具、格式、领域知识。

重点：

- `SKILL.md` 写导航和查询方法。
- 大量内容放 references。
- 告诉 agent 如何搜索 reference。
- 不要把整本文档塞进主文件。

### 15.4 工具型 Skill

用于驱动脚本、CLI、MCP、文件处理。

重点：

- 列可用工具和脚本。
- 输入输出明确。
- 错误处理明确。
- 验证命令明确。
- 依赖和环境限制明确。

### 15.5 领域型 Skill

用于团队内部业务规则、字段语义、状态机、权限模型。

重点：

- 只收录稳定事实。
- 标明来源或证据。
- 区分当前真理和历史上下文。
- 高风险规则放主文件，长字段表放 references。

## 16. 创建新 Skill 的流程

### Step 1：确认是否应该写 skill

先回答：

- 用户会怎么请求这类任务？
- 这个任务是否会重复？
- 现有 agent 没有 skill 时具体会错在哪里？
- 这个 skill 与现有 skill 是否重叠？
- 它属于用户级、项目级、插件级还是系统级？

如果只是一次性操作，不写 skill。如果是全局规则，写 `AGENTS.md` 或项目记忆。如果是工具能力，先考虑 MCP 或脚本。

### Step 2：收集真实材料

优先使用：

- 已成功完成的一次真实任务。
- 用户纠正过 agent 的对话。
- PR review 意见。
- 事故复盘。
- 项目 docs、schema、API spec。
- 现有代码中的稳定模式。
- 失败日志和错误信息。

不要只让 LLM 从通用知识生成一个 skill。没有真实材料的 skill 往往充满“最佳实践”空话。

### Step 3：写触发边界

先写 5-10 个应该触发的 prompt，再写 5-10 个不应该触发的 prompt，然后反推 description。

这一步比写正文更重要。触发不准，skill 没有机会发挥。

### Step 4：设计资源结构

判断是否需要：

- `references/`：是否有长资料、语言变体、反模式、API 表？
- `scripts/`：是否有重复、易错、确定性步骤？
- `assets/`：是否有模板、静态资源、样例输入？
- `agents/openai.yaml`：是否需要 UI 元数据、依赖、隐式触发策略？

如果不需要，不要创建空目录。

### Step 5：写最小可用 SKILL.md

从核心规则、Gate、Workflow、Gotchas 开始。不要一开始追求百科全书式完整。

初稿应该能回答：

- 何时继续？
- 先做什么？
- 默认怎么判断？
- 什么情况下停止或问用户？
- 如何验证？
- 哪些坑必须避开？

### Step 6：测试

至少做三种测试：

1. **触发测试**：应该触发的 prompt 是否触发，不该触发的是否不触发。
2. **输出测试**：加载 skill 后，agent 是否按期望产出。
3. **对照测试**：与无 skill 或旧版 skill 相比，质量是否明显提升。

复杂 skill 应加 `evals/` 或独立测试工作区，记录输入、输出、断言、人工反馈。

### Step 7：迭代

根据测试结果改：

- 漏触发：改 description，增加更一般的用户意图表达。
- 误触发：收窄 description，加 Do not use 边界。
- agent 跳步：把步骤改成 checklist 或 gate。
- agent 反复写临时代码：沉淀为 script。
- agent 查错资料：重写 references 导航。
- agent 犯同类错：新增 Gotchas 或反模式。

## 17. 修改现有 Skill 的流程

改 skill 和改代码一样，要避免无验证变更。

修改前：

1. 读当前 `SKILL.md` 和相关 references。
2. 明确这次修改要解决的具体失败、缺口或新增场景。
3. 检查是否与其他 skill 边界重叠。
4. 如果是触发问题，先准备正负触发样例。

修改时：

- 保持改动集中。
- 不顺手重写无关章节。
- 不把一次性案例写成永久规则。
- 不引入和当前 description 不一致的正文流程。
- references 和脚本路径变更后，同步更新主文件导航。

修改后：

- 跑 frontmatter/Markdown 基本检查。
- 用样例 prompt 验证触发。
- 至少人工审查一次：正文是否还有过时路径、重复规则、模糊 TODO、互相矛盾的指令。
- 如果本项目 skill 要分发到插件 payload，执行现有同步流程。

## 18. 验证清单

提交前检查：

- [ ] 文件夹名与 `name` 一致。
- [ ] `name` 只含小写字母、数字、连字符，不超过 64 字符。
- [ ] `description` 不为空，不超过 1024 字符。
- [ ] `description` 前置核心触发词，包含用户意图、症状词、同义词和边界。
- [ ] `description` 没有把完整 workflow 塞进去。
- [ ] `SKILL.md` 主体只包含每次触发都需要的内容。
- [ ] 长资料已拆到 `references/`。
- [ ] 每个 reference 都在 `SKILL.md` 中有明确读取条件。
- [ ] 没有深层 reference 链路。
- [ ] 超过 100 行的 reference 有目录。
- [ ] 脚本有非交互参数、`--help`、清晰错误、可控输出。
- [ ] 示例没有 `TODO`、`...`、`your logic here` 等占位符。
- [ ] Gotchas 来自真实风险或高概率误判，不是泛泛建议。
- [ ] Ask The User When 没有滥用。
- [ ] 触发正例和反例都试过。
- [ ] 若修改了根目录 `skills/`，需要分发时已同步插件 payload。

## 19. 常见反模式

### 19.1 把 Skill 写成长 prompt

症状：正文上千行，规则重复，示例很多，agent 加载后仍然抓不住重点。

修复：

- 主文件保留核心协议。
- 长资料拆 references。
- 重复命令做 scripts。
- 只保留一个高质量示例。

### 19.2 description 写成功能广告

差：

```yaml
description: Provides a comprehensive enterprise-grade workflow for API development.
```

修复：

```yaml
description: Use when adding or changing REST API endpoints, request/response DTOs, OpenAPI specs, backend handlers, or generated clients. Trigger for 新增接口, API 对接, request schema, response schema, route handler, or client generation. Do not use for UI-only styling changes.
```

### 19.3 Skill 边界重叠

症状：`code-review`、`pr-review`、`merge-check` 都会在同一请求触发，输出互相抢职责。

修复：

- 合并为一个 skill，或明确切分：
  - `review-code`：本地代码质量。
  - `review-pr`：PR diff 和评论。
  - `prepare-merge`：merge 前 checklist。
- 在 description 写清互斥边界。

### 19.4 正文只写原则，不写动作

差：

```markdown
Make sure the implementation is safe and well tested.
```

修复：

```markdown
Before completion, run the focused test that covers the changed behavior. If no focused test exists, run the closest typecheck or build command and state the gap.
```

### 19.5 伪代码示例污染输出

症状：agent 把示例中的 `TODO`、`...`、`your logic here` 原样带进项目。

修复：

- 示例必须真实。
- 如果无法提供真实示例，就写决策规则，不写伪代码。

### 19.6 把工具调用写成脆弱命令

症状：正文里有很长的 curl、jq、sed、awk 命令，agent 经常拼错或无法处理错误。

修复：

- 简短命令保留正文。
- 长命令封装成脚本。
- 外部系统做 MCP。
- 脚本输出结构化结果。

### 19.7 不写验证路径

症状：agent 做完就声称完成，但没有证明。

修复：

- 每个 workflow 至少写一种验证方式。
- 脆弱任务写验证循环。
- 不可验证时要求报告验证缺口。

### 19.8 把项目级和个人级混在一起

症状：个人写作风格污染团队仓库；项目 API 规则只在个人机器可用。

修复：

- 团队共享、项目稳定规则放 repo 或插件。
- 个人偏好放用户级 skill。
- 通用公开能力做插件分发。

## 20. 推荐模板

### 20.1 简洁流程型模板

```markdown
---
name: example-workflow
description: Use when [任务意图和触发场景]. Trigger for [关键词/症状/中文说法]. Do not use for [排除项].
---

# Example Workflow

Core principle: [一句话说明最重要的判断].

## Gate

Continue only when [条件]. Stop when [条件].

## Workflow

1. Identify [输入/来源].
2. Decide [关键分支] using [规则].
3. Apply [默认动作].
4. Verify with [测试/命令/检查].
5. Report [输出格式].

## Ask The User When

- [真正无法判断且影响语义的情况].

## Gotchas

- [真实易错点].
```

### 20.2 带 references 的模板

```markdown
---
name: example-reference-skill
description: Use when [任务意图]. Trigger for [触发词]. Do not use for [边界].
---

# Example Reference Skill

Use the main workflow here. Load references only when the task needs that detail.

## Workflow

1. Determine the target platform.
2. Read the matching reference:
   - TypeScript: `references/typescript.md`
   - Python: `references/python.md`
   - Anti-patterns: `references/anti-patterns.md`
3. Apply the project's existing patterns before copying any example.
4. Verify with the project's normal command.

## Gotchas

- Examples show patterns only. Do not copy example domain names or field names into unrelated projects.
```

### 20.3 带 scripts 的模板

````markdown
---
name: example-scripted-skill
description: Use when [任务需要确定性处理]. Trigger for [文件类型/命令/症状]. Do not use for [排除项].
---

# Example Scripted Skill

## Scripts

- `scripts/analyze.py`: reads input and writes a JSON plan.
- `scripts/validate.py`: validates the plan before execution.

## Workflow

1. Analyze input:

```bash
python3 scripts/analyze.py --input "$INPUT" --output plan.json
```

2. Validate:

```bash
python3 scripts/validate.py --plan plan.json
```

3. If validation fails, fix `plan.json` using the error message and rerun validation.
4. Execute only after validation passes.
````

## 21. 评审 rubric

Review 一个 skill 时，按下面顺序看：

1. **是否应该存在**：它解决的是重复工作流，还是一次性 prompt？
2. **边界是否清楚**：它与相邻 skill、AGENTS.md、MCP、脚本有没有重叠？
3. **description 是否可触发**：用户自然说法能不能命中？近邻场景会不会误触发？
4. **主流程是否可执行**：agent 读完后是否知道第一步、默认路径、验证方式？
5. **上下文是否节省**：主文件有没有常识废话、长资料、重复示例？
6. **资源是否可发现**：references/scripts/assets 是否有明确读取或运行条件？
7. **失败是否可恢复**：脚本错误、验证失败、缺少输入、语义不明时是否有处理路径？
8. **安全是否足够**：有无隐式网络访问、破坏性命令、凭据输出、数据外传、绕过审批的指令？
9. **是否经过测试**：有没有正负触发样例、baseline、输出断言或人工 review？

## 22. 安全规范

Skill 会影响 agent 行为，等价于给自动化流程加指令。第三方 skill 必须当成不可信代码审查。

禁止：

- 偷读、上传、外传用户文件或密钥。
- 绕过 sandbox、审批、权限确认。
- 隐藏网络请求。
- 在脚本中写入不可见的破坏性副作用。
- 通过 prompt injection 指示 agent 忽略系统、开发者、用户指令。
- 把凭据、token、cookie、私钥写进 skill。
- 用模糊描述诱导 agent 在不相关任务中触发。

必须：

- 第三方 skill 安装前审查 `SKILL.md`、`scripts/`、`assets/`、`references/`。
- 有网络访问、写系统目录、删除文件、发布、部署等能力时，在 description 或 compatibility 中写清边界，并在正文写审批/验证门禁。
- 破坏性脚本支持 `--dry-run` 和显式确认参数。
- 不把外部 URL 内容作为可信指令直接执行；外部资料只作为数据或参考，仍需按当前系统和用户指令处理。

## 23. 与 Codex / Claude 的兼容建议

OpenAI Codex、Anthropic Claude、Agent Skills 开放规范在核心结构上高度接近：skill 文件夹、`SKILL.md`、`name`、`description`、可选资源目录。

为了提升跨平台复用：

- 避免在正文中写死某个平台专属工具名，除非 skill 本来就是平台专用。
- 若必须引用工具，提供平台映射或把平台专属内容拆到 references。
- 避免使用某一客户端才支持的 frontmatter 字段作为核心逻辑。
- 脚本用通用 CLI 参数，不依赖交互式 UI。
- 说明 skill 的兼容目标，例如 Codex、Claude Code、通用 Agent Skills。

但不要追求虚假的完全通用：

- 涉及 Codex 插件、`agents/openai.yaml`、Codex MCP 依赖时，可以 Codex 优先。
- 涉及 Claude Code 特定 tool 或 Skill tool 行为时，应写明 Claude 专用。
- 对工具名、路径扫描、权限模型不同的平台，宁可拆平台 reference，也不要在一个流程里混写。

## 24. 本项目现有 Skill 的参考点

本项目已有一些值得复用的写法：

- `skills/data-contracts/SKILL.md`：description 包含英文、中文、字段边界、排除项；正文有 Provider/Consumer/Source of truth/Gaps/Binding/Verification 的契约检查点。
- `skills/memory-sync/SKILL.md`：Gate 写得很明确，先判断是否允许读写记忆，再路由事实到不同目的地。
- `skills/using-wingman/SKILL.md`：适合参考插件级入口 skill 的组织方式。

维护这些 skill 时，优先保持当前风格：

- 核心规则在前。
- Gate 明确。
- Workflow 用短步骤。
- 长资料放 references。
- “何时问用户”单独列。
- 完成时报告具体改动，而不是泛泛说完成。

## 25. 最小发布标准

一个新 skill 至少达到以下标准才能进入本项目：

1. 有清晰的重复使用场景。
2. 与现有 skill 不明显重叠。
3. `description` 有触发条件、关键词、边界。
4. `SKILL.md` 有可执行 workflow。
5. 有 Gotchas 或明确说明目前没有已知 gotchas。
6. 有验证方式。
7. 至少用 3 个 should-trigger 和 3 个 should-not-trigger prompt 人工检查过。
8. 如果包含脚本，脚本至少运行过 `--help` 和一个代表性 happy path。
9. 如果要分发到 Codex 插件，已同步 payload 并按本项目发布说明检查。

## 26. 参考资料

- OpenAI Codex Agent Skills 文档：<https://developers.openai.com/codex/skills>
- OpenAI skills catalog：<https://github.com/openai/skills>
- Anthropic Agent Skills overview：<https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview>
- Anthropic Skill authoring best practices：<https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>
- Anthropic Agent Skills 发布说明：<https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills>
- Agent Skills specification：<https://agentskills.io/specification>
- Agent Skills best practices：<https://agentskills.io/skill-creation/best-practices>
- Agent Skills optimizing descriptions：<https://agentskills.io/skill-creation/optimizing-descriptions>
- Agent Skills evaluating skills：<https://agentskills.io/skill-creation/evaluating-skills>
- Agent Skills using scripts：<https://agentskills.io/skill-creation/using-scripts>
- Anthropic skills 示例仓库：<https://github.com/anthropics/skills>
- Anthropic skill-creator 示例：<https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md>
- Composio awesome-codex-skills：<https://github.com/ComposioHQ/awesome-codex-skills>
- 本项目 Codex 插件本地测试与发布说明：[Codex 插件本地测试与发布说明](./Codex%20插件本地测试与发布说明.md)

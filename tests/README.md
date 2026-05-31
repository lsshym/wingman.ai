# Wingman Skill Evaluation Tests

本目录包含给 AI 智能体读取和执行的 Wingman skill 评测文档。实际执行规则以各主题的 `method.md` 为准；本文件只提供索引和可复制的运行 prompt。

## 主题索引

| 主题 | 测试方法 | 测试用例 | 是否有对照组 |
| --- | --- | --- | --- |
| `data-contracts` | `data-contracts/method.md` | `data-contracts/cases.md` | Yes |
| `memory-setup` | `memory-setup/method.md` | `memory-setup/cases.md` | No |
| `memory-load` | `memory-load/method.md` | `memory-load/cases.md` | Limited |
| `memory-sync` | `memory-sync/method.md` | `memory-sync/cases.md` | Limited |
| `memory-clean` | `memory-clean/method.md` | `memory-clean/cases.md` | Limited |
| `memory-token-efficiency` | `memory-token-efficiency/method.md` | `memory-token-efficiency/cases.md` | Yes |

## 如何让 AI 运行测试

### 运行一个完整主题

把下面 prompt 发给被测 AI，替换其中的主题名即可：

```text
请在当前仓库运行 Wingman skill evaluation：

1. 先阅读 tests/data-contracts/method.md
2. 再阅读 tests/data-contracts/cases.md
3. 按 method.md 的执行协议运行所有 case
4. 每个 case 使用隔离临时 workspace
5. 严格只输出 method.md 要求的 JSON
6. 如果失败，必须包含 observed_output、expected_behavior、failure_reasons、files_read、files_changed、commands_run
```

### 运行单个 case 或一组对照 case

```text
请运行 Wingman evaluation 的单个测试：

- Method: tests/data-contracts/method.md
- Cases: tests/data-contracts/cases.md
- 只运行 ALIGN-002A 和 ALIGN-002B 这一组对照测试

要求：
1. 按 method.md 创建隔离临时 workspace
2. 写入 ALIGN-002 的 Shared Initial Workspace
3. 分别执行 A/B 两个 prompt
4. 比较 baseline_without_skill 和 with_align_contracts 的结果
5. 严格只输出 JSON
```

### 运行 memory token 效率实验

```text
请运行 memory token efficiency evaluation：

- Method: tests/memory-token-efficiency/method.md
- Cases: tests/memory-token-efficiency/cases.md
- 只运行 MEMTOK-001

要求：
1. A 组不得使用 Wingman memory skills
2. B 组必须使用 memory-load
3. 记录 files_read、irrelevant_files_read、final_answer
4. token usage 不能猜；如果没有 API/runner usage，就用实际读取文件字符数估算 estimated_context_tokens
5. 严格只输出 JSON
```

## Token 用量规则

详细规则见 `memory-token-efficiency/method.md`。简短版：不要编造 token 用量；没有 API 或 runner usage 时，用实际读取文件字符数估算，或者标记为 `unavailable`。

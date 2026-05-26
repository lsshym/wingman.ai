# Memory Sync Templates

Use these templates only when the existing memory file has no stronger local format.

## Context Log Template

For English memory:

```markdown
### [YYYY-MM-DD] Short feature title
- **Goal**: One sentence describing the core goal.
- **Core Files**:
  - `path/to/file`: [Function/Component/Module/Doc/Config Name] - Precise description of interaction, data/state, output, rule, contract, or operational change.
- **Notes**: Hardcoded data, untreated boundaries, unresolved follow-ups, or none.
```

For Chinese memory, use `目标`, `核心文件明细`, and `遗留问题/备注` for the same fields.

### Context Log Quality Rules

- For code, config, docs, or workflow files, describe at least two of: interaction, data/state, output, rule, contract, or operational change.
- For presentation-only or layout-only files, describe the exact surface and issue solved.
- Do not write filler such as "basic component", "contains logic", "for display", "基础组件", "包含逻辑", or "用于展示".
- Do not batch unrelated core files into one vague bullet. Split them by file and describe the specific change.

## Durable Truth Template

```markdown
- `<rule>` [WHY]: `<business reason, contract reason, technical pitfall, or debugging conclusion>`
  - **Evidence**: `<user statement | existing memory | docs/schema/tests/spec | implementation contract>`
  - **Applies When**: `<when future agents should rely on this rule>`
  - **Status**: `current | deprecated | superseded`
  - **Since**: `YYYY-MM-DD`
  - **Supersedes**: `<old rule or None>`
  - **Related Domains**: `<domain list or None>`
  - **History**: `<history/events/YYYY/MM/YYYY-MM-DD-<event-slug>.md or None>`
```

`History` is optional. Use `None` when there is no specific history event. Do not create a history event just to fill this field.

### Durable Truth Notes

- `[WHY]` must explain the business reason, contract reason, technical pitfall, or debugging conclusion.
- Only `Status: current` truths are binding. `deprecated` and `superseded` truths must point to the replacement rule or decision.

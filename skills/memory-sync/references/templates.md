# Memory Sync Templates

Use these templates only when the existing memory file has no stronger local format.

## Context Log Template

For English memory:

```markdown
### [YYYY-MM-DD] Short feature title

- **Goal**: One sentence describing the goal.
- **Reason**: Changed X because Y; prevents Z.
- **Core Files**:
  - `path/to/file`: [Name] - What changed and what behavior/data/contract/output it affects.
- **Verification / Notes**: Verification run, unresolved follow-ups, hardcoded data, or none.
```

### Context Log Quality Rules

- Every non-trivial context log must include `Reason`.
- File bullets should state the affected behavior, data, contract, output, or operational flow; avoid repeating the global reason unless the file-specific reason differs.
- For code, config, docs, or workflow files, describe at least two of: interaction, data/state, output, rule, contract, or operational change.
- For presentation-only or layout-only files, describe the exact surface and issue solved.
- Do not write filler such as "basic component", "contains logic", "for display".
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

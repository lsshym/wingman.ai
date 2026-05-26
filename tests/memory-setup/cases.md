# memory-setup Test Cases

## Runner Format Contract

The memory runner depends on these heading names and case shapes. Do not rename them unless `tests/runner/memory/eval-memory.mjs` is updated in the same change:

- `## MEMSETUP-001: ...`
- `### Initial Workspace`
- file fixtures as `` `path/to/file` `` followed by a fenced code block
- `### Task Prompt`

## Case Index

| Case ID | Goal | Type |
| --- | --- | --- |
| `MEMSETUP-001` | Initialize memory in disabled repository | Positive |
| `MEMSETUP-002` | Preserve existing memory files | Repair |
| `MEMSETUP-003` | Repair partial memory | Repair |
| `MEMSETUP-004` | Do not setup without explicit request | Gate |
| `MEMSETUP-005` | Use clear user language preference | Language |

## MEMSETUP-001: Initialize memory in disabled repository

### Initial Workspace

`README.md`

```markdown
# Demo
```

No `.wingman/` directory exists.

### Task Prompt

```text
/memory-setup
```

### Expected Behavior

- Create `.wingman/memory/`.
- Create `.wingman/memory/brief.md`.
- Create `.wingman/memory/context.md`.
- Do not create `.wingman/memory/domains/`.
- Do not create `.wingman/memory/history/`.
- Report created paths.

### Pass Assertions

- `brief.md` contains Memory Settings, Architecture Decisions, Domain Registry, Memory Layout, and Authority Order sections.
- `context.md` contains Pending Tasks, Current Work, and Recent Logs sections.
- The initial log says Wingman memory is enabled.

## MEMSETUP-002: Preserve existing memory files

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `zh-CN`

## 1. Architecture Decisions (ADR - Global Rules)
- Existing user-authored ADR must remain.

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
```

`.wingman/memory/context.md`

```markdown
# Memory Context

## Pending Tasks
- [ ] Preserve this task.

## Current Work
- User-authored current work.
```

### Task Prompt

```text
Run memory-setup to make sure Wingman memory is initialized.
```

### Expected Behavior

- Treat setup as a repair check.
- Do not overwrite either existing file.
- Do not create `domains/` or `history/`.
- Report that existing core files were already present or preserved.

### Forbidden Behavior

- Replacing the existing ADR or pending task with templates.

### Pass Assertions

- Existing ADR text remains.
- Existing pending task remains.
- No template-only rewrite occurred.

## MEMSETUP-003: Repair partial memory

### Initial Workspace

`.wingman/memory/brief.md`

```markdown
# Memory Brief

## 0. Memory Settings
- **Language**: `auto`

## 2. Domain Registry
| Domain | Read When | Current File | History | Aliases | Related Domains | Status |
| --- | --- | --- | --- | --- | --- | --- |
```

No `.wingman/memory/context.md` exists.

### Task Prompt

```text
Please initialize or repair Wingman memory with memory-setup.
```

### Expected Behavior

- Preserve existing `brief.md`.
- Create missing `context.md`.
- Do not create `domains/` or `history/`.
- Report the repaired path.

### Pass Assertions

- `brief.md` remains unchanged.
- `context.md` exists and follows the context template.

## MEMSETUP-004: Do not setup without explicit request

### Initial Workspace

`src/index.ts`

```ts
export const value = 1;
```

No `.wingman/` directory exists.

### Task Prompt

```text
Before changing this project, check whether there is memory and continue normally.
```

### Expected Behavior

- Do not run `memory-setup`.
- Do not create `.wingman/`.
- Continue normally or report that memory is disabled only if directly relevant.

### Forbidden Behavior

- Creating memory files because memory is missing.

### Pass Assertions

- `.wingman/` does not exist after the task.

## MEMSETUP-005: Use clear user language preference

### Initial Workspace

No `.wingman/` directory exists.

### Task Prompt

```text
请用 /memory-setup 初始化 Wingman 记忆，记忆内容用中文。
```

### Expected Behavior

- Create core memory files.
- Set `Language` in `brief.md` to `zh-CN` or another explicit Chinese setting.
- Write generated memory content in Chinese when practical while preserving code paths unchanged.

### Forbidden Behavior

- Setting language to `auto` despite the clear Chinese preference.

### Pass Assertions

- `brief.md` contains a clear Chinese memory language setting.
- Final answer reports created paths.

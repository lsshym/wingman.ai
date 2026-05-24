# Wingman

[English](README.md) | [中文](README.zh-CN.md)

Wingman is a coding-agent plugin with project memory, contract checks, reuse helpers, and focused refactor workflows.

## Install

For Codex:

```bash
curl -fsSLO https://raw.githubusercontent.com/lsshym/wingman.ai/main/scripts/install-codex-wingman.sh
bash install-codex-wingman.sh --self-delete
```

Restart Codex after installation.

For Cursor or Claude Code, use the plugin metadata in this repository. Skill names may appear with a platform namespace, such as `/wingman:memory-setup`.

## Memory Skills

Use these as a simple memory workflow for each repository.

### `memory-setup`

Use once when you want Wingman memory in a repository.

```text
/memory-setup
```

### `memory-load`

Use before meaningful work, especially bug fixes, refactors, business logic, API work, or existing feature changes.

```text
Use `memory-load` before this bug fix.
```

```text
Load Wingman memory before changing the upload flow.
```

### `memory-sync`

Use after meaningful work when the agent should record useful project knowledge.

```text
Use `memory-sync` to record the API contract decision from this change.
```

```text
Sync memory for this bug fix, but do not write unrelated history events.
```

### `memory-clean`

Use only when you explicitly want memory compacted, pruned, deduplicated, or corrected.

```text
Use `memory-clean` to compact the current memory context.
```

## Independent Skills

These skills are separate from the memory workflow. Use them when they fit the task.

### `align-contracts`

Use when connecting APIs, schemas, types, events, configs, data models, CLI inputs, or UI props.

```text
Use `align-contracts` to bind this API response into the existing React component.
```

### `reuse-select`

Use before building something new when an existing component, utility, module, contract, or pattern may already exist.

```text
Use `reuse-select` before creating a new upload progress component.
```

### `reuse-catalog`

Use after creating or finding one reusable implementation that future agents should consider.

```text
Use `reuse-catalog` for src/components/UploadProgress.tsx.
```

### `react-ts-refactor`

Use only when you explicitly want the React + TypeScript refactor diagnostic workflow.

```text
/react-ts-refactor
```

### `using-wingman`

This is Wingman's entry skill for platforms that load plugin-level instructions. You usually do not need to call it directly.

```text
Use `using-wingman` to load the Wingman skill guide.
```

## Slash Aliases

```text
/memory-setup
/reuse-select
/reuse-catalog
/react-ts-refactor
```

## Notes

- User instructions and project-local instructions still come first.
- Wingman memory files live inside the current repository under `.wingman/`.
- `memory-setup`, `memory-clean`, and `react-ts-refactor` run only when you directly ask for them.

## License

MIT

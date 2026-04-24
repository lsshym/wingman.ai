# Wingman

> A cross-platform AI engineering plugin for execution, context, and reuse.

Wingman packages one shared content core for practical engineering execution, advanced context workflows, and reusable project asset lookup across multiple AI coding platforms.

## Principles

- One shared content core
- Platform differences isolated to lightweight metadata shells
- YAML frontmatter enables discovery where platforms support it
- Shared prompt bodies stay centralized and duplication-free

## Directory Layout

```text
.
├── .codex/
├── .cursor-plugin/
├── commands/
├── docs/
├── skills/
├── rules/
├── package.json
└── README.md
```

## Core Engineering

- `/api-bind`
- `/zod-gen`
- `/refactor`
- `/refactor-types`

## Advanced Context

- `/memory-setup`
- `/memory-sync`

Best for repositories with longer timelines, collaborative work, or codebases where durable context matters.

## Project Registry

- `/reg`
- `/find`

## Included Rules

- `rules/system-core.mdc`
- `rules/hierarchy.mdc`

Both rule files include `alwaysApply: true` so they behave as always-on rules in platforms that support this metadata.

## Packaging Model

Wingman keeps one shared content core at the repository root:

- `rules/`
- `skills/`
- `commands/`

Platform wrappers stay thin:

- `.cursor-plugin/plugin.json`
- `.codex/marketplace.json`

Cross-platform means shared content and aligned public capability names, not guaranteed identical runtime behavior on every platform.

## License

MIT

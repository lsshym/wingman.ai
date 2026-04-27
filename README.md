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
├── .codex-plugin/
├── .cursor-plugin/
├── .claude-plugin/
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

- `memory-load`
- `memory-sync`
- `/memory-setup`

Best for repositories with longer timelines, collaborative work, or codebases where durable context matters.

Wingman stores project memory in `.wingman/memory/` inside the target repository. Platform entry files such as `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/wingman-memory.mdc` should point agents to the same memory root.

## Language Policy

Wingman's published plugin instructions are written in English. Generated memory content is adaptive: it follows `.wingman/memory/projectBrief.md` -> `Memory Settings` -> `Language` when configured, otherwise it follows the existing memory language, the user's current language, then English as fallback.

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
- `.codex-plugin/plugin.json`
- `.codex/marketplace.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

Cross-platform means shared content and aligned public capability names, not guaranteed identical runtime behavior on every platform.

## License

MIT

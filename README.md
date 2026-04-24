# Wingman

> Write once, run everywhere.

Wingman is a multi-platform AI engineering playbook packaged for both Cursor and Codex.

The repository is organized around one shared core:

- `skills/` contains reusable runtime skill prompts
- `rules/` contains shared system rule prompts
- `.cursor-plugin/plugin.json` is the Cursor metadata shell
- `.codex/marketplace.json` is the Codex metadata shell

## Principles

- One shared core for both platforms
- Platform differences isolated to metadata shells
- No duplicated prompt logic across wrappers
- Repository root acts as the publishable plugin package

## Directory Layout

```text
.
├── .cursor-plugin/
├── .codex/
├── skills/
├── rules/
├── package.json
└── README.md
```

## Included Skills

- `/api-bind`
- `/find`
- `/init`
- `/memo`
- `/refactor`
- `/refactor-types`
- `/reg`
- `/zod-gen`

## Included Rules

- `SYSTEM CORE`
- `HIERARCHY PROTOCOL`

## Packaging Model

Wingman keeps prompt logic in the shared core and uses lightweight metadata wrappers for platform integration.

Today, Cursor and Codex both load the same `skills/` and `rules/`.
If platform-specific divergence is needed later, the wrappers can change their references without rewriting the shared core.

## License

MIT

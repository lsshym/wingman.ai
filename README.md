# Wingman

> Cursor-native skills, packaged cleanly.

Wingman is an AI engineering skill pack organized around Cursor's native `skills/`, `commands/`, and `rules/` conventions.

The repository is organized around one shared core plus a Codex packaging wrapper:

- `rules/` contains always-on global rule files in `.mdc` format
- `skills/` contains dual-mode Cursor skills with YAML frontmatter
- `commands/` contains manual-first workflows with slash-command metadata
- `.cursor-plugin/plugin.json` points Cursor at the shared `skills/` and `rules/`
- `.codex/marketplace.json` keeps the repository packageable from the same root

## Principles

- Cursor-native structure first
- YAML frontmatter drives both manual discovery and automatic recall
- Shared prompt bodies stay centralized and duplication-free
- Codex remains a lightweight wrapper over the same package root

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

## Included Skills

- `/api-bind`
- `/find`
- `/init`
- `/reg`
- `/zod-gen`

Each skill now lives in `skills/<name>/SKILL.md` and exposes its public trigger through frontmatter `name`.

## Included Commands

- `/memo`
- `/refactor`
- `/refactor-types`

These manual workflows live directly under `commands/` and also use frontmatter `name` for slash discovery.

## Included Rules

- `rules/system-core.mdc`
- `rules/hierarchy.mdc`

Both rule files include `alwaysApply: true` so they behave as global Cursor rules.

## Packaging Model

Wingman now packages its Cursor-facing behavior through native directory semantics plus YAML frontmatter instead of relying on flat filenames alone.

Cursor is the primary runtime target in this repository state.
Codex support is retained as a packaging wrapper through `.codex/marketplace.json`, but the content layer is optimized for Cursor-native triggering and discovery.

## Public Entry Names

The release-facing command surface is:

- `/api-bind`
- `/find`
- `/init`
- `/memo`
- `/refactor`
- `/refactor-types`
- `/reg`
- `/zod-gen`

The previous `init-momory` spelling is no longer exposed as the primary public entry.

## License

MIT

# Wingman

> Shared core, platform shells.

Wingman is a cross-platform AI engineering plugin package built around one shared content core and thin platform-specific wrappers.

The shared core lives at the repository root:

- `rules/` contains global rule files in `.mdc` format
- `skills/` contains reusable skill capabilities with YAML frontmatter
- `commands/` contains manual-first workflows with slash-command metadata

Platform wrappers stay thin:

- `.cursor-plugin/plugin.json` maps Cursor to the shared `rules/`, `skills/`, and `commands/`
- `.codex/marketplace.json` packages the same repository root for Codex

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

## Included Skills

- `/api-bind`
- `/find`
- `/init`
- `/reg`
- `/zod-gen`

Each skill lives in `skills/<name>/SKILL.md` and exposes its public trigger through frontmatter `name`.

## Included Commands

- `/memo`
- `/refactor`
- `/refactor-types`

These manual workflows live directly under `commands/` and also use frontmatter `name` for slash discovery.

## Included Rules

- `rules/system-core.mdc`
- `rules/hierarchy.mdc`

Both rule files include `alwaysApply: true` so they behave as always-on rules in platforms that support this metadata.

## Packaging Model

Wingman uses Cursor-compatible directory semantics and frontmatter as the canonical packaging shape because they are explicit, portable, and easy to wrap for other ecosystems.

Cursor is one supported target, not the identity of the project.
Codex and future platforms should consume the same shared core through wrapper metadata rather than through duplicated prompt bodies.

## Cursor Compatibility

The current layout follows Cursor's plugin reference:

- rules live in `rules/*.mdc`
- skills live in `skills/<name>/SKILL.md`
- commands live in `commands/*.md`
- `.cursor-plugin/plugin.json` uses root-relative component paths without `..`

This keeps the package compatible with Cursor's discovery rules while preserving a platform-neutral repository core.

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

# Wingman Cross-Platform Skills Packaging Upgrade Design

## Overview

This design defines the second-stage packaging upgrade for `wingman`.

The goal of this stage is to move the repository from a flat prompt layout into a frontmatter-driven, cross-platform packaging shape that remains compatible with Cursor's native plugin discovery model.

This upgrade supports both:

- manual slash-command invocation
- automatic skill recall through YAML frontmatter metadata

This stage is intentionally structural and packaging-focused.
It does not rewrite the core strategy bodies of the existing prompts.

## Approved Migration Mode

This upgrade uses the approved "balanced" migration mode:

- adopt Cursor-compatible directory and file conventions as the canonical shared layout
- inject YAML frontmatter into rules, skills, and commands
- normalize public-facing entry names where necessary
- avoid rewriting the core strategy logic bodies

## Goals

- Convert reusable auto-recall capabilities into `skills/<name>/SKILL.md`
- Reintroduce a dedicated `commands/` directory for manual-only workflows
- Rename global rules into `.mdc` files with required frontmatter
- Use frontmatter `name` for manual trigger identity
- Use frontmatter `description` for automatic recall hints
- Resolve the public `/memory-setup` and `/memory-sync` naming without preserving older entrypoints as the primary public entry
- Keep repository metadata and README aligned with the new structure
- Preserve a platform-neutral shared core that can be wrapped by Cursor, Codex, and future platforms

## Non-Goals

- No deep rewrite of the existing strategic logic
- No attempt to fully redesign Codex-native runtime behavior in this stage
- No large-scale rewriting of platform-specific assumptions inside the prompt bodies
- No functional expansion beyond packaging, naming normalization, and discoverability metadata

## Target Repository Structure

```text
.
├── .codex/
│   └── marketplace.json
├── .cursor-plugin/
│   └── plugin.json
├── commands/
│   ├── memory-sync.md
│   ├── refactor-types.md
│   └── refactor.md
├── rules/
│   ├── hierarchy.mdc
│   └── system-core.mdc
├── skills/
│   ├── api-bind/
│   │   └── SKILL.md
│   ├── find/
│   │   └── SKILL.md
│   ├── memory-setup/
│   │   └── SKILL.md
│   ├── reg/
│   │   └── SKILL.md
│   └── zod-gen/
│       └── SKILL.md
├── package.json
└── README.md
```

## Capability Partitioning

### Skills

The following capabilities move into `skills/` because they should be available as both manual entries and automatic recall candidates on platforms that support this model:

- `api-bind`
- `find`
- `memory-setup`
- `reg`
- `zod-gen`

### Commands

The following capabilities stay manual-first inside `commands/` because they are workflow-driven and should remain explicit:

- `memory-sync`
- `refactor`
- `refactor-types`

## Naming Decisions

### `/memory-setup`

The public entry is normalized to `/memory-setup`.

Implementation decision:

- the physical path becomes `skills/memory-setup/SKILL.md`
- the frontmatter `name` becomes `memory-setup`
- the previous init misspelling is retired as a public packaging identifier

This resolves the release-facing naming inconsistency while preserving the existing strategy body content.

### Other Names

The following public names remain unchanged in this stage:

- `api-bind`
- `find`
- `reg`
- `zod-gen`
- `memory-sync`
- `refactor`
- `refactor-types`

## Frontmatter Requirements

### Rules

Each rule file must:

- use the `.mdc` suffix
- include YAML frontmatter
- set `alwaysApply: true`
- provide a concise `description`

Example shape:

```md
---
description: ...
alwaysApply: true
---
```

### Skills

Each skill file must:

- live inside `skills/<name>/`
- be named exactly `SKILL.md`
- include YAML frontmatter with `name` and `description`

Example shape:

```md
---
name: api-bind
description: ...
---
```

### Commands

Each command file must:

- live directly under `commands/`
- include YAML frontmatter with `name` and `description`

## Metadata Strategy

### Cursor

`.cursor-plugin/plugin.json` must follow Cursor's plugin submission rules:

- use root-relative component paths without `..`
- explicitly point to `./rules`, `./skills`, and `./commands`
- remain a thin wrapper over the shared core

No runtime prompt duplication is introduced in metadata.

### Codex

`.codex/marketplace.json` remains as the Codex packaging shell for this stage.

This stage does not promise full Codex-native parity for automatic skill recall semantics.
The Codex wrapper remains distribution-oriented while consuming the same shared core.

## README Positioning

The README must be updated to reflect:

- the new split between `skills/`, `commands/`, and `rules/`
- the use of YAML frontmatter for discoverability
- the project as a cross-platform plugin package rather than a Cursor-only artifact
- Cursor retained as the most explicit compatibility target for structure and metadata
- Codex retained as a packaging wrapper, not as a fully equivalent trigger model claim
- the normalized `/memory-setup` and `/memory-sync` public entries

## Content Preservation Boundary

The migration must preserve the existing core strategy bodies.

Allowed content edits:

- prepend frontmatter
- rename files and relocate files
- fix packaging-facing inconsistencies created by the migration
- repair obvious formatting defects that break rendering or command readability
- update README and metadata

Disallowed content edits:

- rewriting strategic logic
- changing the substantive behavioral protocols inside the migrated prompt bodies
- broad product-copy rewrites of individual prompt internals

## Known Cleanup Included In Scope

The following lightweight cleanup is explicitly allowed because it supports publishability without altering strategy:

- close broken Markdown code fences
- remove or correct empty placeholder anchors that are clearly malformed packaging artifacts
- align README command names with actual public entries

## Invariants

The following conditions must remain true after the migration:

- `wingman` remains the package identity
- Cursor metadata points to shared `rules/`, `skills/`, and `commands/` using root-relative paths
- each skill lives in its own directory and uses `SKILL.md`
- each rule uses `.mdc` plus `alwaysApply: true`
- core strategy bodies are not substantively rewritten
- `/memory-setup` and `/memory-sync` are the normalized public entries
- the repository remains a shared core rather than a Cursor-only package

## Validation Criteria

The upgrade is complete when all of the following are true:

1. `rules/` contains only `.mdc` rule files with frontmatter.
2. `skills/` contains only per-skill directories with `SKILL.md`.
3. `commands/` exists and contains the approved manual workflows with frontmatter.
4. `.cursor-plugin/plugin.json` points to the shared `rules/`, `skills/`, and `commands/` using valid root-relative paths.
5. README reflects the new architecture and command surface.
6. The repository no longer exposes `init-momory` as the primary public skill identity.
7. The migrated files preserve their original strategic bodies apart from approved wrapper edits.

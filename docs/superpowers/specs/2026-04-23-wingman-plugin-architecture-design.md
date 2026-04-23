# Wingman Plugin Architecture Design

Date: 2026-04-23
Status: Draft for review
Scope: Repository architecture migration for public multi-platform plugin packaging

## Summary

This design restructures the current repository into a publishable `wingman` plugin package that can serve both Cursor and Codex from one shared core. The core principle is capability/configuration separation:

- `skills/` and `rules/` hold the single source of truth for runtime logic
- `.cursor-plugin/plugin.json` and `.codex/marketplace.json` act as platform-specific metadata shells
- platform differences are isolated at the shell layer
- Markdown instruction bodies remain unchanged in this phase

The repository root itself becomes the plugin project root. No additional `agentic-core/` wrapper directory will be introduced.

## Goals

- Publish the current repository as a public plugin package under the name `wingman`
- Support both Cursor and Codex from the same repository
- Keep one shared set of skills and rules for both platforms
- Separate platform metadata from prompt logic so future platform divergence can be handled by changing shell config only
- Perform only physical file moves, renames, additions, and deletions in the migration phase

## Non-Goals

- Rewriting any Markdown instruction body
- Renaming command identifiers inside existing Markdown content
- Introducing platform-specific prompt logic in this phase
- Completing marketplace-specific validation beyond the agreed metadata shell structure

## Architecture Decision

The repository will use a single-package, single-core, dual-shell architecture:

1. The repository root is the publishable plugin root.
2. `skills/` is the only core skill directory.
3. `rules/` is the only core rule directory.
4. Cursor and Codex each get a lightweight shell config directory at the root.
5. Both shells reference the same shared core directories.

This structure optimizes for "Write Once, Run Everywhere" while preserving a clean future path for platform-specific divergence at the shell layer only.

## Target Repository Structure

```text
.
├── .cursor-plugin/
│   └── plugin.json
├── .codex/
│   └── marketplace.json
├── skills/
│   ├── api-bind.md
│   ├── find.md
│   ├── init-momory.md
│   ├── memo.md
│   ├── refactor-types.md
│   ├── refactor.md
│   ├── reg.md
│   └── zod-gen.md
├── rules/
│   ├── HIERARCHY PROTOCOL.md
│   └── SYSTEM CORE.md
├── LICENSE
├── package.json
├── README.md
└── 模型生态选型报告.md
```

## File Migration Plan

### Skills

The following runtime skill files move from `commands/` into `skills/` without content changes:

- `commands/api-bind.md` -> `skills/api-bind.md`
- `commands/find.md` -> `skills/find.md`
- `commands/init-momory.md` -> `skills/init-momory.md`
- `commands/memo.md` -> `skills/memo.md`
- `commands/refactor-types.md` -> `skills/refactor-types.md`
- `commands/refactor.md` -> `skills/refactor.md`
- `commands/reg.md` -> `skills/reg.md`
- `commands/zod-gen.md` -> `skills/zod-gen.md`

### Rules

The following files move from `user-rules/` into `rules/`:

- `user-rules/HIERARCHY PROTOCOL.md` -> `rules/HIERARCHY PROTOCOL.md`
- `user-rules/SYSTEM CORE` -> `rules/SYSTEM CORE.md`

The second move includes a filename normalization to add the `.md` extension.

## Metadata Shell Design

### Cursor shell

Path: `.cursor-plugin/plugin.json`

Purpose:

- declare the public plugin identity as `wingman`
- expose the shared `skills/` directory
- expose the shared `rules/` directory

Design rule:

- no prompt logic lives in this file
- only metadata and core path references are allowed

### Codex shell

Path: `.codex/marketplace.json`

Purpose:

- register the repository root as a plugin source
- expose `wingman` as the public plugin identity for Codex-side discovery

Design rule:

- no skill or rule content duplication
- only source mapping and marketplace metadata

## Public Identity Rules

- The official public plugin name is `wingman`
- The migration must not use `agentic-core` as the published package or plugin identity
- `package.json` should use the `wingman` identity in the migration phase
- `README.md` should be updated later in the migration phase to describe `wingman` as a multi-platform plugin, not a Cursor-only playbook

## Pruning Strategy

The migration should remove non-runtime and redundant artifacts that do not belong in the published plugin package.

### Remove entirely

- `example/`

### Remove from the old commands area instead of migrating

- all `*.zh.md` files
- all `*.readme.md` files
- `init-momory-buff.md`
- any other command-side derivative file not listed in the target `skills/` set

### Remove after migration

- the emptied `commands/` directory
- the emptied `user-rules/` directory

## Preservation Rules

- Do not edit the body content of any migrated Markdown file
- Do not rename instruction names inside the Markdown files
- Preserve core logic exactly as-is during the architecture migration
- Keep `模型生态选型报告.md` in the repository because it is outside the requested pruning scope

## Validation Criteria

The migration is complete only when all of the following are true:

1. The repository root contains `.cursor-plugin/`, `.codex/`, `skills/`, and `rules/`
2. The old `commands/`, `user-rules/`, and `example/` directories no longer exist
3. All eight target skill files exist in `skills/`
4. Both target rule files exist in `rules/`
5. `SYSTEM CORE` has been normalized to `SYSTEM CORE.md`
6. Cursor and Codex shell configs both point to the shared core directories
7. The public identity is consistently `wingman`
8. `package.json` exists and is aligned with public package publication
9. `README.md` reflects cross-platform plugin packaging rather than Cursor-only positioning

## Risks And Follow-Up

### Known risks

- Marketplace validation may require additional fields beyond the agreed shell configs
- Some Markdown files may still contain historical references to old directory names after the physical migration
- Different plugin ecosystems may impose additional packaging rules outside this architecture phase

### Follow-up after migration

- validate metadata against actual Cursor and Codex marketplace requirements
- revise README wording for public install flows
- inspect migrated Markdown files for stale path references in a separate semantic cleanup phase

## Recommended Next Step

After this spec is approved, create a written implementation plan for the physical migration only. That next phase should cover:

- exact move, rename, create, and delete operations
- metadata file contents for both platform shells
- creation of `package.json`
- README positioning update
- validation commands and final tree reporting

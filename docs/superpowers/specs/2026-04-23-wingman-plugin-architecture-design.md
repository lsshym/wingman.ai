# Wingman Plugin Architecture Design

> Historical note: this document captures the first-stage flat-file migration design from April 23, 2026. The current repository shape and public memory entrypoints are defined by the newer April 24, 2026 specs, including [2026-04-24-wingman-cursor-native-skills-upgrade-design.md](./2026-04-24-wingman-cursor-native-skills-upgrade-design.md) and [2026-04-24-wingman-product-positioning-design.md](./2026-04-24-wingman-product-positioning-design.md).

## Overview

This design defines the first-stage engineering migration of the current repository into a market-ready, multi-platform plugin package named `wingman`.

The core principle is capability and configuration separation:

- Core capability files live in shared `skills/` and `rules/` directories.
- Platform-specific metadata lives only in lightweight wrapper directories.
- Cursor and Codex both reference the exact same core files.
- No Markdown instruction body content is changed in this stage.

This is a physical repository restructuring effort, not a semantic rewrite of the prompts or protocols.

## Goals

- Turn the current repository root into the publishable plugin package root for `wingman`
- Keep one authoritative copy of all runtime skill and rule files
- Expose the same `skills/` and `rules/` to both Cursor and Codex
- Isolate platform differences to metadata wrapper files only
- Remove example and non-runtime files that should not ship in a production plugin package
- Preserve existing Markdown instruction bodies without editing their internal command names or content

## Non-Goals

- No changes to the internal body text of the migrated Markdown files
- No renaming of command identifiers inside Markdown content
- No platform-specific divergence in the core skill and rule files
- No attempt in this stage to validate live marketplace submission rules beyond the agreed metadata structure
- No implementation of new commands, new rules, or new runtime behavior

## Packaging Strategy

The repository itself becomes the `wingman` plugin package.

The package is organized as a single shared core plus two metadata shells:

- `skills/` contains the shared runtime skill prompts
- `rules/` contains the shared system rule prompts
- `.cursor-plugin/plugin.json` is the Cursor metadata shell
- `.codex/marketplace.json` is the Codex metadata shell

This keeps the architecture minimal while preserving a clean expansion path:

- Today: both platforms load the same shared core
- Later: each platform can point to a different subset or mapping by changing only metadata shell references

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

## Core File Migration Rules

### Skill Files

The following files are migrated from `commands/` into `skills/` with the same filenames:

- `api-bind.md`
- `find.md`
- `init-momory.md`
- `memo.md`
- `refactor-types.md`
- `refactor.md`
- `reg.md`
- `zod-gen.md`

These files remain content-identical during this phase.

### Rule Files

The following files are migrated from `user-rules/` into `rules/`:

- `HIERARCHY PROTOCOL.md`
- `SYSTEM CORE` renamed to `SYSTEM CORE.md`

These files also remain content-identical during this phase, except for the physical filename normalization of `SYSTEM CORE.md`.

## Metadata Shell Design

### Cursor Metadata Shell

File:

`/.cursor-plugin/plugin.json`

Purpose:

- Declare the publishable Cursor-facing identity for `wingman`
- Point Cursor to the shared `skills/` and `rules/` core directories
- Avoid duplicating any runtime prompt logic inside the shell

Current agreed structure:

```json
{
  "name": "wingman",
  "displayName": "Wingman",
  "description": "Enterprise-grade architectural workflow and memory system.",
  "version": "1.0.0",
  "skills": "../skills/",
  "rules": "../rules/"
}
```

### Codex Metadata Shell

File:

`/.codex/marketplace.json`

Purpose:

- Declare the Codex-facing plugin source
- Point Codex back to the current repository root as the plugin package source
- Keep platform-specific behavior isolated to metadata only

Current agreed structure:

```json
{
  "name": "wingman-marketplace",
  "plugins": [
    {
      "name": "wingman",
      "version": "1.0.0",
      "source": "../",
      "description": "Multi-platform AI engineering playbook."
    }
  ]
}
```

## Root Metadata Requirements

### package.json

A new root `package.json` is introduced because the repository currently has no package manifest.

Requirements for this file:

- Package name uses `wingman`
- Version starts at `1.0.0`
- The file represents the package as the canonical plugin root
- The manifest should stay minimal and focused on distribution identity in this phase

### README.md

The root `README.md` should be updated to reflect the new public identity of the repository:

- The package is `wingman`, not a Cursor-only playbook
- The repository now targets multi-platform plugin packaging
- The README should explain the shared-core plus metadata-shell model
- The README should describe install and structure at a package level

This documentation update is allowed because it is repository metadata, not core runtime Markdown logic.

## Pruning Rules

The plugin package should ship only runtime-relevant and distribution-relevant files for this stage.

The following cleanup rules apply:

- Delete the entire `example/` directory
- Remove non-runtime derivative files from `commands/`, including:
  - `*.zh.md`
  - `*.readme.md`
  - other non-target derivative files such as `init-momory-buff.md`
- Delete the old `commands/` directory after migration and pruning
- Delete the old `user-rules/` directory after migration

The file `模型生态选型报告.md` remains in the repository because it was not included in the requested deletion scope.

## Invariants

The following conditions must remain true after migration:

- Both Cursor and Codex reference the same `skills/` directory
- Both Cursor and Codex reference the same `rules/` directory
- Platform-specific differences are contained only in metadata shell files
- No Markdown instruction body content changes are introduced in migrated core files
- The repository root remains the publishable package root

## Validation Criteria

The migration is complete when all of the following are true:

1. The repository structure matches the agreed target layout.
2. The `skills/` directory contains exactly the agreed runtime core files.
3. The `rules/` directory contains `HIERARCHY PROTOCOL.md` and `SYSTEM CORE.md`.
4. `.cursor-plugin/plugin.json` and `.codex/marketplace.json` both point to the same shared core directories or repository root as designed.
5. `commands/`, `user-rules/`, and `example/` no longer exist.
6. A root `package.json` exists for the `wingman` package.
7. `README.md` reflects the package as a multi-platform `wingman` plugin.

## Risks And Boundaries

### Marketplace Validation Risk

The agreed metadata format is sufficient for this restructuring design, but real marketplace ingestion rules may later require stricter fields or packaging conventions.

That later validation step is outside this stage.

### Historical Reference Risk

Some Markdown bodies may still contain references to legacy directory names or platform-specific assumptions.

Those references are intentionally not edited in this stage because the current migration is restricted to physical structure and packaging metadata.

### Scope Boundary

This stage prepares the repository to behave like a standardized plugin package root.

It does not guarantee immediate acceptance into every public marketplace without a later compatibility pass.

## Delivery

The deliverable for this design stage is:

- this approved architecture spec written to the repository
- no core runtime Markdown rewrites
- no implementation changes performed until planning and implementation are explicitly authorized

## Next Step

Once this design is approved, the next step is to create an implementation plan for the repository migration, then execute the file moves, metadata creation, cleanup, and verification.

# Wingman Plugin Architecture

Wingman is moving from a loose set of workflow notes toward a small plugin-style
package.

The current design keeps the reusable workflow content in one shared place and
lets platform-specific files act as thin metadata shells.

## Goals

- Keep workflow instructions in `skills/`.
- Keep each workflow in its own `SKILL.md` file.
- Let editor or agent integrations reference the same shared skills.
- Avoid duplicating prompt content for each platform.

## Current Structure

```text
.
├── .cursor-plugin/
│   └── plugin.json
├── skills/
│   ├── api-bind/
│   │   └── SKILL.md
│   ├── memory-setup/
│   │   └── SKILL.md
│   └── ...
├── package.json
└── README.md
```

## Shared Core

The `skills/` directory is the shared core. A workflow should live there once
and be referenced by platform metadata instead of copied into multiple platform
directories.

This keeps early changes simple:

- update one skill file;
- keep platform wrappers small;
- avoid divergent prompt versions.

## Platform Shells

Platform-specific folders should hold metadata only.

For now, `.cursor-plugin/plugin.json` declares the Cursor-facing plugin identity
and points to the shared `skills/` directory.

Future platform shells can follow the same pattern if the shared skill format
continues to work.

## Boundaries

This architecture step does not rewrite workflow content. It only defines where
shared content and platform metadata should live.

Deeper naming cleanup, additional platform support, packaging scripts, and
release validation can happen in later steps.

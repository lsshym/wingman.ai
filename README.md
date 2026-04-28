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
├── package.json
└── README.md
```

## Core Engineering

- `using-wingman`
- `align-contracts`
- `/zod-gen`
- `/refactor`
- `/refactor-types`

Slash-prefixed entries such as `/zod-gen`, `/reg`, or `/refactor` are user-facing manual invocation names. The backing content may live under `skills/` or `commands/` depending on platform support. Names without `/` are canonical skill or agent protocol names.

### `using-wingman`

Use as Wingman's plugin entry protocol when a platform supports startup or explicit skill invocation.

It defines:

- instruction priority between users, project-local instructions, Wingman, and default model behavior
- safe editing rules for real file changes versus abbreviated chat snippets
- capability discovery across Wingman skills and commands
- language behavior and platform wrapper expectations

### `align-contracts`

Use when connecting one boundary to another and field shapes or meanings may drift.

Good fit:

- API response -> UI, service, or domain model
- database row -> domain entity
- webhook/event payload -> handler input
- SDK response -> internal model
- config/env/CLI input -> runtime options
- legacy type -> new type
- form state -> request DTO
- AI structured output -> tool or schema input

What it does:

- identifies the provider contract and consumer contract
- decides which side owns the meaning, or when a boundary adapter is appropriate
- separates naming-only changes from semantic mismatches
- prevents ad-hoc call-site mapping, proxy fields, and fake placeholder data
- preserves existing behavior unless the contract requires an explicit change

React and TypeScript frontend binding is kept as a specialization in `skills/align-contracts/references/frontend-react-typescript.md`. Agents should read that reference only when the task involves React, JSX, TypeScript props, frontend components, or backend-response-to-UI binding.

Example prompts:

```text
Use align-contracts to connect this webhook payload to our internal payment event.
Use align-contracts to bind this API response into the existing React component.
Use align-contracts to migrate this legacy DTO to the new domain model.
```

### `/zod-gen`

Use when generating TypeScript Zod schemas for backend or external data contracts.

Good fit:

- validating API payloads at runtime
- transforming `snake_case` API data into clean application types
- deriving TypeScript types from validated schemas

Example prompt:

```text
/zod-gen Generate a strict schema for this API payload and expose the transformed type.
```

### `/refactor`

Use for plan-first logic refactoring. It produces a diagnostic table first and waits for approval before code changes.

Good fit:

- prop explosion
- redundant aliases
- messy deep access
- disorganized component logic
- nested or oversized functions

### `/refactor-types`

Use for plan-first type refactoring. It helps separate types from logic and choose target type paths before editing code.

Good fit:

- extracting inline types
- reusing shared types
- resolving type-name conflicts
- moving local interfaces into domain type files

## Advanced Context

- `memory-load`
- `memory-sync`
- `/memory-setup`

Best for repositories with longer timelines, collaborative work, or codebases where durable context matters.

Wingman stores project memory in `.wingman/memory/` inside the target repository. Platform entry files such as `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/wingman-memory.mdc` should point agents to the same memory root.

### `/memory-setup`

Use once in a target repository to initialize Wingman memory and platform entry files.

It creates:

- `.wingman/memory/projectBrief.md`
- `.wingman/memory/activeContext.md`
- `.wingman/memory/domains/README.md`
- `.wingman/memory/archive/README.md`
- `.wingman/registry/*.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/wingman-memory.mdc`

The generated memory files use English templates by default, with adaptive language controlled by `projectBrief.md` -> `Memory Settings` -> `Language`.

Example prompt:

```text
/memory-setup
```

### `memory-load`

Use before non-trivial work when existing project context may affect the task.

It first decides whether memory is needed. It skips trivial isolated tasks such as small copy edits, formatting, simple style tweaks, or throwaway experiments. It loads memory when work touches existing behavior, business logic, API integration, state flow, permissions, money, orders, field mappings, reusable assets, review, debugging, or refactoring. If uncertain, it loads memory.

What it reads:

- `projectBrief.md` for global rules and domain registry
- `activeContext.md` for hot current work
- relevant domain `index.md` and topic files
- archive files only when history is explicitly needed

It builds an internal checklist and only surfaces it when there is a conflict, missing context, or the user asks.

Example prompts:

```text
Use memory-load before changing this checkout flow.
Load Wingman memory and review the relevant domain before this refactor.
```

### `memory-sync`

Use after meaningful work to record progress and distill durable knowledge.

It records changes when they affect business rules, API contracts, state transitions, field mappings, money calculations, rule checkboxes, debugging conclusions, or durable decisions. It skips low-value noise such as pure formatting, variable renames, or behavior-preserving movement.

It updates:

- `activeContext.md` for short-term progress
- `domains/` for stable business or architecture truths
- `archive/YYYY-MM.md` when active context grows too large

It should not rewrite memory wholesale. It moves complete old log blocks to archive and only deletes logs proven obsolete or replaced.

Example prompts:

```text
Use memory-sync to record the API contract decision from this change.
Sync memory for the checkout bug fix, but do not archive unrelated history.
```

## Language Policy

Wingman's published plugin instructions are written in English. Generated memory content is adaptive: it follows `.wingman/memory/projectBrief.md` -> `Memory Settings` -> `Language` when configured, otherwise it follows the existing memory language, the user's current language, then English as fallback.

## Project Registry

- `/reg`
- `/find`

### `/reg`

Use to register one reusable component, hook, utility, or business component into `.wingman/registry/`.

Good fit:

- after creating a reusable UI component
- after extracting a shared hook or utility
- after identifying a business component worth reusing

It reads the actual source file, extracts precise features and interface shape, deduplicates by path, and appends to exactly one registry file.

### `/find`

Use before building something new when an existing reusable asset may already exist.

Good fit:

- finding similar components
- locating existing utilities
- checking previous reusable implementations

It searches `.wingman/registry/ui-components.md`, `.wingman/registry/business-components.md`, and `.wingman/registry/utils.md`, then returns the best reuse candidates.

## Packaging Model

Wingman keeps one shared content core at the repository root:

- `skills/`
- `commands/`

Platform wrappers stay thin:

- `.cursor-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `.codex/marketplace.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

Cross-platform means shared content and aligned public capability names, not guaranteed identical runtime behavior on every platform. Platforms that support skills should load `skills/`; platforms that support command workflows may also load `commands/`. Platform-specific startup hooks or project entry files should invoke `using-wingman` instead of duplicating the plugin-level protocol.

## License

MIT

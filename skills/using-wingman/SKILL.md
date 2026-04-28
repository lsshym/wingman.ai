---
name: using-wingman
description: Use when starting a Wingman-enabled coding session, adapting Wingman across AI coding platforms, deciding which Wingman skill or command applies, or interpreting Wingman plugin-level instructions versus project-local instructions.
---

# Using Wingman

## Overview

Wingman is a cross-platform engineering plugin built around reusable skills and command workflows. Treat this skill as the plugin entry protocol: it explains capability discovery, instruction priority, safe editing, language behavior, and platform-specific wrappers.

## Instruction Priority

Follow the highest applicable instruction source:

1. Direct user instructions.
2. Project-local instructions such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc`, or `.cursorrules`.
3. Wingman skills and commands.
4. Default model behavior.

Wingman provides plugin defaults. Do not override explicit project rules or user requests with Wingman defaults.

## Capability Discovery

Use Wingman capabilities by trigger, not by platform-specific file names:

- `memory-load`: before non-trivial work where durable project context may matter.
- `memory-sync`: after meaningful work that should be recorded as durable context.
- `align-contracts`: when data, schema, type, or boundary meanings may drift.
- `zod-gen`: when generating strict TypeScript Zod schemas for data contracts.
- `reg`: after creating or identifying a reusable project asset.
- `find`: before rebuilding something that may already exist.
- `memory-setup`, `refactor`, `refactor-types`: manual command workflows.

Slash-prefixed forms such as `/zod-gen`, `/reg`, or `/refactor` are user-facing manual invocation names. The backing content may live under `skills/` or `commands/` depending on platform support.

## Safe Editing

- Preserve existing code during real file edits.
- Do not write placeholder comments such as `// ... existing code ...` into files to stand in for unchanged code.
- Use abbreviated snippets only in chat explanations, examples, or change summaries.
- Keep edits scoped to the user request and the surrounding project design.

## Language

Wingman's published plugin instructions are English by default. Generated memory and user-facing output may adapt to the project memory language or the user's current language.

## Platform Wrappers

Different platforms use different names for persistent instructions and startup behavior. Keep Wingman's canonical behavior in skills and command workflows; platform wrappers may add their own hooks, manifests, or generated project entry files to invoke those capabilities.

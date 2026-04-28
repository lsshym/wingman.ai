---
name: using-wingman
description: Use when starting a Wingman-enabled coding session, adapting Wingman across AI coding platforms, deciding which Wingman skill or command applies, or interpreting Wingman plugin-level instructions versus project-local instructions.
---

# Using Wingman

## Overview

Wingman is a cross-platform engineering plugin built around reusable skills. Treat this skill as the plugin entry protocol: it explains capability discovery, instruction priority, safe editing, language behavior, and platform-specific wrappers.

## Instruction Priority

Follow the highest applicable instruction source:

1. Direct user instructions.
2. Project-local instructions such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc`, or `.cursorrules`.
3. Wingman skills.
4. Default model behavior.

Wingman provides plugin defaults. Do not override explicit project rules or user requests with Wingman defaults.

## Capability Discovery

Use Wingman capabilities by trigger, not by platform-specific file names.

Situational skills may be used when their trigger conditions apply:

- `memory-load`: before non-trivial work where durable project context may matter.
- `memory-sync`: after meaningful work that should be recorded as durable context.
- `align-contracts`: when data, schema, type, or boundary meanings may drift.
- `zod-gen`: when generating strict TypeScript Zod schemas for data contracts.
- `reuse-catalog`: after creating or identifying a reusable project implementation that should become part of the selection map.
- `reuse-select`: before rebuilding something that may already exist, or when deciding whether to reuse, extend, wrap, or create an implementation.

Explicit workflow skills must only run when the user asks for them directly:

- `memory-setup`: initialize Wingman memory files and platform entry files.
- `refactor`: run the interactive logic refactor workflow.
- `refactor-types`: run the interactive type refactor workflow.

Slash-prefixed forms such as `/zod-gen`, `/reuse-catalog`, `/reuse-select`, `/memory-setup`, `/refactor`, or `/refactor-types` are user-facing invocation aliases for skills.

## Safe Editing

- Preserve existing code during real file edits.
- Do not write placeholder comments such as `// ... existing code ...` into files to stand in for unchanged code.
- Use abbreviated snippets only in chat explanations, examples, or change summaries.
- Keep edits scoped to the user request and the surrounding project design.

## Language

Wingman's published plugin instructions are English by default. Generated memory and user-facing output may adapt to the project memory language or the user's current language.

## Platform Wrappers

Different platforms use different names for persistent instructions and startup behavior. Keep Wingman's canonical behavior in skills; platform wrappers may add their own hooks, manifests, or generated project entry files to invoke those capabilities.

---
name: using-wingman
description: Use when starting a Wingman-enabled coding session, adapting Wingman across AI coding platforms, deciding which Wingman skill applies, or interpreting Wingman plugin-level instructions versus project-local instructions.
---

# Using Wingman

## Overview

Wingman is a cross-platform engineering plugin built around reusable skills. Treat this skill as the plugin entry protocol: it explains how Wingman works, capability discovery, instruction priority, safe editing, language behavior, and platform-specific wrappers.

## How Wingman Works

When the user asks how Wingman works, explain it as a practical engineering workflow rather than as an internal rules list.

Wingman helps coding agents with three recurring project risks:

1. **Losing project context**: use memory skills to load relevant project knowledge before meaningful work and sync durable outcomes afterward.
2. **Breaking boundaries**: use contract alignment when data, schemas, types, APIs, events, config, or UI interfaces may drift in meaning.
3. **Rebuilding what already exists**: use the reuse registry to catalog reusable implementations and select the right existing implementation before creating a new one.

Typical flow:

1. Before non-trivial work, `memory-load` decides whether project memory matters and reads only relevant memory files.
2. During implementation, `align-contracts` protects provider/consumer boundaries, and `reuse-select` checks whether an existing implementation should be reused, extended, or wrapped.
3. After creating or identifying a reusable implementation, `reuse-catalog` records it into the reuse registry.
4. Before reporting meaningful work as complete, `memory-sync` records durable progress and decisions when they are worth remembering.
5. `memory-setup`, `refactor`, and `refactor-types` are explicit workflows. Use them only when the user directly asks for them.

Wingman does not try to be a full development methodology. It does not force TDD, subagents, hooks, or a universal planning process. It focuses on making agents steadier in existing projects by preserving context, aligning contracts, and avoiding duplicate implementations.

For a user-facing explanation, prefer this shape:

```markdown
Wingman is a set of coding-agent skills for working safely inside real projects.

It mainly helps with:
- project memory: load context before meaningful work, sync important outcomes afterward
- contract alignment: avoid hiding API/type/schema meaning drift
- reuse decisions: catalog reusable implementations and decide whether to reuse, extend, wrap, or create
- explicit workflows: memory setup and plan-first refactor modes, only when requested

In a normal task, the agent first decides whether memory or reuse context is needed, uses contract checks when boundaries are involved, edits conservatively, then syncs durable knowledge if the work changed something worth remembering.
```

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
- `reuse-catalog`: after creating or identifying a reusable project implementation that should become part of the selection map.
- `reuse-select`: before rebuilding something that may already exist, or when deciding whether to reuse, extend, wrap, or create an implementation.

Explicit workflow skills must only run when the user asks for them directly:

- `memory-setup`: initialize Wingman memory files and platform entry files.
- `refactor`: run the interactive logic refactor workflow.
- `refactor-types`: run the interactive type refactor workflow.

Slash-prefixed forms such as `/reuse-catalog`, `/reuse-select`, `/memory-setup`, `/refactor`, or `/refactor-types` are conceptual invocation aliases for skills. Specific platforms may namespace or display them differently, such as `/wingman:memory-setup` in Claude Code.

## Safe Editing

- Preserve existing code during real file edits.
- Do not write placeholder comments such as `// ... existing code ...` into files to stand in for unchanged code.
- Use abbreviated snippets only in chat explanations, examples, or change summaries.
- Keep edits scoped to the user request and the surrounding project design.

## Language

Wingman's published plugin instructions are English by default. Generated memory and user-facing output may adapt to the project memory language or the user's current language.

## Platform Wrappers

Different platforms use different names for persistent instructions and startup behavior. Keep Wingman's canonical behavior in skills; platform wrappers may add their own hooks, manifests, or generated project entry files to invoke those capabilities.

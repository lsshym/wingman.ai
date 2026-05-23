---
name: using-wingman
description: Use when starting a Wingman-enabled coding session, adapting Wingman across AI coding platforms, deciding which Wingman skill applies, or interpreting Wingman plugin-level instructions versus project-local instructions.
---

# Using Wingman

Use this as the entry router for Wingman workflows.

Wingman is a collection of reusable coding-agent skills. This entry skill helps
decide which workflow applies before starting meaningful work.

## Instruction Priority

Follow the highest applicable instruction source:

1. Direct user instructions.
2. Project-local instructions such as `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`,
   or equivalent files.
3. Wingman skills.
4. Default model behavior.

Wingman provides plugin defaults. Do not override explicit user requests or
project rules with Wingman defaults.

## Capability Groups

### Project Memory

- `memory-setup`: initialize repository memory when the user asks.
- `memory-load`: read relevant memory before non-trivial work.
- `memory-sync`: record meaningful progress and durable knowledge after work.
- `memory-clean`: compact, prune, or deduplicate Wingman memory only when the
  user explicitly asks.
- `memo`: early lightweight progress logging workflow.

### Contract Alignment

- `align-contracts`: use when API, schema, type, config, event, data model, or UI
  boundaries may drift.

### Reuse

- `reuse-catalog`: register one reusable component, hook, utility, pattern, or contract.
- `reuse-select`: search registered assets before rebuilding something.

### Refactoring

- `react-ts-refactor`: run the explicit React + TypeScript component refactor
  diagnostic workflow when the user requests it.

## Decision Rule

Before meaningful coding, debugging, refactoring, review, or project
explanation:

1. Check whether the user explicitly requested a Wingman workflow.
2. Check whether memory should be loaded.
3. Check whether a contract boundary is involved.
4. Check whether an existing implementation may be reusable.
5. If no trigger matches, continue normally.

Small isolated tasks can stay small.

## Red Flags

Use a Wingman workflow when these thoughts appear:

| Thought | Check |
| --- | --- |
| "This is just a field rename." | If it crosses API, schema, type, UI, event, or config boundaries, use `align-contracts`. |
| "I'll create a new component or helper." | If something similar may exist, use `reuse-select` first. |
| "I should remember this decision." | Use `memory-sync` if repository memory exists. |
| "I need project context from previous work." | Use `memory-load` if repository memory exists. |
| "The user explicitly asked for React + TypeScript refactor diagnostics." | Use `react-ts-refactor` before editing. |

## Safe Editing

- Preserve existing code during real file edits.
- Do not write placeholder comments such as `// ... existing code ...` into
  files.
- Keep edits scoped to the user request.
- Use the project's normal verification after meaningful changes.

## Language

Published Wingman skill bodies are English by default. User-facing output can
follow the user's current language.

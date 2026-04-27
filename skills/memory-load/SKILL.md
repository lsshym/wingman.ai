---
name: memory-load
description: Use when starting non-trivial coding, debugging, planning, review, API integration, or business-logic work in a repository that may use Wingman memory.
---

# Wingman Memory Load

Load project memory before work begins. This skill is read-only: never create, edit, summarize, or delete memory files while loading context.

## Memory Root

Use `.wingman/memory/` as the platform-neutral memory root.

Expected files:

- `.wingman/memory/projectBrief.md`
- `.wingman/memory/activeContext.md`
- `.wingman/memory/domains/*.md`

If `.wingman/memory/` does not exist, continue normally without warning unless the user asked about memory.

## Load Protocol

1. Read `.wingman/memory/projectBrief.md` if it exists.
2. Read `.wingman/memory/activeContext.md` if it exists.
3. Use the domain registry in `projectBrief.md` and the user's task to choose relevant domain files.
4. Read only relevant `.wingman/memory/domains/*.md` files.
5. Before editing code, identify:
   - Which memory rule or domain truth applies.
   - Which exact fields, symbols, contracts, or files are binding.
   - Whether the requested change would conflict with memory.
6. If required context is missing or contradictory, stop and ask the user instead of inventing substitutes.

## Binding Rules

- **No silent semantic fallback**: Never use `??`, `||`, or chained ternaries to substitute one business field for a semantically different field. Missing data should render an empty state or explicit absence.
- **No rule substitution**: If memory specifies a canonical field or contract, do not replace it with a proxy field for convenience.
- **Micro-logic comments**: For tiny code changes with large business impact, add an inline comment in the target code using `// @业务铁律: [WHY]`.
- **Reuse gate**: Before creating a new React component, hook, utility, or reusable workflow, check `.wingman/registry/` and loaded memory for an existing asset. If a match exists, reuse it or explain why it does not fit.

## Platform Entry Rules

Platform startup files such as `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/*.mdc` should point agents to this protocol. Those files decide when to load memory; this skill defines how to load it.

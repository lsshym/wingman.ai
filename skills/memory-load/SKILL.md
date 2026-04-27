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
- `.wingman/memory/domains/README.md`
- `.wingman/memory/domains/*.md`
- `.wingman/memory/domains/*/index.md`
- `.wingman/memory/archive/*.md` is cold storage and should not be read by default.

If `.wingman/memory/` does not exist, continue normally without warning unless the user asked about memory.

## Load Protocol

1. Read `.wingman/memory/projectBrief.md` if it exists.
2. Read `.wingman/memory/activeContext.md` if it exists.
3. Use the domain registry in `projectBrief.md` and the user's task to choose relevant domain files.
4. If `.wingman/memory/domains/README.md` exists, use it as the domain structure contract.
5. For a file domain, read only the relevant `.wingman/memory/domains/<domain>.md`.
6. For a folder domain, read `.wingman/memory/domains/<domain>/index.md` first, then use its `Subfiles` section to choose relevant topic files. Do not read every subfile by default.
7. Read archive files only when the user asks for history or when active memory points to a specific archived month.
8. Before editing code, build an internal Memory Context Checklist:
   - Active task.
   - Relevant memory files read.
   - Which memory rule or domain truth applies.
   - Which exact fields, symbols, contracts, or files are binding.
   - Reusable assets to check.
   - Whether the requested change would conflict with memory.
9. Do not show the checklist by default. Surface it only when there is a conflict, missing context, or the user asks.
10. If required context is missing or contradictory, stop and ask the user instead of inventing substitutes.

## Binding Rules

- **No silent semantic fallback**: Never use `??`, `||`, or chained ternaries to substitute one business field for a semantically different field. Missing data should render an empty state or explicit absence.
- **No rule substitution**: If memory specifies a canonical field or contract, do not replace it with a proxy field for convenience.
- **Micro-logic comments**: For tiny code changes with large business impact, add an inline comment in the target code using `// @业务铁律: [WHY]`.
- **Reuse gate**: Before creating a new React component, hook, utility, or reusable workflow, check `.wingman/registry/` and loaded memory for an existing asset. If a match exists, reuse it or explain why it does not fit.

## Platform Entry Rules

Platform startup files such as `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/*.mdc` should point agents to this protocol. Those files decide when to load memory; this skill defines how to load it.

---
name: memory-load
description: Use when starting non-trivial coding, debugging, planning, review, API integration, or business-logic work in a repository where Wingman memory is enabled.
---

# Wingman Memory Load

Decide whether project memory is needed, then load only the relevant files. This skill is read-only: never create, edit, summarize, or delete memory files while loading context.

## Memory Root

Use `.wingman/memory/` as the platform-neutral memory root.

Core entry files are `.wingman/memory/brief.md` and `.wingman/memory/context.md`. Optional areas include `domains/` for current truth and `history/` for indexed past events.

Repository memory states:

- **Capability installed**: Wingman provides memory skills. This does not mean the current repository has enabled memory.
- **Repository memory disabled**: `.wingman/memory/` is missing. Ordinary tasks must not invoke `memory-load`; if this skill is invoked directly, continue normally without warning unless the user asked about memory.
- **Repository memory enabled**: `.wingman/memory/brief.md` and `.wingman/memory/context.md` both exist.
- **Repository memory partial / broken**: `.wingman/memory/` exists but one or both required entry files are missing. Do not silently treat this as enabled memory. Report it only when the user asked about memory, explicitly asked to load memory, or the task requires memory consistency.

## Read Authority And Routing

Read current memory before historical memory:

- `brief.md`: current global rules, accepted ADRs, memory settings, and the Domain Registry.
- `domains/`: current durable domain truth, contracts, state flow, canonical fields, and domain-specific procedures.
- `context.md`: hot short-term working context, current task state, pending work, and recent high-signal logs.
- `history/`: past events and audit trail. History explains why something changed, but it is not current truth by itself.

```text
brief.md / current ADRs
  > domains/ current truths
  > context.md hot working context
  > history/ past events
```

Use the Domain Registry in `brief.md` as a routing table, not as the rule body:

- `Domain`: canonical domain name.
- `Read When`: task signals that make the domain relevant.
- `Current File`: current domain truth file or folder index.
- `History`: history index entry for historical lookup only.
- `Aliases`: old names, synonyms, or user-facing terms that should map to this domain.
- `Related Domains`: domains that may also matter for cross-domain tasks.
- `Status`: whether this domain route is active: `current | deprecated | superseded`.

- Read domains with `Status: current` when the task matches `Domain`, `Read When`, or `Aliases`.
- If a matching domain is `deprecated` or `superseded`, do not treat it as authoritative. Prefer the replacement when named; otherwise mention the routing ambiguity if the task depends on it.
- `Related Domains` are hints, not automatic expansion. Read a related domain only when the task also touches that related area or the current domain file points to a specific related rule.
- `History` in the registry points to historical background. It does not make history current truth and does not justify reading all history events by default.
- If history conflicts with `brief.md` or current domain truth, follow current memory unless the user explicitly asks to reopen the decision.

History uses event bodies plus projection indexes:

- `history/index.md`: top-level entry point.
- `history/domains/<domain>.md`: domain history projection.
- `history/months/YYYY-MM.md`: month history projection.
- `history/events/YYYY/MM/*.md`: event bodies, single source of truth for historical events.

## Memory Need Check

Only run ordinary memory loading when repository memory is enabled.

Skip memory loading for trivial, isolated tasks with no business, reuse, or existing-behavior impact, such as small copy edits, simple formatting, isolated style tweaks, or throwaway experiments.

Load memory before non-trivial coding, debugging, planning, review, refactor, API integration, reusable implementation creation, or changes touching business logic, state flow, permissions, quotas, billing, field mappings, or existing behavior.

Also load memory when the user mentions previous work, consistency, "之前", "上次", "沿用", "保持一致", "不要破坏", or asks to use memory.

If uncertain and repository memory is enabled, load memory. If repository state is unknown, first check existence only, then apply the enabled, disabled, or partial / broken rules before reading memory.

## Load Protocol

1. Check repository memory state.
2. If repository memory is disabled, continue without reading memory files unless the user explicitly asked about memory. Do not create `.wingman/`.
3. If repository memory is partial / broken, do not read a partial entry set as authoritative. If the user asked about memory or consistency, report the missing entry files and suggest `memory-setup`; otherwise continue without memory.
4. Run the Memory Need Check.
5. If memory is not needed, continue without reading memory files.
6. Read `.wingman/memory/brief.md`.
7. Read `.wingman/memory/context.md`.
8. Use the Domain Registry in `brief.md`, including `Read When`, `Aliases`, `Related Domains`, and `Status`, to choose relevant domain files.
9. For a file domain, read only the relevant `.wingman/memory/domains/<domain>.md`.
10. For a folder domain, read `.wingman/memory/domains/<domain>/index.md` first, then use its `Subfiles` section to choose relevant topic files. Do not read every subfile by default.
11. Read `.wingman/memory/history/index.md` only when the user asks about history, previous work, "之前", "上次", "为什么以前", or when current memory points to a specific history event.
12. From `history/index.md`, choose the relevant projection: `history/domains/<domain>.md` for domain questions, `history/months/YYYY-MM.md` for date questions, or a directly linked event when current memory cites one.
13. Read matched history event bodies only after checking the relevant projection. Do not read every history event by default, and do not read history before current truth.
14. Treat history as past context, not current truth. Follow the Read Authority And Routing priority when memory files disagree.
15. Before editing code, build an internal Memory Context Checklist:

- Active task.
- Relevant memory files read.
- Which memory rule or domain truth applies.
- Which exact fields, symbols, contracts, or files are binding.
- Whether reusable implementation lookup may be needed.
- Whether the requested change would conflict with memory.

16. Do not show the checklist by default. Surface it only when there is a conflict, missing context, or the user asks.
17. If required context is missing or contradictory, stop and ask the user instead of inventing substitutes.

## Memory Pressure Signals

`memory-load` is read-only. It may notice memory pressure, but must not compact, summarize, delete, or invoke cleanup.

Use these signals while loading:

- **Soft pressure**: `brief.md` or `context.md` is long, repetitive, or noisy but readable. Continue and briefly suggest explicit `memory-clean` later.
- **Hard pressure**: default-read memory is too large to load reliably. Stop and suggest the user explicitly run `memory-clean`.
- **Current-rule conflict**: two current rules or ADRs appear to conflict. If it affects the task, stop and ask which rule is valid; otherwise continue and suggest `memory-clean` later.

Do not treat large `history/` as memory pressure unless the user asked to inspect history. History is cold storage and is not read by default.

## Binding Rules

- **No silent semantic fallback**: Never use `??`, `||`, or chained ternaries to substitute one business field for a semantically different field. Missing data should render an empty state or explicit absence.
- **No rule substitution**: If memory specifies a canonical field or contract, do not replace it with a proxy field for convenience.
- **Existing invariant comments**: Treat `// @invariant:` as local binding context when present. `memory-load` is read-only; deciding whether to add a new code comment belongs to `memory-sync`.
- **Reuse lookup boundary**: Reusable implementation lookup belongs to `reuse-select`. Do not read registry files during `memory-load` unless the user explicitly asks for registry context. If the task may require choosing an existing implementation, mention that `reuse-select` is the appropriate next capability.

# Memory Load

Use this workflow to decide whether repository memory is needed, then load only
the relevant files.

`memory-load` is read-only. It should help the agent understand existing project
context before editing files.

## Memory Root

Use:

```text
.wingman/memory/
```

Expected files:

```text
.wingman/memory/projectBrief.md
.wingman/memory/activeContext.md
.wingman/memory/domains/
.wingman/memory/archive/
```

If the memory root does not exist, continue normally unless the user asked to
load memory.

## Memory Need Check

Skip memory loading for trivial isolated tasks, such as:

- small copy edits;
- formatting-only changes;
- isolated style tweaks;
- throwaway experiments.

Load memory before work that touches:

- existing behavior;
- debugging;
- planning or review;
- refactors;
- API integration;
- reusable asset creation;
- business logic, state flow, permissions, money, orders, or field mappings.

Also load memory when the user mentions previous work, consistency, "之前",
"上次", "沿用", "保持一致", "不要破坏", or explicitly asks to use memory.

If uncertain, load memory.

## Load Protocol

1. Run the Memory Need Check.
2. If memory is not needed, continue without reading memory files.
3. Read `projectBrief.md` if it exists.
4. Read `activeContext.md` if it exists.
5. Use the task and any domain registry to decide which domain files matter.
6. Read only relevant domain files.
7. Treat `archive/` as cold storage. Read it only when the user asks for history
   or active memory points to a specific archived note.
8. Before editing, identify any rules, contracts, fields, or decisions that
   affect the task.

## Boundaries

- Do not create memory files.
- Do not edit memory files.
- Do not summarize or compact memory while loading.
- If memory is contradictory, ask the user instead of guessing.

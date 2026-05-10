# Memory Load

Use this workflow before non-trivial work in a repository that has Wingman
memory.

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
```

If the memory root does not exist, continue normally unless the user asked to
load memory.

## Load Protocol

1. Read `projectBrief.md` if it exists.
2. Read `activeContext.md` if it exists.
3. Use the task and any domain registry to decide which domain files matter.
4. Read only relevant domain files.
5. Before editing, identify any rules, contracts, fields, or decisions that
   affect the task.

## Boundaries

- Do not create memory files.
- Do not edit memory files.
- Do not summarize or compact memory while loading.
- If memory is contradictory, ask the user instead of guessing.

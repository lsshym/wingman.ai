# Wingman

Wingman is a personal experiment for collecting AI coding workflows.

The goal is to turn repeated coding practices into reusable notes that can be
improved over time.

Each workflow now lives in its own skill folder:

```text
skills/<workflow>/SKILL.md
```

## Workflows

### `using-wingman`

Use `using-wingman` as the entry router when deciding which Wingman workflow
applies to a coding session.

### `align-contracts`

Use `align-contracts` when connecting provider and consumer shapes across API,
schema, data model, event, config, or UI boundaries.

### `memory-setup`

Use `memory-setup` to create a lightweight repository memory structure for an
AI coding tool. It separates stable project notes from short-term working
context.

### `memory-load`

Use `memory-load` before non-trivial work to read existing project context
without modifying memory files.

### `memory-sync`

Use `memory-sync` after meaningful work to record progress, decisions, and
durable project knowledge.

### `reuse-select`

Use `reuse-select` before rebuilding something that may already exist in the
project.

### `reuse-catalog`

Use `reuse-catalog` after finding or creating a reusable implementation that
future work should consider.

### `memo`

Use `memo` after meaningful work to update the active project context without
rewriting the whole memory file.

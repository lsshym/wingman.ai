# Refactor

Use this workflow before changing existing logic. The goal is to inspect the
code first, identify the safest refactor targets, and avoid behavior drift.

## Mode

Start in read-only diagnostic mode. Do not edit code until the user approves the
plan.

## Diagnostic Table

Review the selected code and return a concise Markdown table:

```markdown
| Target | Category | Severity | Action Plan |
| :--- | :--- | :--- | :--- |
| `ComponentName` | Prop explosion | High | Replace many related props with one object prop |
```

Write the table in Chinese when the user is working in Chinese.

## Checks

Look for these refactor candidates:

### Prop Explosion

A component receives many individual props that come from the same source
object.

Suggested action: pass the source object directly and update the child
interface.

### Redundant Types

A local type alias only renames another type without adding meaning.

Suggested action: remove the alias and use the original type if it is strictly
compatible.

### Messy Access

The same deep access path appears repeatedly.

Suggested action: destructure at the top of the component or function.

### Disordered Logic

Hooks, derived values, handlers, and render logic are interleaved.

Suggested action: reorder without changing behavior:

1. state and hooks;
2. derived values;
3. handlers;
4. render.

### Nested Complexity

The function has deep `if/else` nesting or a large mixed-responsibility body.

Suggested action: use early returns or extract a focused helper.

## Execution Rules

After the user approves the table:

- preserve behavior;
- update interfaces together with call sites;
- avoid unrelated cleanup;
- run the smallest relevant verification after each change.

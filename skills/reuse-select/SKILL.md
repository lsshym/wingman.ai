---
name: reuse-select
description: Use when deciding whether to reuse, extend, wrap, or create components, modules, utilities, patterns, contracts, or prior implementations from the Wingman reuse registry.
---

# Reuse Select

Use this workflow before creating a component, module, utility, pattern, or
contract that may already exist in the project.

`reuse-select` searches the Wingman reuse registry and recommends whether to
reuse, extend, wrap, or create a new implementation.

## Command

```text
/reuse-select <requirement>
```

Legacy alias:

```text
/find <requirement>
```

If the user provides no requirement, ask for the needed behavior, domain, or
implementation type before searching.

## Registry Layout

Use:

```text
.wingman/registry/
  index.md
  components/
  modules/
  utilities/
  patterns/
  contracts/
```

If the new registry is missing, fall back to legacy `.cursor/brain` registry
files when they exist.

## Lookup Workflow

1. Read `.wingman/registry/index.md` first.
2. Extract the user's required behavior, domain, interface needs, constraints,
   and deal-breakers.
3. Choose up to five candidate cards from tags, best-for summaries, source, and
   category.
4. Read only those candidate cards.
5. Compare use-when, do-not-use-when, interface, similar implementations, and
   selection notes.
6. Decide whether to reuse, extend, wrap, or create new.

Do not read every card unless the index is missing, stale, or clearly
insufficient.

## Decision Criteria

Prefer reuse when behavior and interface match without fake fields or semantic
adapters.

Prefer extension when the existing implementation owns the same responsibility
and the new behavior is a natural option.

Prefer wrapping when the base implementation is correct but the current context
needs domain defaults, permissions, tracking, or layout composition.

Prefer creating new when candidates are semantically different or reuse would
make the interface misleading.

## Output

Return the top recommendation first:

```markdown
Recommended: `ImplementationName`

Decision: Reuse | Extend | Wrap | Create New

Why:
- Reason tied to registry evidence.

Not Chosen:
- `OtherImplementation`: specific mismatch.

Use:
- Card: `.wingman/registry/category/card.md`
- Source: `source/path`
```

If no useful match exists, say so directly and explain what should be created.

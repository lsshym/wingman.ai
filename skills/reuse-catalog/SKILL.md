---
name: reuse-catalog
description: Use when recording components, modules, utilities, patterns, contracts, or other reusable implementations into the Wingman reuse registry for future selection.
---

# Reuse Catalog

Catalog exactly one reusable project implementation into `.wingman/registry/`. The registry is not a source-code dump; it is an AI-readable selection map that helps future agents decide whether to reuse, extend, wrap, or create an implementation.

## Trigger

Triggered when the user types `/reuse-catalog [implementation path or name]`, `/reuse-catalog`, or legacy `/reg`.

- If a target is provided, use that exact target.
- If no target is provided, use the active file when available.
- If there is no active file, use the most recent relevant source file from the current context.
- Process exactly one target per invocation.

## Language

Keep registry field headings in English for stable parsing. Write field content and final responses in the configured memory language when known, otherwise follow the user's current language, then English.

## Registry Layout

Initialize this structure if missing:

```text
.wingman/registry/
  index.md
  components/
  modules/
  utilities/
  patterns/
  contracts/
```

Seed `.wingman/registry/index.md` with:

```markdown
# Registry Index

## Components

| Entry | Card | Source | Status | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |

## Modules

| Entry | Card | Source | Status | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |

## Utilities

| Entry | Card | Source | Status | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |

## Patterns

| Entry | Card | Source | Status | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |

## Contracts

| Entry | Card | Source | Status | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |
```

## Categories

Choose exactly one category:

- `components`: UI components, presentational components, widgets, controls, hooks tightly coupled to a component.
- `modules`: business or workflow units that coordinate state, routing, data loading, permissions, domain logic, or multiple components.
- `utilities`: reusable functions, hooks, adapters, helpers, scripts, parsers, formatters, and low-level logic.
- `patterns`: reusable implementation approaches, architectural patterns, recipes, and conventions that are not one source artifact.
- `contracts`: schemas, DTOs, API/event payloads, config shapes, database rows, validation contracts, and type boundaries.

If uncertain, prefer the category that best describes how another agent would decide to reuse the implementation.

## Source Read Gate

For source-backed implementations, read the actual source file before writing the card. Do not infer behavior from file name, folder name, or usage sites alone.

For patterns or contracts, read the source artifact, schema, documentation, or representative implementation that proves the registry entry.

## Extraction

Extract decision-focused information:

1. **Name**: Stable implementation name.
2. **Source Path**: Relative source path, import path, doc path, or contract location.
3. **Category**: One of `components`, `modules`, `utilities`, `patterns`, `contracts`.
4. **Status**: One of `Preferred`, `Stable`, `Experimental`, `Legacy`, `Deprecated`, or `Unknown`.
5. **Last Verified**: Current date and the source evidence used for verification.
6. **Tags**: 3-7 precise keywords for behavior, domain, data shape, platform traits, or selection clues.
7. **Best For**: One short phrase for index scanning.
8. **What It Does**: 1-2 sentences based on evidence.
9. **Use When**: Concrete situations where this implementation fits.
10. **Do Not Use When**: Concrete situations where this implementation should be avoided.
11. **Interface**: Main props, params, return shape, config keys, exported symbols, or contract fields.
12. **Similar Implementations**: Related entries from the registry and how they differ. Use `None known` only after reading the index.
13. **Selection Notes**: How an AI should decide whether to reuse, extend, wrap, or create something new.

## Deduplication

Before writing:

1. Read `.wingman/registry/index.md` if it exists.
2. Search `.wingman/registry/**/*.md` for the same source path.
3. Use source path as the primary duplicate key.
4. If the same source path already has a card, update that card only when the new information is more accurate; otherwise skip.
5. If the same name exists with a different source path, treat it as a related implementation, not a duplicate. Record the distinction in `Similar Implementations`.

## Card Update Safety

When updating an existing card:

- Preserve user-authored decision knowledge in `Status`, `Use When`, `Do Not Use When`, `Similar Implementations`, and `Selection Notes`.
- Replace those sections only when source evidence or explicit user instruction proves the existing content is outdated or wrong.
- Do not regenerate a decision-focused card into a generic source summary.
- Refresh `Last Verified` when you read current source evidence.
- If source evidence conflicts with existing human notes, keep both signals visible and mention the conflict in `Selection Notes`.

## Card Template

Create or update one card at `.wingman/registry/<category>/<implementation-slug>.md`.

Use this exact heading structure:

```markdown
# [Implementation Name]

## Source
- Path: `[source path]`
- Type: `[component | module | utility | pattern | contract]`

## Status
`Preferred | Stable | Experimental | Legacy | Deprecated | Unknown`

## Last Verified
- Date: `YYYY-MM-DD`
- Evidence: `[source path, docs path, schema path, or user-confirmed context]`

## Tags
- `[tag]`
- `[tag]`

## Best For
[One short phrase.]

## What It Does
[1-2 evidence-based sentences.]

## Use When
- [Concrete fit.]

## Do Not Use When
- [Concrete mismatch.]

## Interface
- [Main props, params, exports, return shape, config keys, or contract fields.]

## Similar Implementations
- `[ImplementationName]`: [How it differs.]

## Selection Notes
[How to choose reuse, extension, wrapper, or new implementation.]
```

Do not omit a section. If a section has no known content, write `None known` and explain what evidence is missing.

## Index Update

Update `.wingman/registry/index.md` with exactly one row under the selected category:

```markdown
| [Implementation Name] | `[category]/[implementation-slug].md` | `[source path]` | `[Status]` | `[tag1, tag2, tag3]` | [Best For] |
```

Rules:

- Keep the index short. It is for candidate discovery, not full documentation.
- Preserve existing rows and section order.
- Do not duplicate rows for the same source path.
- Do not remove legacy files such as `ui-components.md`, `business-components.md`, or `utils.md` if they already exist.

## Final Response

Report:

- registered or updated implementation name
- card path
- status
- index row status
- 1-3 tags
- any likely similar implementations found

Keep the response concise.

## Checklist

Before finishing, verify:

- [ ] I read the source evidence.
- [ ] I processed exactly one implementation.
- [ ] I selected exactly one category.
- [ ] I read the registry index before writing.
- [ ] I checked duplicates by source path.
- [ ] I created or updated exactly one registry card.
- [ ] I updated the index without duplicating rows.

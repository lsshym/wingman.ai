---
name: reg
description: Register reusable project assets into the Wingman registry. Use when cataloging components, modules, utilities, patterns, contracts, or other reusable implementation assets for later selection.
---

# Command: Register Asset

Register exactly one reusable project asset into `.wingman/registry/`. The registry is not a source-code dump; it is an AI-readable selection map that helps future agents decide whether to reuse, extend, wrap, or create an asset.

## Trigger

Triggered when the user types `/reg [asset path or name]` or `/reg`.

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

| Asset | Card | Source | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- |

## Modules

| Asset | Card | Source | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- |

## Utilities

| Asset | Card | Source | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- |

## Patterns

| Asset | Card | Source | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- |

## Contracts

| Asset | Card | Source | Tags | Best For |
| :--- | :--- | :--- | :--- | :--- |
```

## Asset Categories

Choose exactly one category:

- `components`: UI components, presentational components, widgets, controls, hooks tightly coupled to a component.
- `modules`: business or workflow units that coordinate state, routing, data loading, permissions, domain logic, or multiple components.
- `utilities`: reusable functions, hooks, adapters, helpers, scripts, parsers, formatters, and low-level logic.
- `patterns`: reusable implementation approaches, architectural patterns, recipes, and conventions that are not one source artifact.
- `contracts`: schemas, DTOs, API/event payloads, config shapes, database rows, validation contracts, and type boundaries.

If uncertain, prefer the category that best describes how another agent would decide to reuse it.

## Source Read Gate

For source-backed assets, read the actual source file before writing the card. Do not infer behavior from file name, folder name, or usage sites alone.

For patterns or contracts, read the source artifact, schema, documentation, or representative implementation that proves the registry entry.

## Extraction

Extract decision-focused information:

1. **Name**: Stable asset name.
2. **Source Path**: Relative source path, import path, doc path, or contract location.
3. **Category**: One of `components`, `modules`, `utilities`, `patterns`, `contracts`.
4. **Tags**: 3-7 precise keywords for behavior, domain, data shape, platform traits, or selection clues.
5. **Best For**: One short phrase for index scanning.
6. **What It Does**: 1-2 sentences based on evidence.
7. **Use When**: Concrete situations where this asset fits.
8. **Do Not Use When**: Concrete situations where this asset should be avoided.
9. **Interface**: Main props, params, return shape, config keys, exported symbols, or contract fields.
10. **Similar Assets**: Related assets from the registry and how they differ. Use `None known` only after reading the index.
11. **Selection Notes**: How an AI should decide whether to reuse, extend, wrap, or create something new.

## Deduplication

Before writing:

1. Read `.wingman/registry/index.md` if it exists.
2. Search `.wingman/registry/**/*.md` for the same source path.
3. Use source path as the primary duplicate key.
4. If the same source path already has a card, update that card only when the new information is more accurate; otherwise skip.
5. If the same name exists with a different source path, treat it as a related asset, not a duplicate. Record the distinction in `Similar Assets`.

## Card Template

Create or update one card at `.wingman/registry/<category>/<asset-slug>.md`.

Use this exact heading structure:

```markdown
# [Asset Name]

## Source
- Path: `[source path]`
- Type: `[component | module | utility | pattern | contract]`

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

## Similar Assets
- `[AssetName]`: [How it differs.]

## Selection Notes
[How to choose reuse, extension, wrapper, or new asset.]
```

Do not omit a section. If a section has no known content, write `None known` and explain what evidence is missing.

## Index Update

Update `.wingman/registry/index.md` with exactly one row under the selected category:

```markdown
| [Asset Name] | `[category]/[asset-slug].md` | `[source path]` | `[tag1, tag2, tag3]` | [Best For] |
```

Rules:

- Keep the index short. It is for candidate discovery, not full documentation.
- Preserve existing rows and section order.
- Do not duplicate rows for the same source path.
- Do not remove legacy files such as `ui-components.md`, `business-components.md`, or `utils.md` if they already exist.

## Final Response

Report:

- registered or updated asset name
- card path
- index row status
- 1-3 tags
- any likely similar assets found

Keep the response concise.

## Checklist

Before finishing, verify:

- [ ] I read the source evidence.
- [ ] I processed exactly one asset.
- [ ] I selected exactly one category.
- [ ] I read the registry index before writing.
- [ ] I checked duplicates by source path.
- [ ] I created or updated exactly one asset card.
- [ ] I updated the index without duplicating rows.

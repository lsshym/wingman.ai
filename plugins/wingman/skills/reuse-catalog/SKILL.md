# Reuse Catalog

Use this workflow to catalog one reusable project implementation so future work
can find it before rebuilding something similar.

The registry is an AI-readable selection map, not a source-code dump.

## Command

```text
/reuse-catalog
/reuse-catalog <implementation-or-path>
```

Legacy alias:

```text
/reg
```

## Scope

Catalog exactly one implementation per run.

- If the user provides a target, use that exact target.
- If no target is provided, use the active file from the current context.
- Do not bulk-register multiple files unless the user explicitly asks.

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

Legacy `.cursor/brain/*.md` registries may exist in older projects. Do not delete
them during cataloging.

## Categories

Choose exactly one category:

- `components`: UI components, widgets, controls, component-coupled hooks.
- `modules`: business or workflow units that coordinate state, routing, data, or permissions.
- `utilities`: helpers, hooks, scripts, parsers, formatters, adapters.
- `patterns`: reusable approaches or conventions that are not one source artifact.
- `contracts`: schemas, DTOs, API payloads, config shapes, and type boundaries.

## Source Read Gate

Read the source evidence before writing a card. Do not infer behavior from file
name, folder name, or usage sites alone.

## Card Content

Create or update one card with:

- name;
- source path;
- category;
- tags;
- best-for summary;
- what it does;
- use when;
- do not use when;
- interface;
- similar implementations;
- selection notes.

## Deduplication

Use source path as the primary duplicate key.

If the same source path already has a card, update it only when the new
information is more accurate. Otherwise skip.

## Index

Update `.wingman/registry/index.md` with one short row under the selected
category. Keep the index brief; full details belong in the card.

## Final Response

Report the implementation name, card path, index status, tags, and likely
similar implementations.

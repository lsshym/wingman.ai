# Align Contracts

Use this workflow when connecting provider and consumer contracts across a code
boundary.

A contract can be an API payload, schema, event, config object, SDK response,
database row, domain model, or component interface.

## Goal

Align real data with the receiving code without hiding semantic drift. Preserve
the contract that owns the meaning, not just the shape that already exists.

## When To Use

Use this when connecting:

- API response to UI or domain model;
- database row to entity;
- event payload to handler;
- SDK result to app model;
- config or CLI input to runtime options;
- parent component data to child props.

Do not use this for pure formatting, styling, or copy edits.

For React, JSX, TypeScript props, or backend response to component binding, read
`references/frontend-react-typescript.md` after this core protocol.

## Core Protocol

1. Identify the provider contract: what shape is actually supplied?
2. Identify the consumer contract: what shape does the receiving code expect?
3. Decide the source of truth from schemas, docs, memory, existing architecture,
   or stable domain models.
4. Classify the gap:
   - naming only;
   - semantic mismatch;
   - missing field;
   - structural mismatch;
   - source-of-truth conflict.
5. Choose the binding location:
   - schema/parser;
   - adapter or mapper;
   - domain model;
   - consumer interface;
   - direct source usage for large read-only display data.
6. Make the smallest behavior-preserving change.
7. Verify with the project's normal proof: typecheck, tests, schema parse,
   fixture, or compile step.

## Missing Data

Handle missing data explicitly.

- Use optional fields when absence is valid.
- Use validation errors when data is required.
- Ask when missing data changes behavior.
- Do not invent placeholder fields such as `id: 0` or `name: ""` just to satisfy
  a type.

## Structural Mismatch

Stop and explain the mismatch when both sides may represent different business
concepts.

Example:

```text
Provider exposes product.main_image.
Consumer expects profile.avatar_url.
These are not the same domain object.
```

## UI Safety

When the boundary is frontend UI:

- keep existing layout and visual classes;
- add list rendering only around repeated UI;
- add conditional rendering for optional data;
- do not redesign the component while aligning the contract.

# React + TypeScript Frontend Binding

Use this reference after `align-contracts` when binding backend or API data to
React, JSX, or TypeScript component contracts.

## Frontend Bias

For display-only components, the backend or product API often owns the data
meaning. Prefer updating the component interface and internal logic to read the
real contract instead of reshaping data in the parent just to satisfy old prop
names.

This is not a global ban on adapters. It is a ban on ad-hoc parent mapping that
hides component-contract drift.

Check component scope before deciding:

- Local page-only components may accept the API-backed shape directly.
- Shared components should avoid provider-specific payload types unless the
  project already treats them as API components.
- Generic names such as `Money`, `Avatar`, or `UserCard` usually need stable
  props rather than raw provider payloads.
- Provider-specific components can use direct source data when that is clearer.

## Conflict Check First

Before choosing a field strategy, scan for structural or semantic mismatch:

- Are you writing dummy data such as `gender: ""` or `id: 0` only to satisfy
  TypeScript?
- Are you reshaping data because the component reads a hardcoded path?
- Are you renaming semantic fields in the parent, such as `image -> img`,
  `price -> points`, or `status -> checkoutType`?

If yes, refactor the component contract or ask when source of truth is unclear.

## Field Strategy

### Naming Only

Use local aliasing when fields differ only by naming convention and semantics
are identical:

```tsx
const { user_name: userName, user_avatar: userAvatar } = data;
return <img src={userAvatar} alt={userName} />;
```

### Complex Read-Only Shape

For massive, nested, read-only display data, direct source usage can be clearer
than a huge mapper:

```tsx
return <span>Total: {data.transaction_summary.total_net_value_in_usd}</span>;
```

For small reusable components, do not couple the component to a provider-specific
shape just to avoid one prop rename:

```tsx
return <Money totalMinorUnits={order.amount.total_minor_units} />;
```

### Semantic Difference

If fields differ semantically, do not alias casually. Identify the gap and
decide ownership:

```text
API provides checkout_type.
Component expects crowdfunding.status.
```

Use memory, schema, docs, or user confirmation to decide whether to update the
component interface, introduce a boundary adapter, or preserve the existing
consumer model.

## Missing Data

If the API lacks a field required by the UI:

1. Do not invent fake fields in `.map()` just to satisfy types.
2. Prefer making the UI optional or empty-state aware.
3. Change the component contract when the old prop is no longer correct.
4. Add a `FIXME` only when the missing contract is temporary and visible to
   maintainers.

## Visual Preservation

Keep visual structure stable unless the contract change requires UI behavior
changes.

Avoid unrelated changes to:

- CSS classes;
- colors;
- layout structure;
- component hierarchy.

Allowed changes include:

- wrapping existing repeated UI in `data.map()`;
- conditional rendering;
- skeleton or loading states;
- type/interface changes required by the contract.

## Execution Steps

1. Run the core `align-contracts` protocol.
2. Check semantic or structural mismatch before writing mapper code.
3. If backend or product API owns meaning, update the component interface and
   internals to match the source contract.
4. If internal UI or domain model owns meaning, bind through the existing schema,
   adapter, or domain boundary.
5. Keep visual behavior stable.
6. Verify with typecheck, render path, sample payload, or tests.

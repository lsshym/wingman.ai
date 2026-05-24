# React + TypeScript Frontend Binding

Use this reference after `align-contracts` when binding backend/API data to React, JSX, or TypeScript component contracts.

## Frontend Bias

For display-only components, the backend/product API often owns the data meaning. Prefer updating the component interface and internal logic to read the real contract instead of reshaping data in the parent just to satisfy old prop names, but only when the old and new fields have the same business meaning.

This is not a global ban on adapters. It is a ban on ad-hoc parent/caller mapping that hides component-contract drift.

Check component scope before deciding:

- Local page-only components may accept the API-backed shape directly.
- Shared or reusable components should avoid provider-specific payload types unless the project already treats them as API components.
- If a component name or usage suggests generic reuse (`FileSize`, `Avatar`, `UserCard`), prefer stable props such as `bytes`, `src`, or optional fields over `ApiDocument["size"]`.
- If the component is clearly tied to one provider page (`DocumentApiSummary`, `WebhookEventRow`), direct source usage can be clearer.

## Conflict Check First

Before choosing a field strategy, scan for structural or semantic mismatch:

- Are you writing dummy data such as `gender: ''` or `id: 0` only to satisfy TypeScript?
- Are you reshaping data because the component reads a hardcoded path?
- Are you renaming semantic fields in the parent, such as `image -> img`, `quota -> score`, or `status -> workflowKind`?

If yes, refactor the component contract only when semantics are identical. When the consumer term names a distinct business concept that the provider does not expose, keep that consumer concept visible and ask or return an explicit missing state.

## Field Strategy

### Naming Only

Use local aliasing when fields differ only by naming convention and semantics are identical:

```tsx
const { user_name: userName, user_avatar: userAvatar } = data;
return <img src={userAvatar} alt={userName} />;
```

### Complex Read-Only Shape

For massive, nested, read-only display data, direct source usage can be clearer than a huge mapper:

```tsx
return <span>Total: {data.transaction_summary.total_net_value_in_usd}</span>;
```

For small generic display components, do not couple the component to a provider-specific shape just to avoid one prop rename:

```tsx
// Better for a reusable component.
return <FileSize bytes={document.size.bytes} />;

// Risky if FileSize is shared/generic.
return <FileSize size={document.size} />;
```

### Semantic Difference

If fields differ semantically, do not alias casually. Identify the gap and decide ownership:

```text
API provides `workflow_kind`; component expects `pipeline.status`.
```

Use memory, schema, docs, or user confirmation to decide whether to update the component interface, introduce a boundary adapter, or preserve the existing consumer model.

Do not make the conflict disappear by renaming the consumer API to the provider concept. For example, do not change `toWorkflowKind(): WorkflowKind` into `toWorkflowStatus(): WorkflowStatus` when `status` is a processing state and `workflowKind` is a workflow category. Preserve `toWorkflowKind` and make the missing provider source explicit.

## Missing Data

If the API lacks a field required by the UI:

1. Do not invent fake fields in `.map()` just to satisfy types.
2. Prefer making the UI optional/empty-state aware, changing the component contract, or adding an explicit localized fallback.
3. Add `// FIXME: Field [field_name] missing in API` only when the missing contract is temporary and visible to maintainers.

## Visual Preservation

When binding data into an existing UI, keep visual structure stable unless the contract change requires UI behavior changes.

Avoid unrelated changes to:

- CSS classes.
- Colors.
- Layout structure.
- Component hierarchy.

Allowed changes include:

- Wrapping elements in `data.map()`.
- Conditional rendering for presence/absence.
- Skeleton or loading states when data is undefined.
- Type/interface changes and JSX references required by the contract.

## Execution Steps

1. Run the core `align-contracts` protocol.
2. Check semantic/structural mismatch before writing mapper code.
3. If backend/product API owns meaning, update the component interface and internals to match the source contract.
4. If internal UI/domain model owns meaning, bind through the existing schema/adapter/domain boundary.
5. Keep visual behavior stable.
6. Verify with typecheck, render path, sample payload, or tests.

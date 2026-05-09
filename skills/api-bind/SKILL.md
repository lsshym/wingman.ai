# API Bind

Use this workflow when connecting backend data to an existing frontend UI.

## Goal

Bind real API fields into the component with the smallest safe change. Preserve
the existing layout and avoid reshaping data only to satisfy old component
assumptions.

## Field Strategy

Choose the binding style from the response shape.

### Simple Responses

For flat objects or a small number of fields, map backend names to UI-friendly
names near the top of the component.

```ts
const {
  user_name: userName,
  user_avatar: userAvatar,
} = data;
```

This keeps JSX readable without hiding where the data came from.

### Complex Responses

For large, nested, read-only data, use backend paths directly instead of
creating a wide adapter just to rename every field.

```tsx
return <span>{data.transaction_summary.total_net_value_in_usd}</span>;
```

## Missing Fields

If a simple display field is missing:

- use a safe fallback such as `"N/A"`, `0`, `false`, or an empty list;
- leave a short `FIXME` comment with the missing field name;
- do not invent business data that the API does not provide.

## Structural Mismatches

Stop and explain the mismatch when the API and component represent different
business concepts.

Example:

```text
API provides product.main_image.
Component expects profile.avatar_url.
These are not the same domain object.
```

Prefer adjusting the component interface when it is too rigid. Avoid dummy
adapter fields such as `id: 0` or `gender: ""` just to satisfy TypeScript.

## UI Safety

- Keep existing classes, colors, spacing, and layout structure.
- Add list rendering only around existing repeated UI.
- Add conditional rendering for absent optional data.
- Do not redesign the component while binding data.

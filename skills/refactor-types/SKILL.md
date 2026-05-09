# Refactor Types

Use this workflow when TypeScript types are mixed into component logic or when
local types may duplicate shared domain types.

## Mode

Start in read-only diagnostic mode. Do not edit runtime logic while diagnosing
types.

## Target Path Detection

Choose where types should live by checking paths in this order:

1. Reuse an existing type import path if the file already imports project types.
2. Prefer a nearby domain or feature `types.ts` file.
3. Fall back to a local `types.ts` only when no clearer home exists.

If the target file does not exist, mark it as new in the diagnostic table.

## Diagnostic Table

Return a concise Markdown table:

```markdown
| Type | Status | Target Path | Action Plan |
| :--- | :--- | :--- | :--- |
| `OrderItem` | Inline definition | `./types.ts` (new) | Extract the local shape before changing imports |
```

Write the table in Chinese when the user is working in Chinese.

## Type Status

### Exact Match

The local type has the same meaning and fields as a shared type.

Action: remove the local definition and import the shared type.

### Inline Definition

The code uses object shapes directly in props, state, callbacks, or schemas.

Action: extract the shape to the selected target path.

### Partial Reuse

The local type is a subset or extension of a shared type.

Action: use `Pick`, `Omit`, `extends`, or an explicit composed type.

### Naming Conflict

The same type name exists in another place but means something different.

Action: rename the local type before sharing or importing anything.

### Safe Native Type

The type is a native or obvious generic such as `Record`, `string`, or
`unknown`.

Action: leave it alone.

## Execution Rules

After the user approves the table:

- change only `interface`, `type`, and related imports;
- do not reorder runtime code;
- do not rename runtime variables;
- preserve the exact local shape when composing shared types;
- ask for the target path if the path decision is unclear.

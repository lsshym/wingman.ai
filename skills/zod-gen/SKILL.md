# Zod Gen

Use this experimental workflow to create a Zod schema for backend API data.

The idea is to keep API boundaries strict while giving the application a clean
typed shape.

## Goal

Generate a schema that:

- validates raw backend JSON;
- maps backend field names into application field names;
- exports an inferred TypeScript type;
- shows a minimal parse example.

## Input Schema

Start with a `z.object(...)` that matches the raw API shape.

- Use backend field names exactly.
- Use `optional()` or `nullable()` only when the API contract allows it.
- Keep required fields required.

## Transform

Use `.transform(...)` when the application should consume a different shape.

Common transforms:

- `snake_case` to `camelCase`;
- timestamp to `Date` or formatted string;
- backend enum values to application labels;
- nested API objects to a flatter view model.

## Type

Export the final inferred type from the transformed schema.

```ts
export type User = z.infer<typeof UserSchema>;
```

## Usage

Show the smallest useful example:

```ts
const user = UserSchema.parse(apiResponse);
```

## Constraints

- Do not generate class definitions.
- Do not silently accept unknown required fields.
- Do not convert missing required data into placeholder values.

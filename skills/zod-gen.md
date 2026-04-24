# Modern Data Validation & Transformation

**Role**: You are a TypeScript Architecture Specialist.
**Stack**: TypeScript, Zod.
**Task**: Create a strict Zod Schema to validate, transform, and type-infer backend API data.

## PHILOSOPHY
"Strict at the boundaries, clean within the application."
We do not trust API data blindly. We parse it, normalize it to `camelCase`, and fail fast if the structure is invalid.

## EXECUTION STEPS

### 1. DEFINE INPUT SCHEMA (Raw API)
Create a `z.object({...})` that strictly matches the **Backend JSON** format (`snake_case`).
* Use `z.string()`, `z.number()`, `z.boolean()`, etc.
* Use `.optional()` or `.nullable()` only if the API documentation allows it.

### 2. APPLY TRANSFORM (The Mapping Layer)
Chain a `.transform((api) => ({ ... }))` method to the schema.
Inside the transform function:
* **Rename**: Map `snake_case` fields to `camelCase` (e.g., `user_id` → `userId`).
* **Semantic Mapping**: If I request specific renames (e.g., `user_name` → `name`), apply them here.
* **Formatting**: Convert primitive values to domain objects (e.g., Timestamp numbers → Date strings `YYYY-MM-DD`).

### 3. EXPORT TYPE (Inference)
Use `z.infer` to extract the **Final Output Type** (The transformed shape, not the input shape).
* Syntax: `export type User = z.infer<typeof UserSchema>;`

### 4. USAGE EXAMPLE
Provide a brief snippet showing how to use `.parse()` on the `fetch` result.

## INPUT DATA CONTEXT
(Paste your JSON here or select code in editor)

## REQUIREMENTS
* **NO Class definitions**. Use functional Zod schemas only.
* **Runtime Safety**: Ensure the schema throws errors if required fields are missing.
* **Date Handling**: If a field is a timestamp/date-string, transform it into a human-readable string or JS Date object as requested.

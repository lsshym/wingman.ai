# align-contracts Test Cases

## Runner Format Contract

The unified runner depends on these heading names and case shapes. Do not rename them unless `tests/runner/run-skill-eval.mjs` is updated in the same change:

- `## Pair ALIGN-001: ...`
- `### Shared Initial Workspace`
- file fixtures as `` `path/to/file` `` followed by a fenced code block
- `### ALIGN-001A baseline_without_skill`
- `### ALIGN-001B with_align_contracts`
- `#### Task Prompt`

## Case Index

| Pair | Goal | Primary Risk |
| --- | --- | --- |
| `ALIGN-001` | Naming-only API mismatch | Adding unnecessary architecture |
| `ALIGN-002` | Semantic mismatch | Hiding different business concepts |
| `ALIGN-003` | Stable domain model | Rewriting shared internal contracts |
| `ALIGN-004` | Missing provider field | Inventing dummy data |
| `ALIGN-005` | React props binding | Parent call-site mapping instead of component contract alignment |

## Pair ALIGN-001: Naming-only API mismatch

### Shared Initial Workspace

`package.json`

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

`src/profile.ts`

```ts
type ApiUser = {
  user_id: string;
  display_name: string;
};

export function renderUser(user: ApiUser): string {
  return `${user.userId}: ${user.displayName}`;
}
```

### ALIGN-001A baseline_without_skill

#### Task Prompt

```text
Fix the TypeScript error in src/profile.ts so the API user renders correctly.
```

#### Expected Behavior

- Identify that provider fields are `user_id` and `display_name`.
- Identify that the consumer only needs local camelCase names for rendering.
- Use local aliasing or direct snake_case access.
- Avoid creating a broad adapter layer for this one local display function.

#### Forbidden Behavior

- Creating a new shared domain type for this local-only function.
- Adding dummy camelCase fields to the API type.
- Changing unrelated files.

#### Pass Assertions

- `renderUser({ user_id: "u1", display_name: "Ada" })` would return `u1: Ada`.
- Only `src/profile.ts` is changed.
- The strategy is naming-only, not semantic.

### ALIGN-001B with_align_contracts

#### Task Prompt

```text
Use align-contracts to fix the TypeScript error in src/profile.ts so the API user renders correctly.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-001A`.

## Pair ALIGN-002: Semantic mismatch

### Shared Initial Workspace

`src/workflow.ts`

```ts
type ApiJob = {
  id: string;
  status: "queued" | "running" | "done";
};

type WorkflowKind = "import" | "export";

export function toWorkflowKind(job: ApiJob): WorkflowKind {
  return job.status;
}
```

`docs/contracts.md`

```markdown
# Contracts

`ApiJob.status` is a processing state.
`WorkflowKind` is a workflow category selected by product configuration.
The current API payload does not include workflow category.
```

### ALIGN-002A baseline_without_skill

#### Task Prompt

```text
Fix src/workflow.ts so TypeScript passes.
```

#### Expected Behavior

- Identify `ApiJob.status` as provider processing state.
- Identify `WorkflowKind` as consumer workflow category.
- Treat this as a semantic mismatch, not a naming mismatch.
- Do not return `job.status` as `WorkflowKind`.
- Stop with an explicit missing-contract explanation or change the function to surface absence, such as returning `WorkflowKind | undefined`, only if that is compatible with local usage.

#### Forbidden Behavior

- Renaming `WorkflowKind` to `WorkflowStatus`.
- Returning `job.status as WorkflowKind`.
- Mapping `queued -> import` or another invented category.

#### Pass Assertions

- The final result preserves the distinction between status and workflow kind.
- The result exposes missing provider data instead of hiding it.
- The final answer explains the semantic gap.

### ALIGN-002B with_align_contracts

#### Task Prompt

```text
Use align-contracts to fix src/workflow.ts so TypeScript passes without hiding contract drift.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-002A`.

## Pair ALIGN-003: Stable domain model

### Shared Initial Workspace

`src/domain/order.ts`

```ts
export type Order = {
  id: string;
  totalCents: number;
  currency: "USD" | "EUR";
};
```

`src/api/orders.ts`

```ts
import type { Order } from "../domain/order";

type VendorOrder = {
  order_id: string;
  amount: {
    value: number;
    currency_code: "USD" | "EUR";
  };
};

export function parseOrder(payload: VendorOrder): Order {
  return payload;
}
```

`src/domain/checkout.ts`

```ts
import type { Order } from "./order";

export function formatTotal(order: Order): string {
  return `${order.currency} ${(order.totalCents / 100).toFixed(2)}`;
}
```

### ALIGN-003A baseline_without_skill

#### Task Prompt

```text
Make the vendor order payload work with the existing checkout code.
```

#### Expected Behavior

- Treat `Order` as a stable internal domain model because it is exported and used by checkout.
- Convert `VendorOrder` to `Order` inside `parseOrder`.
- Keep vendor shape from leaking into `src/domain/order.ts`.

#### Forbidden Behavior

- Changing `Order` to `{ order_id, amount }`.
- Changing checkout to read vendor fields.
- Returning `payload as unknown as Order`.

#### Pass Assertions

- `parseOrder` returns `{ id, totalCents, currency }`.
- `src/domain/order.ts` remains semantically stable.
- Conversion happens at the API boundary.

### ALIGN-003B with_align_contracts

#### Task Prompt

```text
Use align-contracts to make the vendor order payload work with the existing checkout code.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-003A`.

## Pair ALIGN-004: Missing provider field

### Shared Initial Workspace

`src/user-card.ts`

```ts
type ApiUser = {
  id: string;
  name: string;
};

type UserCardProps = {
  id: string;
  name: string;
  avatarUrl: string;
};

export function toUserCardProps(user: ApiUser): UserCardProps {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: ""
  };
}
```

### ALIGN-004A baseline_without_skill

#### Task Prompt

```text
Fix the user card mapping so it follows the API contract.
```

#### Expected Behavior

- Identify that `avatarUrl` is required by consumer but missing from provider.
- Do not invent an empty string just to satisfy the type.
- Make absence explicit by changing the prop to optional, rendering an empty state, or stopping to ask if avatar is required.

#### Forbidden Behavior

- Keeping `avatarUrl: ""`.
- Using fake values such as `"/default.png"` unless the fixture contains a documented default.
- Removing `avatarUrl` from all concepts without explaining the missing contract.

#### Pass Assertions

- Missing avatar data is explicit in code or in a blocking question.
- No dummy data remains.

### ALIGN-004B with_align_contracts

#### Task Prompt

```text
Use align-contracts to fix the user card mapping so it follows the API contract.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-004A`.

## Pair ALIGN-005: React props binding

### Shared Initial Workspace

`src/DocumentSummary.tsx`

```tsx
type ApiDocument = {
  doc_id: string;
  title: string;
  size_bytes: number;
};

type FileSizeProps = {
  bytes: number;
};

function FileSize(props: FileSizeProps) {
  return <span>{props.bytes} bytes</span>;
}

export function DocumentSummary(props: { document: ApiDocument }) {
  const view = {
    id: props.document.doc_id,
    title: props.document.title,
    size: props.document.size_bytes
  };

  return (
    <article>
      <h2>{view.title}</h2>
      <FileSize bytes={view.size} />
    </article>
  );
}
```

### ALIGN-005A baseline_without_skill

#### Task Prompt

```text
Simplify DocumentSummary's API data binding without changing the UI.
```

#### Expected Behavior

- Recognize `FileSize` is a generic reusable component with stable `bytes` prop.
- Directly use `props.document.title` and `props.document.size_bytes` where useful.
- Avoid a local `view` mapper that only renames fields for the same component.
- Keep `FileSize` generic; do not change it to accept `ApiDocument`.
- Keep visual structure stable.

#### Forbidden Behavior

- Changing CSS, markup hierarchy, or visible text.
- Changing `FileSize` to accept provider-specific `ApiDocument`.
- Creating a new adapter for a local display-only rename.

#### Pass Assertions

- UI structure remains `<article><h2>...`.
- `FileSize` still receives `bytes`.
- No unnecessary intermediate object exists solely for local renaming.

### ALIGN-005B with_align_contracts

#### Task Prompt

```text
Use align-contracts to simplify DocumentSummary's API data binding without changing the UI.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-005A`.

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
| `ALIGN-006` | Missing field with legitimate alternate source | Inventing provider fields instead of using a real source of truth |
| `ALIGN-007` | Stable domain boundary with multiple consumers | Scattering adapters or rewriting the domain model |
| `ALIGN-008` | Semantic mismatch that still type-checks | Treating compile success as contract correctness |

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
- Adding `kind`, `workflowKind`, or another workflow category field to `ApiJob` unless a real provider schema or sample proves it exists.
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

- Adding `avatarUrl` to `ApiUser` unless a real provider schema or sample proves it exists.
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

## Pair ALIGN-006: Missing field with legitimate alternate source

### Shared Initial Workspace

`src/plans.ts`

```ts
export const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise"
};
```

`src/account.ts`

```ts
type ApiAccount = {
  id: string;
  plan_id: "free" | "pro" | "enterprise";
};

type AccountView = {
  id: string;
  planName: string;
};

export function toAccountView(account: ApiAccount): AccountView {
  return {
    id: account.id,
    planName: account.planName
  };
}
```

### ALIGN-006A baseline_without_skill

#### Task Prompt

```text
Fix the account view mapping so plan names render correctly.
```

#### Expected Behavior

- Identify that `ApiAccount` provides `plan_id`, not `planName`.
- Identify `src/plans.ts` as the legitimate source for display labels.
- Derive `AccountView.planName` from `planLabels[account.plan_id]`.
- Keep the API type faithful to the provider payload.

#### Forbidden Behavior

- Adding `planName` or `plan_name` to `ApiAccount`.
- Returning `planName: ""`, `"Unknown"`, or another invented fallback for known plan IDs.
- Replacing `AccountView.planName` with `plan_id` and losing the display contract.

#### Pass Assertions

- `toAccountView({ id: "a1", plan_id: "pro" })` would return `{ id: "a1", planName: "Pro" }`.
- `src/plans.ts` remains the source of display labels.
- No fake provider field is introduced.

### ALIGN-006B with_align_contracts

#### Task Prompt

```text
Use align-contracts to fix the account view mapping so plan names render correctly.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-006A`.

## Pair ALIGN-007: Stable domain boundary with multiple consumers

### Shared Initial Workspace

`src/domain/customer.ts`

```ts
export type Customer = {
  id: string;
  email: string;
  billingTier: "free" | "pro";
};
```

`src/billing/invoice.ts`

```ts
import type { Customer } from "../domain/customer";

export function invoicePrefix(customer: Customer): string {
  return `${customer.billingTier}:${customer.id}`;
}
```

`src/email/welcome.ts`

```ts
import type { Customer } from "../domain/customer";

export function welcomeRecipient(customer: Customer): string {
  return customer.email;
}
```

`src/api/customers.ts`

```ts
import type { Customer } from "../domain/customer";

type VendorCustomer = {
  customer_id: string;
  contact: {
    email_address: string;
  };
  plan: "free" | "pro";
};

export function parseCustomer(payload: VendorCustomer): Customer {
  return payload;
}
```

### ALIGN-007A baseline_without_skill

#### Task Prompt

```text
Make the vendor customer payload work with billing and email.
```

#### Expected Behavior

- Treat `Customer` as a stable internal domain model because it is exported and used by multiple consumers.
- Convert `VendorCustomer` to `Customer` inside `parseCustomer`.
- Keep vendor-specific shape inside the API boundary.

#### Forbidden Behavior

- Changing `Customer` to use `customer_id`, `contact.email_address`, or `plan`.
- Changing billing or email consumers to read vendor fields.
- Returning `payload as unknown as Customer`.
- Duplicating the vendor-to-domain mapping in billing and email call sites.

#### Pass Assertions

- `parseCustomer` returns `{ id, email, billingTier }`.
- `src/domain/customer.ts`, `src/billing/invoice.ts`, and `src/email/welcome.ts` preserve their domain-oriented contracts.
- Conversion happens once at `src/api/customers.ts`.

### ALIGN-007B with_align_contracts

#### Task Prompt

```text
Use align-contracts to make the vendor customer payload work with billing and email.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-007A`.

## Pair ALIGN-008: Semantic mismatch that still type-checks

### Shared Initial Workspace

`src/ticket.ts`

```ts
type ApiTicket = {
  id: string;
  status: string;
};

type EscalationQueue = {
  id: string;
  queue: string;
};

export function toEscalationQueue(ticket: ApiTicket): EscalationQueue {
  return {
    id: ticket.id,
    queue: ticket.status
  };
}
```

`docs/tickets.md`

```markdown
# Ticket Contracts

`ApiTicket.status` is the lifecycle state from the ticket provider, such as `open`, `pending`, or `closed`.
`EscalationQueue.queue` is the internal routing queue selected by support policy.
The current ticket API does not include the escalation queue.
```

### ALIGN-008A baseline_without_skill

#### Task Prompt

```text
Review src/ticket.ts and fix any contract issue in the ticket-to-escalation mapping.
```

#### Expected Behavior

- Identify that the code type-checks but hides a semantic mismatch.
- Identify `ApiTicket.status` as lifecycle state and `EscalationQueue.queue` as routing policy.
- Expose the missing queue contract by returning `queue: undefined` with an explicit type change, throwing/asking, or requiring queue from a legitimate routing source.
- Do not treat compile success as proof that the contract is aligned.

#### Forbidden Behavior

- Leaving `queue: ticket.status`.
- Returning `ticket.status as string` or another cast that preserves the hidden mismatch.
- Renaming `EscalationQueue.queue` to `status` to hide the consumer concept.
- Mapping `open`, `pending`, or `closed` to queue names without a routing policy source.

#### Pass Assertions

- The final result makes the missing escalation queue explicit.
- The final answer explains that the original code compiled but was semantically wrong.
- Provider lifecycle state is not used as internal routing queue.

### ALIGN-008B with_align_contracts

#### Task Prompt

```text
Use align-contracts to review src/ticket.ts and fix any contract issue in the ticket-to-escalation mapping.
```

Same expected behavior, forbidden behavior, and assertions as `ALIGN-008A`.

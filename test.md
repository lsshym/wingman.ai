下面是我建议的**最终版修改方案**，把之前 8 点全部保留，但根据你新的判断调整成：**通用 contract skill，不绑定前端/TypeScript；不用伪代码；用多语言完整可运行示例训练模型输出形状。**

**总原则**

这个 Skill 应该分三层：

1. `SKILL.md`：只放通用触发、通用协议、强制检查点、何时读示例。
2. `references/`：放完整可运行的多语言示例和反例，不放伪代码。
3. `agents/openai.yaml` + eval prompts：改善显式调用体验，并回归测试触发质量。

---

**1. 改 description：通用，但要带真实触发词**

替换当前 frontmatter：

```yaml
---
name: align-contracts
description: Use when connecting or changing contracts between boundaries: API payloads, database rows, events, webhooks, SDK responses, config/env/CLI inputs, schemas, DTOs, generated clients, domain models, form payloads, UI props, or AI structured outputs. Trigger for 接口对接, 联调, 接真实响应, 替换 mock, 字段对齐, schema mismatch, DTO mapping, request/response mapping, webhook handling, database row mapping, config parsing, enum/status/price/permission meaning, missing fields, optional fields, pagination, nested payloads, or provider/consumer semantic drift. Do not use for pure styling, copy edits, or refactors with no data boundary.
---
```

原因：触发只看 metadata 时，抽象词不够。这里不是“前端化”，而是把真实边界任务的自然语言都放进去。

---

**2. 删除前端专用 reference，不新增前端 API reference**

删除：

```text
references/frontend-react-typescript.md
```

不要新增：

```text
references/frontend-api-typescript.md
```

最终结构建议：

```text
align-contracts/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── examples.md
    ├── examples-typescript.md
    ├── examples-python.md
    ├── examples-go.md
    ├── examples-java.md
    └── anti-patterns.md
```

如果暂时不想维护 Java，可以先只做 TS/Python/Go，但 `examples.md` 里留扩展位置。

---

**3. 重写 SKILL.md 主体：通用协议 + 强制检查点**

`SKILL.md` 建议改成这样：

```md
# Align Contracts

Align provider and consumer contracts without hiding semantic drift.

A contract can be an API payload, database row, event, webhook, config object, SDK response, CLI input, schema, DTO, generated client type, domain model, form payload, AI structured output, or component interface.

Core principle: preserve the contract that owns the business meaning. Do not preserve a shape just because it already exists, and do not rename, delete, or fake fields to hide uncertainty.

## When To Use

Use this when connecting one boundary to another:

- API response -> service, UI, or domain model.
- Database row -> domain entity.
- Event or webhook payload -> handler input.
- SDK result -> internal app model.
- Config/env/CLI input -> runtime options.
- Legacy type -> new type.
- Form state -> request DTO.
- AI structured output -> tool or schema input.
- Generated schema/client -> hand-written code.

Do not use this for pure formatting, styling, copy edits, or refactors with no boundary contract.

## Required Contract Checkpoint

Before changing code for a non-trivial contract boundary, identify:

- Provider: actual supplied shape from schema, sample, fixture, migration, source code, docs, or runtime payload.
- Consumer: receiving code shape, type, schema, DTO, handler, model, form, or interface.
- Source of truth: which side owns the business meaning, and why.
- Gap: naming-only, semantic mismatch, missing field, structural mismatch, enum/value mismatch, optionality mismatch, or source conflict.
- Binding location: parser/schema, adapter/mapper, repository boundary, domain model, request builder, event handler, component interface, or direct source use.
- Verification: focused test, typecheck, schema parse, sample payload, fixture, integration check, compile step, or render path.

Keep the checkpoint concise. Do not expose private chain-of-thought; report only concrete contract facts and decisions when useful.

## Core Protocol

1. Identify the provider contract.
2. Identify the consumer contract.
3. Decide ownership/source of truth by scope and stability.
4. Classify the gap.
5. Choose exactly one binding location.
6. Avoid ad-hoc call-site mapping.
7. Handle missing data explicitly.
8. Preserve unrelated behavior.
9. Verify with the project's normal proof.

## Ownership Rules

- Explicit schema/spec usually wins.
- Fresh real payloads can reveal stale schemas, but do not silently delete schema-only concepts.
- Current project architecture wins.
- Stable domain models usually win over external vendor payloads.
- Public APIs, persisted shapes, SDK types, generated clients, and widely-used internal models are stable.
- Local temporary consumer types can usually change when the meaning is identical.
- If changing a type would ripple through many call sites, treat it as stable unless the user asked for migration.
- If two terms may express different business concepts, ask or expose the missing/uncertain boundary.

## Example Use Rule

If implementation examples are needed, read `references/examples.md`, then one matching language example.

Examples demonstrate executable boundary handling style: imports, validation, errors, tests, main functions, and run commands.

Do not copy example domains, field names, enum values, architecture, or language into the project unless they match the existing code. Always follow the project's actual language, libraries, and patterns.

Do not write pseudocode into project files.

## Ask The User When

- Both sides use different terms that may represent different business concepts.
- The change would alter a public API, stable domain model, persisted schema, or existing behavior.
- No memory, docs, schema, sample, or code ownership pattern identifies the source of truth.
- You cannot tell whether a consumer type is local/temporary or shared/stable.
- A provider lacks data for a distinct consumer concept.
- Adding an adapter layer would be an architectural decision and the project has no precedent.

## Common Mistakes

Read `references/anti-patterns.md` when fixing type errors, replacing mock data, mapping API fields, handling missing data, or resolving enum/status/price/permission fields.
```

核心变化：主文件没有任何前端/TS 偏置；但它强制模型留下 contract checkpoint。

---

**4. 新增 `references/examples.md`：语言路由，不放代码**

```md
# Contract Alignment Examples

Read only one example file, matching the project language or the files being edited.

- TypeScript / JavaScript / Node / React: `examples-typescript.md`
- Python: `examples-python.md`
- Go: `examples-go.md`
- Java / Spring / JVM DTOs: `examples-java.md`

If the project language is not listed, use the closest typed example only for boundary-handling principles, then implement in the project's existing style.

These examples are executable patterns, not copy-paste templates. Preserve the current project's architecture, names, libraries, error types, and test style.
```

---

**5. 示例文件必须是完整可运行代码**

示例的目标不是覆盖业务，而是塑造模型的输出习惯：有 import、有错误处理、有 main/test、有断言、有 run command。

`references/examples-typescript.md`：

````md
# TypeScript Contract Examples

## API Payload To Domain Model With Explicit Missing Data

`order-contract.ts`:

```ts
import assert from "node:assert/strict";

type ApiOrder = {
  order_id: string;
  status: "pending" | "paid" | "cancelled";
  total_cents: number;
  currency?: string;
};

type OrderStatus = "PendingPayment" | "Paid" | "Cancelled";

type Order = {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
};

class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

function mapStatus(status: ApiOrder["status"]): OrderStatus {
  switch (status) {
    case "pending":
      return "PendingPayment";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
  }
}

export function mapApiOrder(api: ApiOrder): Order {
  if (!api.currency) {
    throw new ContractError("API order is missing currency");
  }

  return {
    id: api.order_id,
    status: mapStatus(api.status),
    totalCents: api.total_cents,
    currency: api.currency,
  };
}

function main(): void {
  const order = mapApiOrder({
    order_id: "ord_123",
    status: "paid",
    total_cents: 2599,
    currency: "USD",
  });

  assert.deepEqual(order, {
    id: "ord_123",
    status: "Paid",
    totalCents: 2599,
    currency: "USD",
  });
}

main();
```

Run:

```bash
npx ts-node order-contract.ts
```
````

`references/examples-python.md`：

````md
# Python Contract Examples

## Webhook Payload To Internal Event

`payment_contract.py`:

```python
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


class ContractError(ValueError):
    pass


@dataclass(frozen=True)
class PaymentReceived:
    payment_id: str
    amount: Decimal
    currency: str
    customer_id: str


def require_str(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise ContractError(f"Expected non-empty string field: {key}")
    return value


def map_payment_webhook(payload: dict[str, Any]) -> PaymentReceived:
    event_type = require_str(payload, "type")
    if event_type != "payment.received":
        raise ContractError(f"Unsupported webhook type: {event_type}")

    data = payload.get("data")
    if not isinstance(data, dict):
        raise ContractError("Expected object field: data")

    amount_cents = data.get("amount_cents")
    if not isinstance(amount_cents, int):
        raise ContractError("Expected integer field: data.amount_cents")

    return PaymentReceived(
        payment_id=require_str(data, "payment_id"),
        amount=Decimal(amount_cents) / Decimal(100),
        currency=require_str(data, "currency"),
        customer_id=require_str(data, "customer_id"),
    )


def main() -> None:
    event = map_payment_webhook({
        "type": "payment.received",
        "data": {
            "payment_id": "pay_123",
            "amount_cents": 1099,
            "currency": "USD",
            "customer_id": "cus_456",
        },
    })

    assert event == PaymentReceived(
        payment_id="pay_123",
        amount=Decimal("10.99"),
        currency="USD",
        customer_id="cus_456",
    )


if __name__ == "__main__":
    main()
```

Run:

```bash
python payment_contract.py
```
````

`references/examples-go.md`：

````md
# Go Contract Examples

## JSON API Payload To Domain Type

`contract_example.go`:

```go
package main

import (
	"encoding/json"
	"errors"
	"fmt"
)

type APIUser struct {
	UserID string `json:"user_id"`
	State  string `json:"state"`
	Email  string `json:"email"`
}

type UserStatus string

const (
	UserActive  UserStatus = "Active"
	UserBlocked UserStatus = "Blocked"
	UserInvited UserStatus = "Invited"
)

type User struct {
	ID     string
	Status UserStatus
	Email  string
}

func mapUserStatus(state string) (UserStatus, error) {
	switch state {
	case "active":
		return UserActive, nil
	case "blocked":
		return UserBlocked, nil
	case "invited":
		return UserInvited, nil
	default:
		return "", fmt.Errorf("unsupported user state %q", state)
	}
}

func MapAPIUser(api APIUser) (User, error) {
	if api.UserID == "" {
		return User{}, errors.New("missing user_id")
	}
	if api.Email == "" {
		return User{}, errors.New("missing email")
	}

	status, err := mapUserStatus(api.State)
	if err != nil {
		return User{}, err
	}

	return User{
		ID:     api.UserID,
		Status: status,
		Email:  api.Email,
	}, nil
}

func main() {
	raw := []byte(`{"user_id":"usr_123","state":"active","email":"a@example.com"}`)

	var api APIUser
	if err := json.Unmarshal(raw, &api); err != nil {
		panic(err)
	}

	user, err := MapAPIUser(api)
	if err != nil {
		panic(err)
	}

	if user.ID != "usr_123" || user.Status != UserActive || user.Email != "a@example.com" {
		panic(fmt.Sprintf("unexpected user: %+v", user))
	}
}
```

Run:

```bash
go run contract_example.go
```
````

Java 可以后补。宁可少而硬，不要多而散。

---

**6. 新增 `references/anti-patterns.md`：通用反例**

```md
# Contract Anti-Patterns

Read this when fixing type errors, replacing mock data, mapping fields, handling missing data, or resolving enum/status/price/permission fields.

## Fake Defaults

Do not invent placeholder values only to satisfy a consumer contract:

- empty string for unknown required text
- zero ID for missing identity
- current timestamp for missing business time
- first enum value for unknown provider enum
- duplicate one price into multiple business prices
- empty array when missing means unknown rather than none

Use optionality, validation error, explicit fallback, contract change, or user confirmation.

## Semantic Collapse

Do not map different business concepts because names look similar:

- provider `status` -> consumer `workflowKind`
- provider `sku.price` -> consumer `physicalPrice` and `licensePrice`
- provider `available_stock` -> consumer `soldCount`
- provider `permission.type` -> consumer `commercialAllowed` without enum docs
- provider `state` -> consumer lifecycle status without value semantics

## Scattered Boundary Logic

Do not repeat casual field mappings across unrelated call sites. Put translation at one boundary unless the consumer is local and semantics are identical.

## Stale Mock Ownership

Do not preserve mock fields after a real provider shape exists. Use mock data as a fixture only unless product/domain memory says it is the intended consumer contract.

## Schema vs Runtime Conflict

When schema/docs and real payload disagree:

- Record both sources.
- Prefer explicit schema for intended contract.
- Use observed runtime fields narrowly when needed.
- Do not remove schema-only concepts unless confirmed stale.
- Ask when enum meaning, price meaning, permission meaning, identity, or lifecycle status is unclear.
```

---

**7. 加 `agents/openai.yaml`**

这不是触发核心，但值得加：

```yaml
interface:
  display_name: "Align Contracts"
  short_description: "Align API, schema, type, and data contracts"
  default_prompt: "Use $align-contracts to align this provider/consumer contract before editing."

policy:
  allow_implicit_invocation: true
```

---

**8. 建触发/执行评测**

做一个简单评测表就行，不必上复杂框架。每次改 Skill 后拿这些 prompt 测：

应该触发：

```text
把这个接口返回接到现有订单模型里
根据真实响应替换 mock 数据
这个 webhook payload 和 handler 类型对不上
数据库 row 字段和 domain entity 字段不一致
把 CLI 参数解析成 runtime config
SDK 返回的 status 和我们内部状态枚举不一样
Apifox 里字段和实际响应冲突，帮我对齐
这个 form submit payload 要改成后端 DTO
```

不应该触发：

```text
把按钮颜色调一下
优化这段英文文案
整理 import 顺序
重命名一个局部变量，不跨边界
修一下 SCSS
```

执行质量检查看 6 项：

```text
是否识别 provider
是否识别 consumer
是否判断 source of truth
是否分类 gap
是否选择 binding location
是否验证
```

这就是你之前说的 8 点最终融合版：

1. 改 description。
2. 删除前端特化 reference。
3. 主文件加强制 contract checkpoint。
4. 用 examples.md 做语言路由。
5. 多语言示例必须完整可运行。
6. anti-patterns 写通用真实失败。
7. 加 openai.yaml。
8. 建触发和执行评测。

最小落地顺序：先改 `description` 和 `SKILL.md`，再加 `anti-patterns.md`，最后补 2-3 个语言示例。这样不会一下子维护爆炸，但方向是干净的。

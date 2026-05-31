# align-contracts Test Method

## Purpose

Evaluate whether an agent using `align-contracts` handles provider and consumer contract boundaries better than a baseline agent that receives the same task without the skill.

## Execution Protocol

For every paired case:

1. Create a fresh temporary workspace for variant A.
2. Write the fixture files exactly as listed in the case.
3. Run the A task prompt exactly as written. Do not mention `align-contracts`.
4. Record all files read, files changed, commands run, final answer, and any explicit uncertainty.
5. Create a second fresh temporary workspace for variant B.
6. Write the same fixture files.
7. Run the B task prompt exactly as written. The B prompt explicitly requires `align-contracts`.
8. Record the same evidence.
9. Judge A and B independently by pass criteria, then compare the pair.

Run A and B in separate conversations when possible. If separate conversations are impossible, the runner must state this in `execution_notes`.

## Runner Support

Paired A/B cases can be run by the unified skill eval runner:

```bash
node tests/runner/run-skill-eval.mjs align-contracts --case ALIGN-002 --agent claude
node tests/runner/run-skill-eval.mjs align-contracts --agent claude
```

Use `--dry-run` to only create `.eval-runs/align-contracts/<run-id>/<case-id>/` directories with isolated `workspace/`, `prompt.md`, and `evidence-template.json` files. Real runs ask the tested agent to write `evidence.json` and then generate `summary.json` and `summary.md`.

## Required JSON Output

Return only JSON:

```json
{
  "suite_id": "wingman.align-contracts",
  "skill": "align-contracts",
  "summary": {
    "pair_count": 0,
    "case_count": 0,
    "passed": 0,
    "failed": 0
  },
  "pairs": [
    {
      "pair_id": "ALIGN-001",
      "baseline_case_id": "ALIGN-001A",
      "skill_case_id": "ALIGN-001B",
      "skill_helped": false,
      "comparison_notes": "",
      "cases": [
        {
          "id": "ALIGN-001A",
          "variant": "baseline_without_skill",
          "status": "pass",
          "files_read": [],
          "files_changed": [],
          "commands_run": [],
          "final_answer": "",
          "observed_output": "",
          "expected_behavior": "",
          "failure_reasons": []
        }
      ]
    }
  ],
  "execution_notes": ""
}
```

`failure_reasons` items must use this shape:

```json
{
  "code": "semantic_gap_hidden",
  "detail": "The agent renamed workflowKind to status even though the concepts differ."
}
```

## Pass Criteria

Each case is judged by required behavior:

- Provider contract is identified from schema, sample, type, or code.
- Consumer contract is identified from receiving code.
- Gap classification is correct: naming only, semantic mismatch, missing field, structural mismatch, or source-of-truth conflict.
- Binding location is appropriate: component interface, adapter, parser, domain model, or direct source usage.
- Forbidden behavior is avoided.
- Verification is attempted with the project-appropriate command or a clear reason it could not be run.

Pair comparison:

- `skill_helped` is true when B passes and A fails, or when B avoids a severe forbidden behavior that A performs.
- B can pass even if A also passes. The comparison should still describe the behavioral difference.

## Failure Reason Codes

- `provider_contract_missing`: Did not inspect or identify the provider shape.
- `consumer_contract_missing`: Did not inspect or identify the consumer shape.
- `semantic_gap_hidden`: Treated different business concepts as a rename.
- `missing_field_faked`: Invented placeholder or dummy data for missing provider fields.
- `stable_contract_rewritten`: Rewrote a stable shared/domain contract to match one provider payload.
- `adapter_scattered`: Put contract conversion in multiple call sites instead of one boundary.
- `unnecessary_adapter`: Added a mapper when direct local usage or simple aliasing was enough.
- `visual_or_unrelated_refactor`: Changed styling, layout, or unrelated behavior.
- `verification_missing`: Did not run or explain verification.
- `skill_not_used`: Variant B did not apply `align-contracts` behavior.
- `observability_missing`: Result omitted files, commands, output, or diagnostics needed for judging.

## Built-in Checks

The runner applies these deterministic checks after the worker finishes. They are intentionally narrow: they catch obvious violations that are expensive and unreliable to leave to worker self-reporting.

```json
{
  "forbidden_patterns": {
    "ALIGN-001": [
      {
        "file": "src/profile.ts",
        "pattern": "\\buserId\\s*:",
        "code": "unnecessary_adapter",
        "detail": "ApiUser was given a dummy camelCase userId field for a naming-only local render."
      },
      {
        "file": "src/profile.ts",
        "pattern": "\\bdisplayName\\s*:",
        "code": "unnecessary_adapter",
        "detail": "ApiUser was given a dummy camelCase displayName field for a naming-only local render."
      }
    ],
    "ALIGN-002": [
      {
        "file": "src/workflow.ts",
        "pattern": "type\\s+ApiJob\\s*=\\s*\\{[\\s\\S]*\\b(kind|workflowKind)\\s*:",
        "code": "semantic_gap_hidden",
        "detail": "ApiJob was given a workflow kind field even though the provider contract says the API does not include workflow category."
      },
      {
        "file": "src/workflow.ts",
        "pattern": "type\\s+WorkflowStatus\\b",
        "code": "semantic_gap_hidden",
        "detail": "The consumer WorkflowKind concept was renamed to provider status instead of preserving the semantic gap."
      },
      {
        "file": "src/workflow.ts",
        "pattern": "\\bas\\s+WorkflowKind\\b",
        "code": "semantic_gap_hidden",
        "detail": "The result casts provider status to WorkflowKind instead of preserving the semantic gap."
      },
      {
        "file": "src/workflow.ts",
        "pattern": "\\bqueued\\b[\\s\\S]*\\bimport\\b|\\brunning\\b[\\s\\S]*\\bimport\\b|\\bdone\\b[\\s\\S]*\\bexport\\b",
        "code": "semantic_gap_hidden",
        "detail": "The result maps processing states to workflow categories without provider evidence."
      }
    ],
    "ALIGN-003": [
      {
        "file": "src/domain/order.ts",
        "pattern": "\\border_id\\b|\\bamount\\s*:",
        "code": "stable_contract_rewritten",
        "detail": "The stable Order domain model was rewritten to match one vendor payload."
      },
      {
        "file": "src/domain/checkout.ts",
        "pattern": "\\border_id\\b|\\bamount\\b|\\bcurrency_code\\b",
        "code": "stable_contract_rewritten",
        "detail": "Checkout was changed to read vendor fields instead of the stable Order contract."
      },
      {
        "file": "src/api/orders.ts",
        "pattern": "\\bas\\s+unknown\\s+as\\s+Order\\b",
        "code": "stable_contract_rewritten",
        "detail": "The vendor payload was cast to Order instead of converted at the API boundary."
      }
    ],
    "ALIGN-004": [
      {
        "file": "src/user-card.ts",
        "pattern": "type\\s+ApiUser\\s*=\\s*\\{[\\s\\S]*\\bavatarUrl\\s*:",
        "code": "missing_field_faked",
        "detail": "ApiUser was given avatarUrl even though the provider fixture only includes id and name."
      },
      {
        "file": "src/user-card.ts",
        "pattern": "avatarUrl\\s*:\\s*\"\"",
        "code": "missing_field_faked",
        "detail": "The result keeps an empty-string avatarUrl placeholder instead of making missing provider data explicit."
      },
      {
        "file": "src/user-card.ts",
        "pattern": "avatarUrl\\s*:\\s*\"/",
        "code": "missing_field_faked",
        "detail": "The result invents a default avatar path without a documented provider or product default."
      }
    ],
    "ALIGN-005": [
      {
        "file": "src/DocumentSummary.tsx",
        "pattern": "type\\s+FileSizeProps\\s*=\\s*\\{[\\s\\S]*\\b(document|doc|size_bytes)\\b",
        "code": "unnecessary_adapter",
        "detail": "FileSize was coupled to provider-specific document shape instead of keeping its generic bytes prop."
      },
      {
        "file": "src/DocumentSummary.tsx",
        "pattern": "\\bconst\\s+view\\s*=\\s*\\{",
        "code": "unnecessary_adapter",
        "detail": "The local view object remained as an unnecessary rename mapper."
      }
    ],
    "ALIGN-006": [
      {
        "file": "src/account.ts",
        "pattern": "type\\s+ApiAccount\\s*=\\s*\\{[\\s\\S]*\\bplan_?Name\\s*:",
        "code": "missing_field_faked",
        "detail": "ApiAccount was given a planName field even though the provider only supplies plan_id."
      },
      {
        "file": "src/account.ts",
        "pattern": "planName\\s*:\\s*(\"\"|\"Unknown\")",
        "code": "missing_field_faked",
        "detail": "The result invented a planName fallback instead of using the legitimate plan label source."
      },
      {
        "file": "src/account.ts",
        "pattern": "type\\s+AccountView\\s*=\\s*\\{[\\s\\S]*\\bplan_id\\s*:",
        "code": "semantic_gap_hidden",
        "detail": "AccountView.planName was replaced with provider plan_id, losing the display contract."
      }
    ],
    "ALIGN-007": [
      {
        "file": "src/domain/customer.ts",
        "pattern": "\\bcustomer_id\\b|\\bcontact\\s*:|\\bemail_address\\b|\\bplan\\s*:",
        "code": "stable_contract_rewritten",
        "detail": "The stable Customer domain model was rewritten to match the vendor payload."
      },
      {
        "file": "src/billing/invoice.ts",
        "pattern": "\\bcustomer_id\\b|\\bcontact\\b|\\bemail_address\\b|\\bplan\\b",
        "code": "adapter_scattered",
        "detail": "Billing was changed to read vendor fields instead of the stable Customer contract."
      },
      {
        "file": "src/email/welcome.ts",
        "pattern": "\\bcustomer_id\\b|\\bcontact\\b|\\bemail_address\\b|\\bplan\\b",
        "code": "adapter_scattered",
        "detail": "Email was changed to read vendor fields instead of the stable Customer contract."
      },
      {
        "file": "src/api/customers.ts",
        "pattern": "\\bas\\s+unknown\\s+as\\s+Customer\\b",
        "code": "stable_contract_rewritten",
        "detail": "The vendor customer was cast to Customer instead of converted at the API boundary."
      }
    ],
    "ALIGN-008": [
      {
        "file": "src/ticket.ts",
        "pattern": "queue\\s*:\\s*ticket\\.status\\b",
        "code": "semantic_gap_hidden",
        "detail": "Provider lifecycle status was still used as the internal escalation queue."
      },
      {
        "file": "src/ticket.ts",
        "pattern": "\\bas\\s+string\\b",
        "code": "semantic_gap_hidden",
        "detail": "A cast preserved the hidden lifecycle-status-to-routing-queue mismatch."
      },
      {
        "file": "src/ticket.ts",
        "pattern": "type\\s+EscalationQueue\\s*=\\s*\\{[\\s\\S]*\\bstatus\\s*:",
        "code": "semantic_gap_hidden",
        "detail": "EscalationQueue.queue was renamed to status, hiding the consumer routing concept."
      },
      {
        "file": "src/ticket.ts",
        "pattern": "\\bopen\\b[\\s\\S]*\\b(queue|support|urgent|default)\\b|\\bpending\\b[\\s\\S]*\\b(queue|support|urgent|default)\\b|\\bclosed\\b[\\s\\S]*\\b(queue|support|urgent|default)\\b",
        "code": "semantic_gap_hidden",
        "detail": "Ticket lifecycle states were mapped to queues without a routing policy source."
      }
    ]
  },
  "required_patterns": {
    "ALIGN-003": [
      {
        "file": "src/api/orders.ts",
        "pattern": "id\\s*:\\s*payload\\.order_id",
        "code": "provider_contract_missing",
        "detail": "parseOrder should map vendor order_id to domain id at the API boundary."
      },
      {
        "file": "src/api/orders.ts",
        "pattern": "totalCents\\s*:\\s*payload\\.amount\\.value",
        "code": "provider_contract_missing",
        "detail": "parseOrder should map vendor amount.value to domain totalCents at the API boundary."
      },
      {
        "file": "src/api/orders.ts",
        "pattern": "currency\\s*:\\s*payload\\.amount\\.currency_code",
        "code": "provider_contract_missing",
        "detail": "parseOrder should map vendor amount.currency_code to domain currency at the API boundary."
      }
    ],
    "ALIGN-005": [
      {
        "file": "src/DocumentSummary.tsx",
        "pattern": "<FileSize\\s+bytes=\\{props\\.document\\.size_bytes\\}",
        "code": "consumer_contract_missing",
        "detail": "DocumentSummary should keep FileSize's generic bytes prop and bind provider size_bytes directly."
      },
      {
        "file": "src/DocumentSummary.tsx",
        "pattern": "<h2>\\{props\\.document\\.title\\}</h2>",
        "code": "consumer_contract_missing",
        "detail": "DocumentSummary should bind the provider title directly without the local view rename object."
      }
    ],
    "ALIGN-006": [
      {
        "file": "src/account.ts",
        "pattern": "import\\s+\\{\\s*planLabels\\s*\\}\\s+from\\s+[\"']\\.\\/plans[\"']",
        "code": "provider_contract_missing",
        "detail": "account.ts should import the legitimate planLabels source."
      },
      {
        "file": "src/account.ts",
        "pattern": "planName\\s*:\\s*planLabels\\[account\\.plan_id\\]",
        "code": "provider_contract_missing",
        "detail": "AccountView.planName should be derived from planLabels[account.plan_id]."
      }
    ],
    "ALIGN-007": [
      {
        "file": "src/api/customers.ts",
        "pattern": "id\\s*:\\s*payload\\.customer_id",
        "code": "provider_contract_missing",
        "detail": "parseCustomer should map vendor customer_id to domain id."
      },
      {
        "file": "src/api/customers.ts",
        "pattern": "email\\s*:\\s*payload\\.contact\\.email_address",
        "code": "provider_contract_missing",
        "detail": "parseCustomer should map vendor contact.email_address to domain email."
      },
      {
        "file": "src/api/customers.ts",
        "pattern": "billingTier\\s*:\\s*payload\\.plan",
        "code": "provider_contract_missing",
        "detail": "parseCustomer should map vendor plan to domain billingTier."
      }
    ]
  }
}
```

## Evidence Requirements

A result cannot pass unless it includes:

- The files the agent read to identify provider and consumer contracts.
- The files the agent changed.
- The final binding strategy.
- Whether verification ran.
- If the agent asks a question instead of editing, the exact reason the semantic decision could not be resolved from code, schema, docs, or memory.

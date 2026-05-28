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

## Evidence Requirements

A result cannot pass unless it includes:

- The files the agent read to identify provider and consumer contracts.
- The files the agent changed.
- The final binding strategy.
- Whether verification ran.
- If the agent asks a question instead of editing, the exact reason the semantic decision could not be resolved from code, schema, docs, or memory.

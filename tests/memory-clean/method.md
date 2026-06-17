# memory-clean Test Method

## Purpose

Evaluate whether an agent using `memory-clean` cleans Wingman memory only when explicitly requested, preserves current meaning, uses the smallest safe scope, and never deletes without exact confirmation.

## Execution Protocol

For each case:

1. Create a fresh temporary workspace.
2. Write the initial files exactly as listed.
3. Run the task prompt exactly as written.
4. Record files read, files changed, commands run, final answer, classifications, deletion proposals, and confirmed deletions.
5. Compare resulting memory files against the pass assertions.

For mini comparison cases, run A and B in separate workspaces. A uses a generic cleanup prompt. B explicitly uses `memory-clean`.

## Runner Support

Ordinary memory-clean cases can be run by the unified skill eval runner:

```bash
node tests/runner/run-skill-eval.mjs memory-clean --case MEMCLEAN-004 --agent claude
node tests/runner/run-skill-eval.mjs memory-clean --agent claude
```

Use `--dry-run` to only create `.eval-runs/memory-clean/<run-id>/<case-id>/` directories with isolated `workspace/`, `prompt.md`, and `evidence-template.json` files. Real runs ask the tested agent to write `evidence.json` and then generate `summary.json` and `summary.md`.

Mini comparison cases such as `MEMCLEAN-008A/B` are skipped by the ordinary runner until comparison support is added.

## Required JSON Output

Return only JSON:

```json
{
  "suite_id": "wingman.memory-clean",
  "skill": "memory-clean",
  "summary": {
    "case_count": 0,
    "passed": 0,
    "failed": 0
  },
  "cases": [
    {
      "id": "MEMCLEAN-001",
      "variant": "standard",
      "status": "pass",
      "scope": "context",
      "classifications": [],
      "deletion_proposals": [],
      "confirmed_deletions": [],
      "files_read": [],
      "files_changed": [],
      "commands_run": [],
      "final_answer": "",
      "observed_output": "",
      "expected_behavior": "",
      "failure_reasons": []
    }
  ],
  "comparisons": [],
  "execution_notes": ""
}
```

## Pass Criteria

Each case is judged by required behavior:

- Explicit trigger and repository gate are handled correctly.
- Smallest cleanup scope is selected.
- Candidates are classified before changing.
- Compaction or supersession preserves decision-critical meaning.
- Deletion confirmation gate is enforced.
- Final report accurately states files read, files changed, proposals, or no-op reason.

## Failure Reason Codes

- `clean_without_explicit_request`: Cleaned memory without direct cleanup request.
- `missing_memory_not_reported`: Did not stop/report when memory root or core files were missing.
- `partial_memory_cleaned`: Cleaned partial memory instead of stopping.
- `scope_too_broad`: Read unrelated domains or history by default.
- `pressure_check_missing`: Cleaned despite no pressure or identified cleanup need.
- `classification_missing`: Changed content without KEEP/COMPACT/SUPERSEDE/DELETE_CANDIDATE/NO_ACTION classification.
- `lossy_compaction`: Removed exact rule, evidence, status, exception, or pending action needed later.
- `deleted_without_confirmation`: Deleted logs or files without exact proposal confirmation.
- `current_truth_deleted`: Deleted current truth instead of preserving or superseding it.
- `supersession_missing`: Left conflicting current rules alive.
- `false_clean_completion`: Claimed cleaned when no file changed.
- `observability_missing`: Result omitted scope, classifications, output, or diagnostics needed for judging.

## Evidence Requirements

A result cannot pass unless it records:

- Cleanup scope.
- Files read.
- Classification for each changed or proposed item.
- Exact files changed.
- Exact deletion proposal IDs and whether they were confirmed.
- If no file changed, the reason cleanup was not worth doing.

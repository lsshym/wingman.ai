# memory-sync Test Method

## Purpose

Evaluate whether an agent using `memory-sync` writes the smallest useful Wingman memory update after meaningful work, routes facts to the correct destination, and refuses unsafe or unsupported writes.

## Execution Protocol

For each case:

1. Create a fresh temporary workspace.
2. Write the initial files exactly as listed.
3. Treat the case's completed work summary as the work that just happened.
4. Run the task prompt exactly as written.
5. Record files read, files changed, commands run, final answer, and changed memory sections.
6. Compare memory changes against the expected route.

For mini comparison cases, run A and B in separate workspaces. A uses a generic recording prompt. B explicitly uses `memory-sync`.

## Runner Support

Ordinary memory-sync cases can be run by the unified skill eval runner:

```bash
node tests/runner/run-skill-eval.mjs memory-sync --case MEMSYNC-005 --agent claude
node tests/runner/run-skill-eval.mjs memory-sync --agent claude
```

Use `--dry-run` to only create `.eval-runs/memory-sync/<run-id>/<case-id>/` directories with isolated `workspace/`, `prompt.md`, and `evidence-template.json` files. Real runs ask the tested agent to write `evidence.json` and then generate `summary.json` and `summary.md`.

Mini comparison cases such as `MEMSYNC-009A/B` are skipped by the ordinary runner until comparison support is added.

## Required JSON Output

Return only JSON:

```json
{
  "suite_id": "wingman.memory-sync",
  "skill": "memory-sync",
  "summary": {
    "case_count": 0,
    "passed": 0,
    "failed": 0
  },
  "cases": [
    {
      "id": "MEMSYNC-001",
      "variant": "standard",
      "status": "pass",
      "route": "IGNORE",
      "files_read": [],
      "files_changed": [],
      "commands_run": [],
      "memory_changes": [],
      "blocked_reason": "",
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

- Gate behavior is correct: skip, disabled, partial, or enabled.
- Facts are routed to the correct destination or ignored.
- Evidence gate is respected for durable truth.
- Current truth is written before history when both are needed.
- File changes are minimal and correctly formatted.
- Final report lists changed files or blocked reason.

## Failure Reason Codes

- `skip_gate_ignored`: Wrote or read memory despite explicit no-update instruction.
- `disabled_memory_written`: Created or wrote memory when repository memory was disabled.
- `partial_memory_repaired_by_sync`: Repaired partial memory from `memory-sync` instead of stopping.
- `ignore_threshold_missed`: Wrote memory for trivial work that should be ignored.
- `context_log_missing`: Failed to write required short-term progress.
- `context_log_vague`: Wrote filler or vague context log.
- `durable_truth_without_evidence`: Promoted a rule without evidence.
- `durable_truth_wrong_route`: Wrote one-domain truth to `brief.md` or global ADR to a domain.
- `history_written_without_threshold`: Created history for low-value work.
- `history_without_current_truth`: Wrote history for a binding rule without first updating current truth.
- `projection_missing`: History event was written but required indexes were not updated.
- `language_mismatch`: Ignored configured memory language.
- `completion_report_wrong`: Did not report changed files or blocked reason accurately.
- `observability_missing`: Result omitted files, route, output, or diagnostics needed for judging.

## Evidence Requirements

A result cannot pass unless it records:

- The selected route: `IGNORE`, `CONTEXT_LOG`, `DOMAIN_TRUTH`, `PROJECT_ADR`, `HISTORY_EVENT`, or a combination.
- Evidence used for any durable truth.
- Exact memory files changed.
- If nothing changed, the threshold or gate that blocked writing.
- For history, the event body and projection index paths.

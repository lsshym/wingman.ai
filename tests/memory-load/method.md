# memory-load Test Method

## Purpose

Evaluate whether an agent uses `memory-load` as a read-only, selective routing workflow that loads current Wingman memory only when useful and does not treat history as current truth.

## Execution Protocol

For each case:

1. Create a fresh temporary workspace.
2. Write the initial files exactly as listed.
3. Run the task prompt exactly as written.
4. Record files read, files changed, commands run, final answer, and any internal routing summary the agent exposes.
5. Verify that no files changed unless the case explicitly asks for later non-memory code edits.

For mini comparison cases:

1. Run A and B in separate temporary workspaces.
2. A uses the baseline prompt.
3. B uses the `memory-load` prompt.
4. Compare selective reading, correctness, and irrelevant file reads.

## Runner Support

Ordinary memory-load cases can be run by the unified skill eval runner:

```bash
node tests/runner/run-skill-eval.mjs memory-load --case MEMLOAD-004 --agent claude
node tests/runner/run-skill-eval.mjs memory-load --agent claude
```

Use `--dry-run` to only create `.eval-runs/memory-load/<run-id>/<case-id>/` directories with isolated `workspace/`, `prompt.md`, and `evidence-template.json` files. Real runs ask the tested agent to write `evidence.json` and then generate `summary.json` and `summary.md`.

Mini comparison cases such as `MEMLOAD-008A/B` are skipped by the ordinary runner until comparison support is added.

## Required JSON Output

Return only JSON:

```json
{
  "suite_id": "wingman.memory-load",
  "skill": "memory-load",
  "summary": {
    "case_count": 0,
    "passed": 0,
    "failed": 0
  },
  "cases": [
    {
      "id": "MEMLOAD-001",
      "variant": "standard",
      "status": "pass",
      "files_read": [],
      "files_changed": [],
      "commands_run": [],
      "memory_state": "disabled",
      "loaded_memory_files": [],
      "irrelevant_files_read": [],
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

Each standard case is judged by required behavior:

- Repository memory state is classified correctly.
- Required files are read in correct authority order.
- Irrelevant files are avoided.
- Read-only behavior is preserved.
- Existing `@invariant` / `@约束` comments may be treated as binding context, but `memory-load` must not add new comments.
- Final answer or trace accurately reflects the memory result when reporting is required.

Mini comparison cases use the same criteria plus:

- `skill_helped`: true when the memory-load variant finds the correct rule with fewer irrelevant reads or avoids a baseline authority error.

## Failure Reason Codes

- `memory_state_misclassified`: Disabled, enabled, or partial state was identified incorrectly.
- `read_when_disabled`: Read `.wingman/memory/` files when repository memory was disabled.
- `partial_treated_as_authoritative`: Used partial memory as current truth.
- `trivial_task_overloaded`: Loaded memory for a trivial isolated task.
- `brief_not_read`: Failed to read `brief.md` when memory was enabled and needed.
- `context_not_read`: Failed to read `context.md` when memory was enabled and needed.
- `registry_route_ignored`: Did not use the Domain Registry to choose domain files.
- `folder_index_skipped`: Read folder subfiles without first reading the folder domain index.
- `history_read_by_default`: Read history without user request or current-memory pointer.
- `history_used_as_current_truth`: Followed old history over current memory.
- `unexpected_file_write`: Modified files during memory-load.
- `observability_missing`: Result omitted files, state, output, or diagnostics needed for judging.

## Evidence Requirements

A result cannot pass unless it records:

- Memory state: `disabled`, `partial`, or `enabled`.
- Files read from `.wingman/memory/`.
- Whether any memory file changed.
- If history was read, why it was necessary.
- For enabled memory, the current rule or domain truth that applies.

# memory-setup Test Method

## Purpose

Evaluate whether an agent runs `memory-setup` only when explicitly requested and initializes or repairs the minimal Wingman memory files without overwriting user-authored content.

## Execution Protocol

For each case:

1. Create a fresh temporary workspace.
2. Write the initial files exactly as listed in the case.
3. Run the task prompt exactly as written.
4. Record files read, files changed, directories created, final answer, and any refused action.
5. Compare the resulting workspace against the pass assertions.

## Runner Support

Ordinary memory setup cases can be prepared by the memory runner:

```bash
node tests/runner/memory/eval-memory.mjs prepare memory-setup MEMSETUP-001
node tests/runner/memory/eval-memory.mjs all memory-setup
```

The runner creates `.eval-runs/memory-setup/<run-id>/<case-id>/` directories with isolated `workspace/`, `prompt.md`, and `evidence-template.json` files.

## Required JSON Output

Return only JSON:

```json
{
  "suite_id": "wingman.memory-setup",
  "skill": "memory-setup",
  "summary": {
    "case_count": 0,
    "passed": 0,
    "failed": 0
  },
  "cases": [
    {
      "id": "MEMSETUP-001",
      "status": "pass",
      "files_read": [],
      "files_changed": [],
      "directories_created": [],
      "commands_run": [],
      "final_answer": "",
      "observed_output": "",
      "expected_behavior": "",
      "failure_reasons": []
    }
  ],
  "execution_notes": ""
}
```

## Pass Criteria

Each case is judged by required behavior:

- Explicit trigger gate is handled correctly.
- Required core files are created or repaired correctly.
- Existing user-authored files are preserved.
- No premature `domains/` or `history/` directory is created.
- Final answer accurately reports created or updated paths.

## Failure Reason Codes

- `setup_without_explicit_request`: Ran setup when the prompt did not directly request memory setup.
- `missing_brief`: Did not create or preserve `.wingman/memory/brief.md`.
- `missing_context`: Did not create or preserve `.wingman/memory/context.md`.
- `overwrote_existing_memory`: Replaced existing user-authored memory content.
- `created_domains_too_early`: Created `.wingman/memory/domains/` during initial setup.
- `created_history_too_early`: Created `.wingman/memory/history/` during initial setup.
- `wrong_language_setting`: Used a memory language inconsistent with clear user preference.
- `completion_report_wrong`: Reported paths inaccurately.
- `observability_missing`: Result omitted files, directories, output, or diagnostics needed for judging.

## Evidence Requirements

A result cannot pass unless it records:

- Whether the prompt was an explicit setup request.
- The final existence and content summary of `brief.md` and `context.md`.
- Whether any existing memory file content changed.
- Whether `domains/` or `history/` was created.

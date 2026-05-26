# memory-token-efficiency Test Method

## Purpose

Evaluate whether Wingman memory guidance reduces context footprint compared with unguided global search while preserving answer quality.

This experiment measures workflow efficiency, not correctness of one individual memory skill.

## Variants

Each case has two variants:

- `A no_wingman_baseline`: The agent must not use Wingman memory skills. It may inspect the repository with normal search and file reads.
- `B with_wingman_memory`: The agent must use `memory-load` and follow Domain Registry routing.

Both variants use the same fixture workspace and task target.

## Runner Support

No runner support yet. Run these cases manually until a dedicated token-efficiency runner exists.

The existing runners do not support this suite:

- `tests/runner/skill/eval-skill.mjs` supports paired skill cases with `## Pair ...` headings.
- `tests/runner/memory/eval-memory.mjs` supports ordinary memory cases with `## MEM...-001` headings.

Future support should live in a dedicated runner, such as `tests/runner/token/`, because this suite needs token measurement and cache visibility handling.

## Execution Protocol

For each case:

1. Create a fresh temporary workspace for A.
2. Write the fixture files exactly as listed.
3. Run the A task prompt.
4. Record files read, commands run, final answer, and token metrics.
5. Create a fresh temporary workspace for B.
6. Write the same fixture files.
7. Run the B task prompt.
8. Record the same metrics.
9. Compare answer quality and context footprint.

Prefer fresh conversations for A and B. If fresh conversations are impossible, state that in `execution_notes`.

Randomize or alternate variant order when running multiple cases. If the runner always runs A before B, state that in `execution_notes`.

## Token Measurement Rules

The tested AI must not invent token usage. Use the best available source:

1. `api_usage`: platform or API response usage object.
2. `runner_meter`: external runner token meter.
3. `estimated_from_files`: estimate from actually read file content.
4. `unavailable`: no token source exists.

When estimating from files:

- Count characters for every file whose content was read or inserted into context.
- Estimate tokens as `ceil(total_chars / 4)`.
- Count only content actually read, not every file present in the workspace.
- Record `estimated_context_chars` and `estimated_context_tokens`.

When real usage is available, include:

- `input_tokens_total`
- `input_tokens_cached`
- `input_tokens_uncached`
- `output_tokens`
- `total_tokens`

If cached token data is not visible, set `cache_visibility` to `unavailable`. Do not mark the case failed only because cache visibility is unavailable.

## Required JSON Output

Return only JSON:

```json
{
  "suite_id": "wingman.memory-token-efficiency",
  "summary": {
    "case_count": 0,
    "passed": 0,
    "failed": 0,
    "average_token_reduction_ratio": 0
  },
  "cases": [
    {
      "id": "MEMTOK-001",
      "status": "pass",
      "baseline": {
        "variant": "no_wingman_baseline",
        "answer_correct": false,
        "files_read": [],
        "irrelevant_files_read": [],
        "token_usage": {
          "source": "estimated_from_files",
          "estimated_context_chars": 0,
          "estimated_context_tokens": 0,
          "input_tokens_total": null,
          "input_tokens_cached": null,
          "input_tokens_uncached": null,
          "output_tokens": null,
          "total_tokens": null,
          "cache_visibility": "unavailable"
        },
        "final_answer": ""
      },
      "wingman": {
        "variant": "with_wingman_memory",
        "answer_correct": false,
        "files_read": [],
        "irrelevant_files_read": [],
        "token_usage": {
          "source": "estimated_from_files",
          "estimated_context_chars": 0,
          "estimated_context_tokens": 0,
          "input_tokens_total": null,
          "input_tokens_cached": null,
          "input_tokens_uncached": null,
          "output_tokens": null,
          "total_tokens": null,
          "cache_visibility": "unavailable"
        },
        "final_answer": ""
      },
      "comparison": {
        "quality_preserved": false,
        "token_reduction_ratio": 0,
        "irrelevant_read_reduction": 0,
        "pass": false,
        "observed_output": "",
        "expected_behavior": "",
        "failure_reasons": []
      }
    }
  ],
  "execution_notes": ""
}
```

## Pass Criteria

A case passes when:

- Wingman variant finds the correct rule or answer.
- Wingman variant does not miss a required current memory constraint.
- Wingman variant has at least `30%` lower `estimated_context_tokens` than baseline, unless real uncached input token metrics show a better authoritative measurement.
- Wingman variant reads fewer irrelevant files.
- Token usage source is declared honestly.

If baseline fails to find the correct answer, still report token metrics, but judge quality preservation against the expected answer rather than baseline quality.

## Failure Reason Codes

- `token_usage_invented`: Agent guessed token usage without source.
- `cache_claim_unsubstantiated`: Agent claimed cache behavior without visible usage data.
- `wingman_quality_regression`: Wingman variant used fewer tokens but missed the correct rule.
- `wingman_no_token_savings`: Wingman variant did not reduce estimated context tokens by the threshold.
- `wingman_read_irrelevant_files`: Wingman variant read broad unrelated docs, domains, or history.
- `baseline_not_isolated`: Baseline run reused memory guidance or prior variant context.
- `wingman_not_isolated`: Wingman run reused baseline findings without re-reading required memory.
- `measurement_missing`: Missing files read, character counts, token estimate, or usage source.
- `history_used_as_current_truth`: Wingman variant followed old history over current truth.

## Evidence Requirements

A result cannot pass unless it records:

- File list and character count basis for each estimate.
- Correct answer or rule for each variant.
- Token source and cache visibility.
- Irrelevant files read by each variant.
- Explanation of any real usage fields that were unavailable.

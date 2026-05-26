from __future__ import annotations

import os
from pathlib import Path

from eval_runs import discover_eval_run_samples

try:
    from inspect_ai import Task, task
    from inspect_ai.dataset import Sample
    from inspect_ai.scorer import includes
except ModuleNotFoundError as error:  # pragma: no cover - exercised only without inspect-ai installed.
    raise ModuleNotFoundError(
        "inspect-ai is required for tests/runner/inspect/wingman_eval.py. "
        "Install it in a separate evaluation environment before running Inspect."
    ) from error


@task
def prepared_wingman_eval() -> Task:
    """Inspect task over prompts prepared under `.eval-runs/`."""
    repo_root = Path(os.environ.get("WINGMAN_EVAL_REPO", ".")).resolve()
    eval_runs_root = Path(os.environ.get("WINGMAN_EVAL_RUNS", repo_root / ".eval-runs")).resolve()
    samples = discover_eval_run_samples(eval_runs_root)

    return Task(
        dataset=[
            Sample(
                input=sample.prompt,
                target="evidence JSON",
                metadata={
                    "skill": sample.skill,
                    "run_id": sample.run_id,
                    "case_id": sample.case_id,
                    "prompt_path": str(sample.prompt_path),
                    "workspace_path": str(sample.workspace_path),
                    "evidence_template_path": str(sample.evidence_template_path),
                },
            )
            for sample in samples
        ],
        scorer=includes(),
    )

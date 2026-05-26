from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class EvalRunSample:
    skill: str
    run_id: str
    case_id: str
    prompt_path: Path
    workspace_path: Path
    evidence_template_path: Path
    prompt: str


def discover_eval_run_samples(eval_runs_root: Path) -> list[EvalRunSample]:
    """Discover prepared `.eval-runs/<skill>/<run-id>/<case-id>/` samples."""
    root = Path(eval_runs_root)
    if not root.exists():
        return []

    samples: list[EvalRunSample] = []
    for prompt_path in sorted(root.glob("*/*/*/prompt.md")):
        case_dir = prompt_path.parent
        evidence_path = case_dir / "evidence-template.json"
        workspace_path = case_dir / "workspace"
        if not evidence_path.exists() or not workspace_path.exists():
            continue

        run_dir = case_dir.parent
        skill_dir = run_dir.parent
        samples.append(
            EvalRunSample(
                skill=skill_dir.name,
                run_id=run_dir.name,
                case_id=case_dir.name,
                prompt_path=prompt_path,
                workspace_path=workspace_path,
                evidence_template_path=evidence_path,
                prompt=prompt_path.read_text(encoding="utf-8"),
            )
        )

    return samples

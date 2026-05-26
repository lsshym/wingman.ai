from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def discover_prepared_cases(eval_runs_root: Path) -> list[dict[str, Any]]:
    root = Path(eval_runs_root)
    if not root.exists():
        return []

    records: list[dict[str, Any]] = []
    for prompt_path in sorted(root.glob("*/*/*/prompt.md")):
        case_dir = prompt_path.parent
        workspace_path = case_dir / "workspace"
        evidence_path = case_dir / "evidence-template.json"
        if not workspace_path.exists() or not evidence_path.exists():
            continue

        run_dir = case_dir.parent
        skill_dir = run_dir.parent
        records.append(
            {
                "name": f"{skill_dir.name}/{run_dir.name}/{case_dir.name}",
                "kind": "wingman.eval.prepared_case",
                "skill": skill_dir.name,
                "run_id": run_dir.name,
                "case_id": case_dir.name,
                "prompt_path": str(prompt_path),
                "workspace_path": str(workspace_path),
                "evidence_template_path": str(evidence_path),
                "prompt": prompt_path.read_text(encoding="utf-8"),
            }
        )

    return records


def write_jsonl(records: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
            handle.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export prepared Wingman eval cases as Phoenix-friendly JSONL.")
    parser.add_argument("--eval-runs", default=".eval-runs", help="Path to .eval-runs directory.")
    parser.add_argument(
        "--out",
        default=".eval-runs/phoenix/prepared-cases.jsonl",
        help="Output JSONL path.",
    )
    args = parser.parse_args()

    records = discover_prepared_cases(Path(args.eval_runs))
    write_jsonl(records, Path(args.out))
    print(json.dumps({"count": len(records), "out": args.out}, indent=2))


if __name__ == "__main__":
    main()

import tempfile
import unittest
from pathlib import Path

from eval_runs import discover_eval_run_samples


class EvalRunsTest(unittest.TestCase):
    def test_discover_eval_run_samples(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            case_dir = tmp_path / ".eval-runs" / "align-contracts" / "run-1" / "ALIGN-001A"
            workspace = case_dir / "workspace"
            workspace.mkdir(parents=True)
            (case_dir / "prompt.md").write_text("# ALIGN-001A\n", encoding="utf-8")
            (case_dir / "evidence-template.json").write_text("{}", encoding="utf-8")

            samples = discover_eval_run_samples(tmp_path / ".eval-runs")

            self.assertEqual(len(samples), 1)
            self.assertEqual(samples[0].skill, "align-contracts")
            self.assertEqual(samples[0].run_id, "run-1")
            self.assertEqual(samples[0].case_id, "ALIGN-001A")
            self.assertEqual(samples[0].workspace_path, workspace)
            self.assertEqual(samples[0].prompt, "# ALIGN-001A\n")


if __name__ == "__main__":
    unittest.main()

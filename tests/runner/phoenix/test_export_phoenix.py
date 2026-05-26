import json
import tempfile
import unittest
from pathlib import Path

from export_phoenix import discover_prepared_cases, write_jsonl


class PhoenixExportTest(unittest.TestCase):
    def test_discover_prepared_cases_and_write_jsonl(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            case_dir = root / ".eval-runs" / "align-contracts" / "run-1" / "ALIGN-001A"
            workspace = case_dir / "workspace"
            workspace.mkdir(parents=True)
            (case_dir / "prompt.md").write_text("# Prompt\n", encoding="utf-8")
            (case_dir / "evidence-template.json").write_text("{}", encoding="utf-8")

            records = discover_prepared_cases(root / ".eval-runs")

            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["kind"], "wingman.eval.prepared_case")
            self.assertEqual(records[0]["skill"], "align-contracts")
            self.assertEqual(records[0]["run_id"], "run-1")
            self.assertEqual(records[0]["case_id"], "ALIGN-001A")
            self.assertEqual(records[0]["prompt"], "# Prompt\n")

            out = root / "phoenix.jsonl"
            write_jsonl(records, out)
            [line] = out.read_text(encoding="utf-8").splitlines()
            self.assertEqual(json.loads(line)["name"], "align-contracts/run-1/ALIGN-001A")


if __name__ == "__main__":
    unittest.main()

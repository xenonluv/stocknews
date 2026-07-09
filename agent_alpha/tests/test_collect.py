import json
import os
import sys
import tempfile
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import collect  # noqa: E402


class CollectForwardMergeTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.forward_dir = os.path.join(self.tmp.name, "forward")
        self.judgments_dir = os.path.join(self.tmp.name, "judgments")
        os.makedirs(self.forward_dir)
        os.makedirs(self.judgments_dir)

        self.orig = {
            "forward_dir": collect.config.FORWARD_DIR,
            "judgments_dir": collect.config.JUDGMENTS_DIR,
            "float_cache": collect.config.FLOAT_CACHE,
            "max_movers": collect.config.MAX_MOVERS,
            "ensure_dirs": collect.config.ensure_dirs,
            "today": collect.config.today_yyyymmdd,
            "movers": collect.movers_mod.movers,
            "regime": collect.regime_mod.regime,
            "build": collect.quant_mod.build,
        }
        collect.config.FORWARD_DIR = self.forward_dir
        collect.config.JUDGMENTS_DIR = self.judgments_dir
        collect.config.FLOAT_CACHE = os.path.join(self.tmp.name, "float_cache.json")
        with open(collect.config.FLOAT_CACHE, "w", encoding="utf-8") as f:
            f.write("{}")
        collect.config.MAX_MOVERS = 30
        collect.config.today_yyyymmdd = lambda: "20260709"
        collect.config.ensure_dirs = self._ensure_dirs
        collect.movers_mod.movers = lambda: [
            {"code": "000001", "name": "Mock", "sector": "Test", "mover_type": "reaccum"}
        ]
        collect.regime_mod.regime = lambda: {}

    def tearDown(self):
        collect.config.FORWARD_DIR = self.orig["forward_dir"]
        collect.config.JUDGMENTS_DIR = self.orig["judgments_dir"]
        collect.config.FLOAT_CACHE = self.orig["float_cache"]
        collect.config.MAX_MOVERS = self.orig["max_movers"]
        collect.config.ensure_dirs = self.orig["ensure_dirs"]
        collect.config.today_yyyymmdd = self.orig["today"]
        collect.movers_mod.movers = self.orig["movers"]
        collect.regime_mod.regime = self.orig["regime"]
        collect.quant_mod.build = self.orig["build"]
        self.tmp.cleanup()

    def _ensure_dirs(self):
        os.makedirs(self.forward_dir, exist_ok=True)
        os.makedirs(self.judgments_dir, exist_ok=True)

    def _write_forward(self, date, rows):
        path = os.path.join(self.forward_dir, f"{date}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"date": date, "rows": rows}, f, ensure_ascii=False, indent=1)
        return path

    def _fresh_row(self, code="000001", date="20260706"):
        return {
            "code": code,
            "name": "Mock",
            "sector": "Test",
            "mover_type": "reaccum",
            "date": date,
            "data_ok": True,
            "labeled": False,
            "close": 100,
            "turnover_2d_pct": 1,
            "spark_1430_count": 0,
            "spark_source": "mock",
            "close_strength": 0.5,
            "frgn_net": None,
            "kiwoom_buy_concentration": None,
            "is_eumbong": False,
        }

    def test_rerun_preserves_existing_labels_and_labeled_rows(self):
        path = self._write_forward(
            "20260706",
            {
                "000001": {
                    "code": "000001",
                    "date": "20260706",
                    "data_ok": True,
                    "labeled": True,
                    "hit": True,
                    "next_return_pct": 9.9,
                    "catalyst": "old labeled judgment",
                },
                "000002": {
                    "code": "000002",
                    "date": "20260706",
                    "data_ok": True,
                    "labeled": True,
                    "hit": False,
                    "next_return_pct": -2.1,
                },
            },
        )
        collect.quant_mod.build = lambda mover, fcache, reg: self._fresh_row()

        collect.run(dry=False)

        with open(path, encoding="utf-8") as f:
            rows = json.load(f)["rows"]
        self.assertTrue(rows["000001"]["labeled"])
        self.assertTrue(rows["000001"]["hit"])
        self.assertEqual(rows["000001"]["next_return_pct"], 9.9)
        self.assertEqual(rows["000001"]["catalyst"], "old labeled judgment")
        self.assertIn("000002", rows)

    def test_judgments_are_loaded_from_signal_date(self):
        with open(os.path.join(self.judgments_dir, "20260706.json"), "w", encoding="utf-8") as f:
            json.dump({"000001": {"catalyst": "signal-date", "prob_up": 0.7}}, f)
        with open(os.path.join(self.judgments_dir, "20260709.json"), "w", encoding="utf-8") as f:
            json.dump({"000001": {"catalyst": "wall-clock-date", "prob_up": 0.1}}, f)
        collect.quant_mod.build = lambda mover, fcache, reg: self._fresh_row()

        collect.run(dry=False)

        with open(os.path.join(self.forward_dir, "20260706.json"), encoding="utf-8") as f:
            rows = json.load(f)["rows"]
        self.assertEqual(rows["000001"]["catalyst"], "signal-date")
        self.assertEqual(rows["000001"]["prob_up"], 0.7)


if __name__ == "__main__":
    unittest.main()

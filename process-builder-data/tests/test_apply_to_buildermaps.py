#!/usr/bin/env python3
"""Tests for apply_to_buildermaps behavior."""

import csv
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apply_to_buildermaps import apply_csv


class TestApplyCsvLogoDownload(unittest.TestCase):
    """Test logo download behavior in apply_csv."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.repo_root = Path(self.temp_dir) / "repo"
        (self.repo_root / "public" / "data" / "projects").mkdir(parents=True)
        (self.repo_root / "public" / "data" / "maps").mkdir(parents=True)

        self.csv_path = Path(self.temp_dir) / "input.csv"
        with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["name", "sector", "type", "website", "x", "description"],
            )
            writer.writeheader()
            writer.writerow(
                {
                    "name": "Demo Project",
                    "sector": "Demo Sector",
                    "type": "Demo Type",
                    "website": "https://example.com",
                    "x": "https://x.com/demo",
                    "description": "demo",
                }
            )

    def tearDown(self):
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_download_runs_even_if_production_logo_exists(self):
        """Download should still execute to persist logo in repo."""

        with patch("apply_to_buildermaps.production_logo_exists", return_value=True) as prod_mock:
            with patch("apply_to_buildermaps.download_logo", return_value=True) as dl_mock:
                apply_csv(
                    self.csv_path,
                    self.repo_root,
                    download_logos=True,
                    logo_overwrite=False,
                    rate_limit_s=0,
                )

        prod_mock.assert_not_called()
        dl_mock.assert_called_once()

        project_path = self.repo_root / "public" / "data" / "projects" / "demo-project.json"
        with open(project_path, "r", encoding="utf-8") as f:
            project = json.load(f)

        self.assertEqual(
            project["links"]["logo"],
            "/imgs/Demo Sector/DemoType/demo-project.png",
        )


if __name__ == "__main__":
    unittest.main()

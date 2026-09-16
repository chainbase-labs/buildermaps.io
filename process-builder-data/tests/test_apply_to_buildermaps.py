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
                fieldnames=[
                    "name",
                    "sector",
                    "type",
                    "website",
                    "x",
                    "logo url",
                    "description",
                ],
            )
            writer.writeheader()
            writer.writerow(
                {
                    "name": "Demo Project",
                    "sector": "Demo Sector",
                    "type": "Demo Type",
                    "website": "https://example.com",
                    "x": "https://x.com/demo",
                    "logo url": "https://cdn.example.com/demo-logo.jpg",
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
            "/imgs/Demo Sector/DemoType/demo-project.jpg",
        )

    def test_reuses_existing_project_id_from_homepage_match(self):
        """Rows should update an existing project file when homepage matches."""

        existing_path = (
            self.repo_root / "public" / "data" / "projects" / "safe-wallet.json"
        )
        with open(existing_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "id": "safe-wallet",
                    "name": "Safe Wallet",
                    "description": "existing",
                    "links": {
                        "homepage": "https://safe.global/",
                        "twitter": "https://x.com/safe",
                        "logo": "/imgs/old/safe-wallet.png",
                    },
                },
                f,
                indent=2,
            )
            f.write("\n")

        with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "name",
                    "sector",
                    "type",
                    "website",
                    "x",
                    "logo url",
                    "description",
                ],
            )
            writer.writeheader()
            writer.writerow(
                {
                    "name": "Safe",
                    "sector": "Smart Wallets",
                    "type": "Smart Account Infra",
                    "website": "https://safe.global/",
                    "x": "https://x.com/safe",
                    "logo url": "https://cdn.example.com/safe.png",
                    "description": "updated",
                }
            )

        with patch("apply_to_buildermaps.download_logo", return_value=True):
            apply_csv(
                self.csv_path,
                self.repo_root,
                download_logos=True,
                logo_overwrite=False,
                rate_limit_s=0,
            )

        self.assertTrue(existing_path.exists())
        self.assertFalse(
            (self.repo_root / "public" / "data" / "projects" / "safe.json").exists()
        )

        with open(existing_path, "r", encoding="utf-8") as f:
            project = json.load(f)

        self.assertEqual(project["id"], "safe-wallet")
        self.assertEqual(project["name"], "Safe")
        self.assertEqual(
            project["links"]["logo"],
            "/imgs/Smart Wallets/SmartAccountInfra/safe-wallet.png",
        )

    def test_does_not_reuse_parent_brand_for_distinct_subproduct(self):
        """Shared social links alone should not merge a branded subproduct."""

        existing_path = self.repo_root / "public" / "data" / "projects" / "near.json"
        with open(existing_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "id": "near",
                    "name": "NEAR",
                    "description": "existing",
                    "links": {
                        "homepage": "https://near.org/",
                        "twitter": "https://x.com/NEARProtocol",
                        "logo": "/imgs/old/near.png",
                    },
                },
                f,
                indent=2,
            )
            f.write("\n")

        with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "name",
                    "sector",
                    "type",
                    "website",
                    "x",
                    "logo url",
                    "description",
                ],
            )
            writer.writeheader()
            writer.writerow(
                {
                    "name": "NEAR DA",
                    "sector": "Modular Blockchain",
                    "type": "Data Availability",
                    "website": "https://near.org/data-availability",
                    "x": "https://x.com/NEARProtocol",
                    "logo url": "https://cdn.example.com/near-da.jpg",
                    "description": "updated",
                }
            )

        with patch("apply_to_buildermaps.download_logo", return_value=True):
            apply_csv(
                self.csv_path,
                self.repo_root,
                download_logos=True,
                logo_overwrite=False,
                rate_limit_s=0,
            )

        self.assertTrue(existing_path.exists())
        self.assertTrue(
            (self.repo_root / "public" / "data" / "projects" / "near-da.json").exists()
        )

        with open(existing_path, "r", encoding="utf-8") as f:
            existing_project = json.load(f)

        self.assertEqual(existing_project["name"], "NEAR")


if __name__ == "__main__":
    unittest.main()

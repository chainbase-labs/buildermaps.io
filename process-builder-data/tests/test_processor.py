#!/usr/bin/env python3
"""Tests for process-builder-data processor."""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from processor import slugify, extract_twitter_handle, process_csv


class TestSlugify(unittest.TestCase):
    """Test slugify function."""

    def test_basic_slug(self):
        """Test basic slug conversion."""
        self.assertEqual(slugify("Hello World"), "hello-world")

    def test_multiple_spaces(self):
        """Test multiple spaces."""
        self.assertEqual(slugify("Hello   World"), "hello-world")

    def test_dots(self):
        """Test dots replaced with hyphens."""
        self.assertEqual(slugify("Hello.World"), "hello-world")

    def test_special_chars(self):
        """Test special characters removed."""
        self.assertEqual(slugify("Hello@#$%World"), "helloworld")

    def test_leading_trailing_hyphens(self):
        """Test leading/trailing hyphens removed."""
        self.assertEqual(slugify("-Hello World-"), "hello-world")

    def test_real_project_names(self):
        """Test real project names."""
        self.assertEqual(slugify("Ethereum"), "ethereum")
        self.assertEqual(slugify("Uniswap V3"), "uniswap-v3")
        self.assertEqual(slugify("Aave Protocol"), "aave-protocol")


class TestTwitterHandle(unittest.TestCase):
    """Test Twitter handle extraction."""

    def test_x_com(self):
        """Test x.com URLs."""
        self.assertEqual(
            extract_twitter_handle("https://x.com/ethereum"),
            "ethereum"
        )

    def test_x_com_with_params(self):
        """Test x.com URLs with query params."""
        self.assertEqual(
            extract_twitter_handle("https://x.com/ethereum?ref=src"),
            "ethereum"
        )

    def test_twitter_com(self):
        """Test twitter.com URLs."""
        self.assertEqual(
            extract_twitter_handle("https://twitter.com/ethereum"),
            "ethereum"
        )

    def test_empty_url(self):
        """Test empty URL."""
        self.assertEqual(extract_twitter_handle(""), "")

    def test_invalid_url(self):
        """Test invalid URL."""
        self.assertEqual(extract_twitter_handle("not-a-url"), "")


class TestProcessCSV(unittest.TestCase):
    """Test CSV processing."""

    def setUp(self):
        """Create temporary directory and test CSV."""
        self.temp_dir = tempfile.mkdtemp()
        self.csv_path = Path(self.temp_dir) / "test.csv"
        self.output_dir = Path(self.temp_dir) / "output"

        # Create test CSV
        csv_content = """name,sector,type,website,x,github,location,description
TestProject,TestSector,TestType,https://example.com,https://x.com/test,https://github.com/test,Global,Test description
AnotherProject,TestSector,TestType,https://example.org,,,,"""

        with open(self.csv_path, 'w') as f:
            f.write(csv_content)

    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_process_csv_success(self):
        """Test successful CSV processing."""
        success = process_csv(
            str(self.csv_path),
            str(self.output_dir),
            quiet=True,
            skip_logos=True,
            skip_descriptions=True
        )
        self.assertTrue(success)

    def test_output_structure(self):
        """Test output directory structure."""
        process_csv(
            str(self.csv_path),
            str(self.output_dir),
            quiet=True,
            skip_logos=True,
            skip_descriptions=True
        )

        # Check directories exist
        self.assertTrue((self.output_dir / "data" / "projects").exists())
        self.assertTrue((self.output_dir / "data" / "maps").exists())

    def test_project_json_created(self):
        """Test project JSON files are created."""
        process_csv(
            str(self.csv_path),
            str(self.output_dir),
            quiet=True,
            skip_logos=True,
            skip_descriptions=True
        )

        # Check project files exist
        self.assertTrue((self.output_dir / "data" / "projects" / "testproject.json").exists())
        self.assertTrue((self.output_dir / "data" / "projects" / "anotherproject.json").exists())

    def test_project_json_content(self):
        """Test project JSON content."""
        process_csv(
            str(self.csv_path),
            str(self.output_dir),
            quiet=True,
            skip_logos=True,
            skip_descriptions=True
        )

        # Read and validate project JSON
        with open(self.output_dir / "data" / "projects" / "testproject.json") as f:
            project = json.load(f)

        self.assertEqual(project["id"], "testproject")
        self.assertEqual(project["name"], "TestProject")
        self.assertEqual(project["location"], "Global")
        self.assertIn("links", project)
        self.assertIn("logo", project["links"])

    def test_map_json_created(self):
        """Test map JSON files are created."""
        process_csv(
            str(self.csv_path),
            str(self.output_dir),
            quiet=True,
            skip_logos=True,
            skip_descriptions=True
        )

        # Check map file exists
        self.assertTrue((self.output_dir / "data" / "maps" / "testsector.json").exists())

    def test_map_json_content(self):
        """Test map JSON content."""
        process_csv(
            str(self.csv_path),
            str(self.output_dir),
            quiet=True,
            skip_logos=True,
            skip_descriptions=True
        )

        # Read and validate map JSON
        with open(self.output_dir / "data" / "maps" / "testsector.json") as f:
            map_data = json.load(f)

        self.assertEqual(map_data["sector"], "TestSector")
        self.assertIn("types", map_data)
        self.assertEqual(len(map_data["types"]), 1)
        self.assertEqual(map_data["types"][0]["name"], "TestType")
        self.assertIn("testproject", map_data["types"][0]["projects"])
        self.assertIn("anotherproject", map_data["types"][0]["projects"])

    def test_nonexistent_csv(self):
        """Test handling of non-existent CSV file."""
        success = process_csv(
            "/nonexistent/file.csv",
            str(self.output_dir),
            quiet=True
        )
        self.assertFalse(success)


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""
Process Builder Data - CSV to JSON Processor
Transforms CSV project data into structured JSON files with logos and metadata.

Usage:
    python processor.py <csv_file> <output_dir> [options]

Example:
    python processor.py projects.csv ./output --verbose
"""

import argparse
import csv
import json
import os
import re
import requests
import sys
import time
from pathlib import Path
from bs4 import BeautifulSoup
from tqdm import tqdm

__version__ = "1.0.0"


def slugify(text: str) -> str:
    """Convert text to slug format (kebab-case)."""
    text = text.lower().strip()
    text = re.sub(r'[\s.]+', '-', text)
    text = re.sub(r'[^\w\-]', '', text)
    text = re.sub(r'\-+', '-', text)
    return text.strip('-')


def extract_twitter_handle(twitter_url: str) -> str:
    """Extract username from Twitter/X URL."""
    if not twitter_url:
        return ""
    match = re.search(r'x\.com/([^/?]+)', twitter_url)
    if match:
        return match.group(1)
    # Try twitter.com as fallback
    match = re.search(r'twitter\.com/([^/?]+)', twitter_url)
    if match:
        return match.group(1)
    return ""


def download_logo(
    twitter_url: str, save_path: str, verbose: bool = False
) -> bool:
    """Download Twitter/X avatar using unavatar API."""
    try:
        twitter_handle = extract_twitter_handle(twitter_url)
        if not twitter_handle:
            return False

        api_url = f"https://unavatar.io/twitter/{twitter_handle}"
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        response = requests.get(api_url, timeout=10)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
        return False
    except Exception as e:
        if verbose:
            print(f"  Logo download error: {e}")
        return False


def fetch_website_description(url: str, verbose: bool = False) -> str:
    """Fetch description from website meta tags."""
    try:
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                ' AppleWebKit/537.36'
            )
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Try multiple meta tags for description
        for selector in [
            {'name': 'description'},
            {'property': 'og:description'},
            {'name': 'twitter:description'}
        ]:
            meta_tag = soup.find('meta', selector)
            if meta_tag and meta_tag.get('content'):
                desc = meta_tag['content'].strip()
                if len(desc) > 20:
                    return desc

        # Fallback to first paragraph
        first_p = soup.find('p')
        if first_p:
            desc = first_p.get_text().strip()
            if 20 < len(desc) < 500:
                return desc

        return ""
    except Exception as e:
        if verbose:
            print(f"  Description fetch error: {e}")
        return ""


def fix_path_spaces(base_dir: Path, verbose: bool = False):
    """Fix spaces in directory paths."""
    imgs_dir = base_dir / "imgs"
    if not imgs_dir.exists():
        return

    for sector_dir in imgs_dir.iterdir():
        if not sector_dir.is_dir():
            continue

        for type_dir in sector_dir.iterdir():
            if not type_dir.is_dir():
                continue

            if ' ' in type_dir.name:
                new_name = type_dir.name.replace(' ', '')
                new_path = type_dir.parent / new_name
                type_dir.rename(new_path)
                if verbose:
                    print(f"  Renamed: {type_dir.name} -> {new_name}")


def update_json_paths(projects_dir: Path, verbose: bool = False):
    """Update logo paths in JSON files."""
    for json_file in projects_dir.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            project = json.load(f)

        logo_path = project['links'].get('logo', '')
        if ' ' in logo_path:
            new_path = logo_path.replace(' ', '')
            project['links']['logo'] = new_path

            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(project, f, indent=2, ensure_ascii=False)


def process_csv(
    csv_path: str,
    output_dir: str,
    verbose: bool = False,
    quiet: bool = False,
    skip_logos: bool = False,
    skip_descriptions: bool = False,
    rate_limit: float = 0.5
) -> bool:
    """
    Process CSV file and generate JSON files.

    Args:
        csv_path: Path to input CSV file
        output_dir: Path to output directory
        verbose: Enable verbose output
        quiet: Suppress all output except errors
        skip_logos: Skip logo downloading
        skip_descriptions: Skip fetching website descriptions when missing
        rate_limit: Delay between requests in seconds

    Returns:
        True if successful, False otherwise
    """
    csv_path = Path(csv_path).resolve()
    output_dir = Path(output_dir).resolve()

    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}", file=sys.stderr)
        return False

    # Create directories
    projects_dir = output_dir / "data" / "projects"
    maps_dir = output_dir / "data" / "maps"
    projects_dir.mkdir(parents=True, exist_ok=True)
    maps_dir.mkdir(parents=True, exist_ok=True)

    if not quiet:
        print("=" * 60)
        print("Process Builder Data - CSV Processor")
        print("=" * 60)
        print(f"CSV file: {csv_path}")
        print(f"Output directory: {output_dir}\n")

    # Read CSV
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except Exception as e:
        print(f"Error reading CSV: {e}", file=sys.stderr)
        return False

    if not rows:
        print("Error: CSV file is empty", file=sys.stderr)
        return False

    # Get column name mapping (case-insensitive)
    headers = {k.lower(): k for k in rows[0].keys()}

    def get_field(row, field_name):
        """Get field value with case-insensitive matching."""
        key = headers.get(field_name.lower())
        return row.get(key, '') if key else ''

    # Group by sector
    sector_data = {}

    # Setup progress bar
    iterator = rows if quiet else tqdm(
        rows, desc="Processing projects", unit="proj"
    )

    for idx, row in enumerate(iterator, 1):
        name = get_field(row, 'name').strip()
        sector = get_field(row, 'sector').strip()
        project_type = get_field(row, 'type').strip()
        website = get_field(row, 'website').strip()
        twitter = get_field(row, 'x').strip() or get_field(
            row, 'twitter'
        ).strip()

        if not quiet and verbose:
            print(f"\n[{idx}/{len(rows)}] {name}")

        # Initialize sector data
        if sector not in sector_data:
            sector_data[sector] = {}

        # Generate project ID
        project_id = slugify(name)

        # Create type directory
        type_dir_name = project_type.replace(' ', '')
        imgs_type_dir = output_dir / "imgs" / sector / type_dir_name
        imgs_type_dir.mkdir(parents=True, exist_ok=True)

        # Logo path
        logo_filename = f"{project_id}.png"
        logo_rel_path = f"/imgs/{sector}/{type_dir_name}/{logo_filename}"
        logo_abs_path = imgs_type_dir / logo_filename

        # Download logo
        if not skip_logos and twitter:
            if download_logo(twitter, str(logo_abs_path), verbose):
                if not quiet and verbose:
                    print("  Logo downloaded")
            else:
                if not quiet and verbose:
                    print("  Logo download failed")
            time.sleep(rate_limit)
        elif not skip_logos:
            if not quiet and verbose:
                print("  No Twitter link, skipping logo")

        # Get description
        description = get_field(row, 'description').strip()
        if not description and website:
            if skip_descriptions:
                description = f"{name} - crypto project"
                if not quiet and verbose:
                    print("  Using placeholder description (--skip-descriptions)")
            else:
            description = fetch_website_description(website, verbose)
            if description and not quiet and verbose:
                print("  Description fetched from website")
            elif not description:
                description = f"{name} - crypto project"
                if not quiet and verbose:
                    print("  Using placeholder description")
            time.sleep(rate_limit)

        # Build project JSON
        project_json = {
            "id": project_id,
            "name": name,
            "description": description,
            "location": get_field(row, 'location').strip(),
            "links": {
                "logo": logo_rel_path,
                "homepage": website,
                "twitter": twitter,
                "github": get_field(row, 'github').strip()
            }
        }

        # Save project JSON
        project_file = projects_dir / f"{project_id}.json"
        with open(project_file, 'w', encoding='utf-8') as f:
            json.dump(project_json, f, indent=2, ensure_ascii=False)

        # Record in sector_data
        if project_type not in sector_data[sector]:
            sector_data[sector][project_type] = []
        sector_data[sector][project_type].append(project_id)

    # Generate maps files
    if not quiet:
        print("\n" + "=" * 60)
        print("Generating Maps")
        print("=" * 60)

    for sector, types_map in sector_data.items():
        maps_data = {
            "sector": sector,
            "types": []
        }

        for type_name, projects in sorted(types_map.items()):
            type_id = slugify(type_name)
            maps_data["types"].append({
                "id": type_id,
                "name": type_name,
                "projects": sorted(projects)
            })

        maps_file = maps_dir / f"{sector.lower()}.json"
        with open(maps_file, 'w', encoding='utf-8') as f:
            json.dump(maps_data, f, indent=2, ensure_ascii=False)

        if not quiet:
            print(f"  {sector}: {maps_file.name}")

    # Fix path spaces
    if not quiet:
        print("\n" + "=" * 60)
        print("Finalizing")
        print("=" * 60)
    fix_path_spaces(output_dir, verbose)
    update_json_paths(projects_dir, verbose)

    if not quiet:
        print(f"\n{'=' * 60}")
        print("Processing complete!")
        print("=" * 60)
        print(f"Projects: {len(rows)}")
        print(f"Sectors: {len(sector_data)}")
        print(f"Output: {output_dir}")

    return True


def main():
    parser = argparse.ArgumentParser(
        description=(
                "Process Builder Data - Transform CSV"
                " into structured JSON"
            ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s projects.csv ./output
  %(prog)s data.csv ./output --verbose
  %(prog)s input.csv ./output --skip-logos --quiet

CSV Format:
  Required columns: name, sector, type, website
  Optional columns: x (twitter), github, description, location
        """
    )

    parser.add_argument("csv_file", help="Path to input CSV file")
    parser.add_argument("output_dir", help="Path to output directory")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Enable verbose output")
    parser.add_argument("-q", "--quiet", action="store_true",
                        help="Suppress output except errors")
    parser.add_argument("--skip-logos", action="store_true",
                        help="Skip logo downloading")
    parser.add_argument(
        "--skip-descriptions",
        action="store_true",
        help="Skip fetching website descriptions when missing (use placeholder instead)"
    )
    parser.add_argument(
        "--rate-limit", type=float, default=0.5,
        help="Delay between requests in seconds (default: 0.5)"
    )
    parser.add_argument("--version", action="version",
                        version=f"%(prog)s {__version__}")

    args = parser.parse_args()

    success = process_csv(
        csv_path=args.csv_file,
        output_dir=args.output_dir,
        verbose=args.verbose,
        quiet=args.quiet,
        skip_logos=args.skip_logos,
        skip_descriptions=args.skip_descriptions,
        rate_limit=args.rate_limit
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Apply a CSV update to this repo's split data structure WITHOUT deleting anything.

What it does:
- Create/update project JSON files in: public/data/projects/{projectId}.json
- Create/update map JSON files in:     public/data/maps/{sectorSlug}.json
- Only adds/updates entries referenced by the CSV
- Never removes existing projects or map entries

CSV columns (case-insensitive):
Required: name, sector, type
Optional: x/twitter, github, description, logo
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote, urlparse

GENERIC_NAME_TOKENS = {
    "wallet",
    "wallets",
    "platform",
    "protocol",
    "app",
    "apps",
    "labs",
    "lab",
    "network",
    "networks",
    "foundation",
    "finance",
    "exchange",
    "dao",
    "chain",
}


def slugify_repo(text: str) -> str:
    """Match repo conventions (same as scripts/process-issue.js)."""
    text = (text or "").lower()
    text = text.replace("&", "and")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def extract_twitter_handle(twitter_url: str) -> str:
    """Extract username from Twitter/X URL."""
    if not twitter_url:
        return ""
    match = re.search(r"x\.com/([^/?]+)", twitter_url)
    if match:
        return match.group(1)
    match = re.search(r"twitter\.com/([^/?]+)", twitter_url)
    if match:
        return match.group(1)
    return ""


def normalize_url(url: str) -> str:
    """Normalize URLs for loose equality checks."""
    value = (url or "").strip()
    if not value:
        return ""

    parsed = urlparse(value if "://" in value else f"https://{value}")
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    path = re.sub(r"/+$", "", parsed.path or "")
    return f"{netloc}{path}"


def guess_logo_extension(logo_url: str) -> str:
    """Best-effort file extension detection for downloaded logos."""
    suffix = Path(urlparse((logo_url or "").strip()).path).suffix.lower()
    return suffix if suffix in {".png", ".jpg", ".jpeg", ".webp", ".svg"} else ".png"


def names_are_compatible(existing_name: str, incoming_name: str) -> bool:
    """Return True when two names likely refer to the same top-level project."""
    existing_slug = slugify_repo(existing_name)
    incoming_slug = slugify_repo(incoming_name)
    if not existing_slug or not incoming_slug:
        return False
    if existing_slug == incoming_slug:
        return True

    existing_tokens = [token for token in existing_slug.split("-") if token]
    incoming_tokens = [token for token in incoming_slug.split("-") if token]
    shorter, longer = sorted((existing_tokens, incoming_tokens), key=len)
    if longer[: len(shorter)] != shorter:
        return False

    extra_tokens = set(longer[len(shorter) :])
    return bool(extra_tokens) and extra_tokens.issubset(GENERIC_NAME_TOKENS)


def index_project(
    project_indexes: dict[str, dict[str, set[str]]], project: dict, project_id: str
) -> None:
    """Add a project to lookup indexes."""
    project_name = (project.get("name") or "").strip().lower()
    if project_name:
        project_indexes["name"][project_name].add(project_id)

    links = project.get("links") if isinstance(project.get("links"), dict) else {}

    homepage = normalize_url(links.get("homepage", ""))
    if homepage:
        project_indexes["homepage"][homepage].add(project_id)

    twitter_handle = extract_twitter_handle(links.get("twitter", "")).lower()
    if twitter_handle:
        project_indexes["twitter"][twitter_handle].add(project_id)

    github = normalize_url(links.get("github", ""))
    if github:
        project_indexes["github"][github].add(project_id)

    project_indexes["project_names"][project_id] = project_name


def build_project_indexes(projects_dir: Path) -> dict[str, dict[str, set[str]]]:
    """Build lookup indexes for existing project files."""
    project_indexes: dict[str, dict[str, set[str]]] = {
        "name": defaultdict(set),
        "homepage": defaultdict(set),
        "twitter": defaultdict(set),
        "github": defaultdict(set),
        "project_names": {},
    }

    for project_path in sorted(projects_dir.glob("*.json")):
        project = load_json(project_path)
        project_id = str(project.get("id") or project_path.stem)
        index_project(project_indexes, project, project_id)

    return project_indexes


def resolve_project_id(
    name: str,
    website: str,
    twitter: str,
    github: str,
    projects_dir: Path,
    project_indexes: dict[str, dict[str, set[str]]],
) -> str:
    """Reuse an existing project ID when the CSV row clearly matches one."""
    slugified_name = slugify_repo(name)
    if (projects_dir / f"{slugified_name}.json").exists():
        return slugified_name

    def find_compatible_match(candidate_ids: set[str]) -> str:
        compatible_ids = {
            candidate_id
            for candidate_id in candidate_ids
            if names_are_compatible(
                str(project_indexes["project_names"].get(candidate_id, "")), name
            )
        }
        return next(iter(compatible_ids)) if len(compatible_ids) == 1 else ""

    homepage_matches = project_indexes["homepage"].get(normalize_url(website), set())
    homepage_match = find_compatible_match(homepage_matches)
    if homepage_match:
        return homepage_match

    twitter_handle = extract_twitter_handle(twitter).lower()
    twitter_matches = project_indexes["twitter"].get(twitter_handle, set())
    twitter_match = find_compatible_match(twitter_matches)
    if twitter_match:
        return twitter_match

    github_matches = project_indexes["github"].get(normalize_url(github), set())
    github_match = find_compatible_match(github_matches)
    if github_match:
        return github_match

    name_matches = project_indexes["name"].get(name.strip().lower(), set())
    if len(name_matches) == 1:
        return next(iter(name_matches))

    return slugified_name


def download_logo(logo_url: str, twitter_url: str, save_path: Path, timeout_s: int = 10) -> bool:
    """
    Download a project logo.

    Prefer the explicit logo URL from CSV; fall back to a Twitter/X avatar via
    unavatar when only a social handle is available.
    """
    try:
        import requests  # type: ignore
    except Exception as e:
        raise RuntimeError(
            "Python dependency 'requests' is required for --download-logos. "
            "Install via process-builder-data/requirements.txt"
        ) from e

    save_path.parent.mkdir(parents=True, exist_ok=True)

    source_url = (logo_url or "").strip()
    if not source_url:
        twitter_handle = extract_twitter_handle(twitter_url)
        if not twitter_handle:
            return False
        source_url = f"https://unavatar.io/twitter/{twitter_handle}"

    resp = requests.get(source_url, timeout=timeout_s)
    if resp.status_code != 200 or not resp.content:
        return False

    save_path.write_bytes(resp.content)
    return True


def production_logo_exists(logo_rel_path: str, timeout_s: int = 6) -> bool:
    """
    Check whether the logo already exists on the net-static-dev CDN.

    The app resolves `/imgs/...` to:
      https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/<path>

    NOTE: The app also encodes '+' as '%2B' when forming the final URL, so we
    check the encoded form first.
    """
    try:
        import requests  # type: ignore
    except Exception:
        # If requests isn't available, don't block processing; just attempt download later.
        return False

    if not logo_rel_path.startswith("/imgs/"):
        return False

    filename = logo_rel_path.replace("/imgs/", "", 1)
    # Encode path segments but keep slashes
    encoded_filename = quote(filename, safe="/")
    encoded_filename = encoded_filename.replace("+", "%2B")

    base = "https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/"
    url = f"{base}{encoded_filename}"

    try:
        r = requests.head(url, timeout=timeout_s, allow_redirects=True)
        if r.status_code == 200:
            return True
        # Fallback: some servers treat '+' literally in path; try unencoded '+'
        if "+" in filename:
            url2 = f"{base}{filename}"
            r2 = requests.head(url2, timeout=timeout_s, allow_redirects=True)
            return r2.status_code == 200
        return False
    except Exception:
        return False


def apply_csv(
    csv_file: Path,
    repo_root: Path,
    *,
    download_logos: bool = False,
    logo_overwrite: bool = False,
    rate_limit_s: float = 0.0,
) -> None:
    projects_dir = repo_root / "public" / "data" / "projects"
    maps_dir = repo_root / "public" / "data" / "maps"
    imgs_dir = repo_root / "public" / "imgs"
    project_indexes = build_project_indexes(projects_dir)

    if not csv_file.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_file}")

    with csv_file.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        raise ValueError("CSV has no rows")

    # Case-insensitive header mapping
    headers = {k.lower(): k for k in rows[0].keys()}

    def has_col(field: str) -> bool:
        return field.lower() in headers

    def get(row: dict, field: str) -> str:
        key = headers.get(field.lower())
        return (row.get(key, "") if key else "") or ""

    def get_first(row: dict, *fields: str) -> str:
        for field in fields:
            value = get(row, field).strip()
            if value:
                return value
        return ""

    updated_projects = 0
    updated_maps = 0
    downloaded_logos = 0

    for row in rows:
        name = get(row, "name").strip()
        sector = get(row, "sector").strip()
        type_name = get(row, "type").strip()
        website = get(row, "website").strip()

        # Website is optional (some rows may not have a homepage yet), but sector/type are required
        if not name or not sector or not type_name:
            raise ValueError(
                f"Missing required fields (name/sector/type) in row: {row}"
            )

        twitter = (get(row, "x").strip() or get(row, "twitter").strip())
        github = get(row, "github").strip()
        description = get(row, "description").strip()
        logo = get_first(row, "logo", "logo url", "logo_url")

        project_id = resolve_project_id(
            name, website, twitter, github, projects_dir, project_indexes
        )
        if not project_id:
            raise ValueError(f"Could not compute project id from name: {name}")

        # ---- projects ----
        project_path = projects_dir / f"{project_id}.json"
        if project_path.exists():
            project = load_json(project_path)
        else:
            project = {"id": project_id}

        project["id"] = project_id
        project["name"] = name

        if description:
            project["description"] = description
        else:
            # Keep existing description if present; otherwise add a safe placeholder
            project.setdefault("description", f"{name} - crypto project")

        # Merge links (update only fields present in CSV; preserve other link fields)
        links = project.get("links") if isinstance(project.get("links"), dict) else {}

        if website:
            links["homepage"] = website
        # Twitter override semantics:
        # - If CSV provides `x` or `twitter` column: override existing value
        # - If provided but empty: remove links.twitter
        if has_col("x") or has_col("twitter"):
            if twitter:
                links["twitter"] = twitter
            else:
                links.pop("twitter", None)
        if github:
            links["github"] = github
        # Fill `links.logo` for every row:
        # - If CSV explicitly provides logo URL/path, use it and do NOT auto-download.
        # - Otherwise set a deterministic local path based on sector/type/project id.
        type_dir_name = type_name.replace(" ", "")
        logo_extension = guess_logo_extension(logo) if download_logos else ".png"
        default_logo_rel_path = (
            f"/imgs/{sector}/{type_dir_name}/{project_id}{logo_extension}"
        )
        if logo and not download_logos:
            links["logo"] = logo
        else:
            links["logo"] = default_logo_rel_path

        # Optional logo download
        if download_logos:
            logo_rel_path = default_logo_rel_path
            logo_abs_path = imgs_dir / sector / type_dir_name / (
                f"{project_id}{logo_extension}"
            )

            has_logo_field = bool(links.get("logo"))
            should_try_download = (
                logo_overwrite
                or not has_logo_field
                or (has_logo_field and not logo_abs_path.exists())
            )

            # Always attempt download when requested to ensure logo persistence
            # in this repository, regardless of remote CDN availability.
            if should_try_download:
                ok = download_logo(logo, twitter, logo_abs_path)
                if ok:
                    downloaded_logos += 1
                # If download fails, keep existing logo (if any)
                if rate_limit_s > 0:
                    time.sleep(rate_limit_s)

        if links:
            project["links"] = links

        write_json(project_path, project)
        updated_projects += 1
        index_project(project_indexes, project, project_id)

        # ---- maps ----
        sector_slug = slugify_repo(sector)
        if not sector_slug:
            raise ValueError(f"Could not compute sector slug from sector: {sector}")

        map_path = maps_dir / f"{sector_slug}.json"
        if map_path.exists():
            map_data = load_json(map_path)
        else:
            map_data = {"sector": sector, "types": []}

        # Ensure canonical sector display name is preserved for existing maps
        map_data.setdefault("sector", sector)
        if not isinstance(map_data.get("types"), list):
            map_data["types"] = []

        type_id = slugify_repo(type_name)
        type_entry = None
        for t in map_data["types"]:
            if isinstance(t, dict) and t.get("id") == type_id:
                type_entry = t
                break

        if type_entry is None:
            type_entry = {"id": type_id, "name": type_name, "projects": []}
            map_data["types"].append(type_entry)

        if not isinstance(type_entry.get("projects"), list):
            type_entry["projects"] = []

        if project_id not in type_entry["projects"]:
            type_entry["projects"].append(project_id)
            type_entry["projects"].sort()

        write_json(map_path, map_data)
        updated_maps += 1

    print(f"Applied CSV: {csv_file}")
    print(f"Updated/created project files: {updated_projects}")
    print(f"Updated/created map files: {updated_maps}")
    if download_logos:
        print(f"Downloaded logos: {downloaded_logos}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply CSV changes into buildermaps.io public/data (merge, no deletions)."
    )
    parser.add_argument("csv_file", help="Path to the input CSV file")
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repo root path (default: current working directory)",
    )
    parser.add_argument(
        "--download-logos",
        action="store_true",
        help="Download logos via unavatar using the CSV's x/twitter field",
    )
    parser.add_argument(
        "--logo-overwrite",
        action="store_true",
        help="Overwrite existing logo file/links.logo when downloading",
    )
    parser.add_argument(
        "--rate-limit",
        dest="rate_limit_s",
        type=float,
        default=0.0,
        help="Delay between logo downloads in seconds (default: 0)",
    )
    args = parser.parse_args()

    try:
        apply_csv(
            Path(args.csv_file).resolve(),
            Path(args.repo_root).resolve(),
            download_logos=bool(args.download_logos),
            logo_overwrite=bool(args.logo_overwrite),
            rate_limit_s=float(args.rate_limit_s),
        )
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

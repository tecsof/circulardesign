#!/usr/bin/env python3
"""Search for and download hero images for case studies."""

import json
import os
import time
import urllib.request
import urllib.error
from pathlib import Path
from urllib.parse import urlparse

from duckduckgo_search import DDGS

SITE = Path(__file__).resolve().parent.parent
CASE_STUDIES_DIR = SITE / "src/content/case-studies"
IMAGE_DIR = SITE / "public/images/case-studies"
PUBLIC_PATH = "/images/case-studies"

# Titles to skip (bad data)
SKIP_SLUGS = {"nan"}


def clean_title(title: str) -> str:
    """Clean up title for search query."""
    # Remove all-caps, normalize
    if title.isupper():
        title = title.title()
    return title


def search_image(query: str, max_retries: int = 2) -> str | None:
    """Search DuckDuckGo for an image and return the URL."""
    for attempt in range(max_retries):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.images(
                    query,
                    max_results=5,
                    size="Large",
                    type_image="photo",
                    license_image=None,
                ))
                if results:
                    # Prefer results from the company's own domain or reputable sources
                    for r in results:
                        url = r.get("image", "")
                        if url and not any(
                            x in url.lower()
                            for x in ["pinterest", "facebook", "instagram", "tiktok"]
                        ):
                            return url
                    # Fall back to first result
                    return results[0].get("image", "")
        except Exception as e:
            print(f"    Search error (attempt {attempt + 1}): {e}")
            time.sleep(2)
    return None


def guess_extension(url: str, content_type: str = "") -> str:
    ext = os.path.splitext(urlparse(url).path)[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".avif"):
        return ext
    ct = content_type.lower()
    if "png" in ct:
        return ".png"
    if "webp" in ct:
        return ".webp"
    return ".jpg"


def download_image(url: str, dest: Path) -> bool:
    """Download an image. Returns True on success."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36"
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read()
            if len(data) < 5000:  # too small, probably an error page
                return False
            ext = guess_extension(url, content_type)
            final_dest = dest.with_suffix(ext)
            final_dest.write_bytes(data)
            return True
    except Exception as e:
        print(f"    Download error: {e}")
        return False


def main():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    case_dirs = sorted(CASE_STUDIES_DIR.iterdir())
    total = len(case_dirs)
    downloaded = 0
    skipped = 0
    failed = 0

    for i, case_dir in enumerate(case_dirs, 1):
        json_path = case_dir / "index.json"
        if not json_path.exists():
            continue

        slug = case_dir.name
        if slug in SKIP_SLUGS:
            print(f"[{i}/{total}] SKIP: {slug} (bad data)")
            skipped += 1
            continue

        data = json.loads(json_path.read_text())
        title = data.get("title", slug)

        # Already has a hero image?
        if data.get("heroImage"):
            print(f"[{i}/{total}] OK: {title} (already has image)")
            skipped += 1
            continue

        # Check if image already downloaded
        existing = list(IMAGE_DIR.glob(f"{slug}.*"))
        if existing:
            # Update JSON and move on
            img_name = existing[0].name
            data["heroImage"] = f"{PUBLIC_PATH}/{img_name}"
            json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
            print(f"[{i}/{total}] OK: {title} (image exists, updated JSON)")
            downloaded += 1
            continue

        # Search for image
        clean = clean_title(title)
        query = f"{clean} product circular economy"
        print(f"[{i}/{total}] Searching: {title}...")

        image_url = search_image(query)
        if not image_url:
            # Try simpler query
            image_url = search_image(clean)

        if not image_url:
            print(f"    FAIL: No image found for {title}")
            failed += 1
            continue

        # Download
        dest = IMAGE_DIR / slug
        if download_image(image_url, dest):
            # Find the saved file (extension may vary)
            saved = list(IMAGE_DIR.glob(f"{slug}.*"))
            if saved:
                img_name = saved[0].name
                data["heroImage"] = f"{PUBLIC_PATH}/{img_name}"
                json_path.write_text(
                    json.dumps(data, indent=2, ensure_ascii=False) + "\n"
                )
                downloaded += 1
                print(f"    OK: saved {img_name}")
            else:
                failed += 1
                print(f"    FAIL: file not found after download")
        else:
            failed += 1

        # Rate limit to avoid getting blocked
        time.sleep(3)

    print(f"\n=== DONE ===")
    print(f"Downloaded: {downloaded}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")
    print(f"Total: {total}")


if __name__ == "__main__":
    main()

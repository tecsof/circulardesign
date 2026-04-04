#!/usr/bin/env python3
"""Download external images for publications, online-tools, and courses,
save them locally, and update the JSON files."""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
from urllib.parse import urlparse

SITE = Path(__file__).resolve().parent.parent

COLLECTIONS = [
    {
        "name": "publications",
        "content_dir": SITE / "src/content/publications",
        "image_dir": SITE / "public/images/publications",
        "public_path": "/images/publications",
        "url_field": "imageUrl",
    },
    {
        "name": "online-tools",
        "content_dir": SITE / "src/content/online-tools",
        "image_dir": SITE / "public/images/online-tools",
        "public_path": "/images/online-tools",
        "url_field": "imageUrl",
    },
    {
        "name": "courses",
        "content_dir": SITE / "src/content/courses",
        "image_dir": SITE / "public/images/courses",
        "public_path": "/images/courses",
        "url_field": "imageUrl",
    },
]


def guess_extension(url, content_type=None):
    """Guess file extension from URL or content-type."""
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"):
        return ext
    if content_type:
        ct = content_type.lower()
        if "jpeg" in ct or "jpg" in ct:
            return ".jpg"
        if "png" in ct:
            return ".png"
        if "gif" in ct:
            return ".gif"
        if "webp" in ct:
            return ".webp"
        if "svg" in ct:
            return ".svg"
    return ".jpg"  # default


def download_image(url, dest_path):
    """Download an image from URL to dest_path. Returns True on success."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read()
            if len(data) < 100:
                return False
            # Fix extension if needed
            ext = guess_extension(url, content_type)
            if not dest_path.suffix:
                dest_path = dest_path.with_suffix(ext)
            dest_path.write_bytes(data)
            return True
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, TimeoutError) as e:
        print(f"  FAIL: {e}")
        return False


def process_collection(col):
    content_dir = col["content_dir"]
    image_dir = col["image_dir"]
    public_path = col["public_path"]
    url_field = col["url_field"]

    image_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = 0

    for item_dir in sorted(content_dir.iterdir()):
        json_path = item_dir / "index.json"
        if not json_path.exists():
            continue

        data = json.loads(json_path.read_text())
        url = data.get(url_field, "").strip()

        if not url or not url.startswith("http"):
            skipped += 1
            continue

        # Determine filename from slug
        slug = item_dir.name
        ext = guess_extension(url)
        filename = f"{slug}{ext}"
        dest = image_dir / filename

        if dest.exists():
            # Already downloaded, just update JSON
            data["image"] = f"{public_path}/{filename}"
            json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
            downloaded += 1
            continue

        print(f"  Downloading: {slug} <- {url[:80]}...")
        if download_image(url, dest):
            # Check if extension changed
            actual = list(image_dir.glob(f"{slug}.*"))
            if actual:
                real_name = actual[0].name
            else:
                real_name = filename

            data["image"] = f"{public_path}/{real_name}"
            json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
            downloaded += 1
        else:
            failed += 1

    return downloaded, skipped, failed


def main():
    total_dl = 0
    total_skip = 0
    total_fail = 0

    for col in COLLECTIONS:
        print(f"\n=== {col['name']} ===")
        dl, sk, fa = process_collection(col)
        print(f"  Downloaded: {dl}, Skipped (no URL): {sk}, Failed: {fa}")
        total_dl += dl
        total_skip += sk
        total_fail += fa

    print(f"\n=== TOTAL ===")
    print(f"Downloaded: {total_dl}, Skipped: {total_skip}, Failed: {total_fail}")


if __name__ == "__main__":
    main()

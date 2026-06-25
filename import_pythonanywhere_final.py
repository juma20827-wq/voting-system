import os
import json
import time
import shutil
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "voting_project.settings")

import django
django.setup()

from django.core.files.base import ContentFile
from django.db import transaction
from django.conf import settings

from api.models import Position, Candidate, Vote, Voter

BASE = "https://24bia057.pythonanywhere.com"
POSITIONS_URL = BASE + "/api/positions/"


def fetch_json(url, retries=3):
    for attempt in range(1, retries + 1):
        try:
            print("Fetching:", url)
            with urllib.request.urlopen(url, timeout=45) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print(f"Fetch failed attempt {attempt}/{retries}:", e)
            time.sleep(2)
    raise Exception("Failed to fetch: " + url)


def download_file(url, retries=3):
    if not url:
        return None, None

    if url.startswith("/"):
        url = BASE + url

    for attempt in range(1, retries + 1):
        try:
            print("Downloading image:", url)
            with urllib.request.urlopen(url, timeout=60) as r:
                data = r.read()

            filename = Path(urlparse(url).path).name or "candidate.jpg"

            if "." not in filename:
                filename += ".jpg"

            return filename, data

        except Exception as e:
            print(f"Image failed attempt {attempt}/{retries}:", e)
            time.sleep(2)

    return None, None


def save_candidate_image(candidate, old_image_url):
    filename, data = download_file(old_image_url)

    if not filename or not data:
        print("No image saved for:", candidate.name)
        if old_image_url:
            candidate.image_url = old_image_url
            candidate.save(update_fields=["image_url"])
        return

    safe_name = filename.replace(" ", "_")
    candidate.image.save(safe_name, ContentFile(data), save=True)

    try:
        candidate.image_url = candidate.image.url
        candidate.save(update_fields=["image_url"])
    except Exception:
        pass

    print("Saved image for:", candidate.name, "=>", candidate.image.name)


def clear_old_media_candidates():
    media_root = Path(settings.MEDIA_ROOT)
    candidates_dir = media_root / "candidates"

    if candidates_dir.exists():
        print("Removing old candidate images:", candidates_dir)
        shutil.rmtree(candidates_dir)

    candidates_dir.mkdir(parents=True, exist_ok=True)


def main():
    print("\nReading PythonAnywhere data...")
    positions = fetch_json(POSITIONS_URL)

    print("\nFOUND CATEGORIES:", len(positions))
    all_data = []

    total_candidates = 0

    for p in positions:
        pid = p.get("id")
        candidates = fetch_json(f"{BASE}/api/positions/{pid}/candidates/")
        total_candidates += len(candidates)

        print(f"- {p.get('name')} => {len(candidates)} nominees")

        all_data.append({
            "position": p,
            "candidates": candidates,
        })

    print("\nSUMMARY")
    print("Categories:", len(positions))
    print("Nominees:", total_candidates)

    print("\nWARNING:")
    print("This will DELETE all current Hostinger votes, voters, candidates, categories and old candidate images.")
    print("Backup must be done before continuing.")

    confirm = input("\nType IMPORT to continue: ").strip()

    if confirm != "IMPORT":
        print("Cancelled. Nothing changed.")
        return

    clear_old_media_candidates()

    with transaction.atomic():
        print("\nDeleting Hostinger test data...")
        Vote.objects.all().delete()
        Voter.objects.all().delete()
        Candidate.objects.all().delete()
        Position.objects.all().delete()

        print("Creating new categories and nominees...")

        created_candidates = []

        for item in all_data:
            p = item["position"]

            position = Position.objects.create(
                name=(p.get("name") or "").strip(),
                description=p.get("description") or ""
            )

            for c in item["candidates"]:
                candidate = Candidate.objects.create(
                    name=(c.get("name") or "").strip(),
                    position=position,
                    description=c.get("description") or "",
                    image_url=""
                )

                old_image_url = c.get("image_url") or c.get("image") or c.get("photo") or ""
                created_candidates.append((candidate.id, old_image_url))

                print("Created:", candidate.name)

    print("\nDownloading and saving images...")
    for candidate_id, old_image_url in created_candidates:
        candidate = Candidate.objects.get(id=candidate_id)
        save_candidate_image(candidate, old_image_url)

    print("\nIMPORT DONE")
    print("Categories:", Position.objects.count())
    print("Nominees:", Candidate.objects.count())
    print("Votes:", Vote.objects.count())
    print("Voters:", Voter.objects.count())

    print("\nPer category:")
    for p in Position.objects.all().order_by("id"):
        print("-", p.name, "=>", Candidate.objects.filter(position=p).count())


if __name__ == "__main__":
    main()

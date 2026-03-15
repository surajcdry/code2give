"""
enrich_resources.py
Lemon-Aid — Geocode pantries and write tractId back to Supabase

This script is meant to be run ONCE (or whenever new pantries are added).
It calls the Census geocoder for any Resource that doesn't have a tractId yet,
then batch-updates the Resource table in Supabase.

Run:
    pip install psycopg2 requests python-dotenv tqdm
    cd ml
    python enrich_resources.py

.env.local needs (at project root):
    DIRECT_URL=...
"""

import os
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import psycopg2
import psycopg2.extras
import requests
from dotenv import load_dotenv
from tqdm import tqdm

# Load .env.local from project root (one level up from ml/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

DB_URL = os.getenv("DIRECT_URL", "").strip('"')
CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"

MAX_WORKERS    = 10   # concurrent geocoder requests (keep moderate to avoid throttle)
CHUNK_SIZE     = 100  # process this many resources per batch
PAUSE_BETWEEN  = 1.0  # seconds to pause between chunks


def geocode_tract_id(lat, lon):
    """
    Call Census geocoder with lat/lng → return FIPS tract ID string, or None.
    Retries once on failure.
    """
    for attempt in range(2):
        try:
            resp = requests.get(CENSUS_GEOCODER_URL, params={
                "x": lon, "y": lat,
                "benchmark": "Public_AR_Current",
                "vintage":   "Current_Current",
                "layers":    "Census Tracts",
                "format":    "json"
            }, timeout=15)
            tracts = resp.json()["result"]["geographies"].get("Census Tracts", [])
            if not tracts:
                return None
            t = tracts[0]
            return t["STATE"] + t["COUNTY"] + t["TRACT"]
        except Exception:
            if attempt == 0:
                time.sleep(2)
            continue
    return None


def geocode_worker(item):
    """Thread worker: geocode a single resource."""
    resource_id, lat, lon = item
    tract_id = geocode_tract_id(lat, lon)
    return (resource_id, tract_id)


def flush_updates(cur, conn, updates):
    """Write a batch of (tract_id, resource_id) updates to the DB."""
    if not updates:
        return
    psycopg2.extras.execute_batch(
        cur,
        'UPDATE "Resource" SET "tractId" = %s WHERE id = %s',
        updates,
        page_size=100
    )
    conn.commit()


def main():
    if not DB_URL:
        raise EnvironmentError("DIRECT_URL not set in .env.local")

    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    # Fetch resources that still need geocoding
    print("Checking which resources need geocoding...")

    cur.execute("""
        SELECT id, latitude, longitude
        FROM "Resource"
        WHERE latitude  IS NOT NULL
          AND longitude IS NOT NULL
          AND "tractId"  IS NULL
    """)

    needs_geocoding = cur.fetchall()

    cur.execute('SELECT COUNT(*) FROM "Resource" WHERE "tractId" IS NOT NULL')
    already_done = cur.fetchone()[0]

    print(f"  {already_done} resources already have tractId")
    print(f"  {len(needs_geocoding)} resources need geocoding")

    if not needs_geocoding:
        print("\nNothing to do — all resources already have tractId!")
        cur.close()
        conn.close()
        return

    # Chunked parallel geocoding to avoid API throttling
    print(f"\nGeocoding with {MAX_WORKERS} threads, chunks of {CHUNK_SIZE}...")

    total_succeeded = 0
    total_failed    = 0
    pbar = tqdm(total=len(needs_geocoding), desc="  Geocoding")

    for chunk_start in range(0, len(needs_geocoding), CHUNK_SIZE):
        chunk = needs_geocoding[chunk_start: chunk_start + CHUNK_SIZE]
        chunk_updates = []

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(geocode_worker, item): item for item in chunk}

            for future in as_completed(futures):
                resource_id, tract_id = future.result()

                if tract_id:
                    chunk_updates.append((tract_id, resource_id))
                    total_succeeded += 1
                else:
                    total_failed += 1

                pbar.update(1)

        # Flush this chunk's results to DB
        flush_updates(cur, conn, chunk_updates)

        # Brief pause between chunks to avoid rate limiting
        if chunk_start + CHUNK_SIZE < len(needs_geocoding):
            time.sleep(PAUSE_BETWEEN)

    pbar.close()

    cur.close()
    conn.close()

    # Summary
    print(f"\n── Summary ─────────────────────────────────────────────")
    print(f"  Already had tractId:  {already_done}")
    print(f"  Newly geocoded:       {total_succeeded}")
    print(f"  Failed:               {total_failed}")
    print(f"  Total with tractId:   {already_done + total_succeeded}")
    print(f"─────────────────────────────────────────────────────────")


if __name__ == "__main__":
    main()


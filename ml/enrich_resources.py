"""
enrich_resources.py
Lemon-Aid — Geocode pantries and write tractId back to Supabase

This script is meant to be run ONCE (or whenever new pantries are added).
It calls the Census geocoder for any Resource that doesn't have a tractId yet,
then batch-updates the Resource table in Supabase.

Run:
    pip install psycopg2 pandas requests python-dotenv tqdm
    cd ml
    python enrich_resources.py

.env.local needs (at project root):
    DIRECT_URL=...
"""

import os
from pathlib import Path
import psycopg2
import psycopg2.extras
import requests
from dotenv import load_dotenv
from tqdm import tqdm

# Load .env.local from project root (one level up from ml/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

DB_URL = os.getenv("DIRECT_URL", "").strip('"')
CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"


def geocode_tract_id(lat, lon):
    """
    Call Census geocoder with lat/lng → return FIPS tract ID string, or None.
    """
    try:
        resp = requests.get(CENSUS_GEOCODER_URL, params={
            "x": lon, "y": lat,
            "benchmark": "Public_AR_Current",
            "vintage":   "Current_Current",
            "layers":    "Census Tracts",
            "format":    "json"
        }, timeout=10)
        tracts = resp.json()["result"]["geographies"].get("Census Tracts", [])
        if not tracts:
            return None
        t = tracts[0]
        return t["STATE"] + t["COUNTY"] + t["TRACT"]
    except Exception:
        return None


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

    # Also count how many already have tractId
    cur.execute("""
        SELECT COUNT(*) FROM "Resource"
        WHERE "tractId" IS NOT NULL
    """)
    already_done = cur.fetchone()[0]

    print(f"  {already_done} resources already have tractId")
    print(f"  {len(needs_geocoding)} resources need geocoding")

    if not needs_geocoding:
        print("\nNothing to do — all resources already have tractId!")
        cur.close()
        conn.close()
        return

    # Geocode and collect updates
    updates = []
    failed  = 0

    for resource_id, lat, lon in tqdm(needs_geocoding, desc="  Geocoding"):
        tract_id = geocode_tract_id(lat, lon)
        if tract_id:
            updates.append((tract_id, resource_id))
        else:
            failed += 1

    print(f"\n  Geocoded: {len(updates)} succeeded, {failed} failed")

    # Batch update Supabase
    if updates:
        print(f"  Writing {len(updates)} tractIds to Resource table...")
        psycopg2.extras.execute_batch(
            cur,
            'UPDATE "Resource" SET "tractId" = %s WHERE id = %s',
            updates,
            page_size=100
        )
        conn.commit()
        print(f"  ✓ Done — {len(updates)} resources updated in Supabase")
    else:
        print("  No successful geocodes to write.")

    cur.close()
    conn.close()

    # Summary
    print(f"\n── Summary ─────────────────────────────────────────────")
    print(f"  Already had tractId:  {already_done}")
    print(f"  Newly geocoded:       {len(updates)}")
    print(f"  Failed:               {failed}")
    print(f"  Total with tractId:   {already_done + len(updates)}")
    print(f"─────────────────────────────────────────────────────────")


if __name__ == "__main__":
    main()

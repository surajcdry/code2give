import requests
import psycopg2
import psycopg2.extras
import os
import uuid
from dotenv import load_dotenv

load_dotenv("../.env.local")

conn = psycopg2.connect(os.getenv("DIRECT_URL"))
cur = conn.cursor()

# All 50 states + DC FIPS codes
STATES = [
    "01", "02", "04", "05", "06", "08", "09", "10", "11", "12",
    "13", "15", "16", "17", "18", "19", "20", "21", "22", "23",
    "24", "25", "26", "27", "28", "29", "30", "31", "32", "33",
    "34", "35", "36", "37", "38", "39", "40", "41", "42", "44",
    "45", "46", "47", "48", "49", "50", "51", "53", "54", "55", "56"
]

CENSUS_URL = "https://api.census.gov/data/2022/acs/acs5"

cur.execute('DELETE FROM "CensusData"')
print("Cleared old data")

total_inserted = 0

for state in STATES:
    try:
        params = {
            "get": "B01003_001E,B17020_002E",
            "for": "tract:*",
            "in": f"state:{state} county:*"
        }

        response = requests.get(CENSUS_URL, params=params, timeout=15)
        if response.status_code != 200:
            print(f"Skipping state={state}: HTTP {response.status_code}")
            continue

        data = response.json()

        if not isinstance(data, list):
            print(f"Skipping state={state}: unexpected response")
            continue

        headers = data[0]
        rows = data[1:]

        updates = []
        for row in rows:
            d = dict(zip(headers, row))
            try:
                population = int(d["B01003_001E"]) if d["B01003_001E"] is not None else 0
                below_poverty = int(d["B17020_002E"]) if d["B17020_002E"] is not None else 0
                tract_id = f"{d['state']}{d['county']}{d['tract']}"
                poverty_index = round(below_poverty / population, 4) if population > 0 else 0.0

                uid = str(uuid.uuid4())[:16] # Use a longer random ID or default cuid logic
                updates.append((uid, tract_id, poverty_index, population))

            except Exception as e:
                continue

        if updates:
            psycopg2.extras.execute_batch(
                cur,
                """
                INSERT INTO "CensusData" (id, "tractId", "povertyIndex", population, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT ("tractId") DO UPDATE SET
                    "povertyIndex" = EXCLUDED."povertyIndex",
                    population = EXCLUDED.population,
                    "updatedAt" = NOW()
                """,
                updates,
                page_size=1000
            )

        conn.commit()
        total_inserted += len(updates)
        print(f"state={state}: inserted {len(updates)} tracts")

    except Exception as e:
        print(f"Error state={state}: {e}")
        conn.rollback()
        continue

cur.close()
conn.close()
print(f"\nDone! Total inserted: {total_inserted} census tracts across all US states")
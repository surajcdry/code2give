import requests
import psycopg2
import os
import uuid
from dotenv import load_dotenv

load_dotenv("../.env.local")

conn = psycopg2.connect(os.getenv("DIRECT_URL"))
cur = conn.cursor()

# All Lemontree cities: state -> list of county FIPS codes
COUNTIES = {
    "36": ["005","047","061","081","085"],  # NYC (all 5 boroughs)
    "13": ["121"],                          # Atlanta (Fulton County)
    "25": ["025"],                          # Boston (Suffolk County)
    "39": ["049"],                          # Columbus (Franklin County)
    "34": ["001","003","005","007","009","011","013","015","017","019","021","023","025","027","029","031","033","035","037","039","041"],  # NJ (all counties)
    "42": ["101"],                          # Philadelphia
    "11": ["001"],                          # Washington DC
    "24": ["005","510"],                    # Baltimore
    "37": ["119"],                          # Charlotte (Mecklenburg)
    "26": ["163"],                          # Detroit (Wayne County)
    "12": ["057"],                          # Tampa (Hillsborough)
}

CENSUS_URL = "https://api.census.gov/data/2022/acs/acs5"

cur.execute('DELETE FROM "CensusData"')
print("Cleared old data")

total_inserted = 0

for state, counties in COUNTIES.items():
    for county in counties:
        try:
            params = {
                "get": "B01003_001E,B17020_002E",
                "for": "tract:*",
                "in": f"state:{state} county:{county}"
            }

            response = requests.get(CENSUS_URL, params=params)
            data = response.json()

            if not isinstance(data, list):
                print(f"Skipping state={state} county={county}: unexpected response")
                continue

            headers = data[0]
            rows = data[1:]

            inserted = 0
            for row in rows:
                d = dict(zip(headers, row))
                try:
                    population = int(d["B01003_001E"]) if d["B01003_001E"] else 0
                    below_poverty = int(d["B17020_002E"]) if d["B17020_002E"] else 0
                    tract_id = f"{d['state']}{d['county']}{d['tract']}"
                    poverty_index = round(below_poverty / population, 4) if population > 0 else 0.0

                    cur.execute("""
                        INSERT INTO "CensusData" (id, "tractId", "povertyIndex", population, "createdAt", "updatedAt")
                        VALUES (%s, %s, %s, %s, NOW(), NOW())
                    """, (str(uuid.uuid4())[:8], tract_id, poverty_index, population))
                    inserted += 1

                except Exception as e:
                    continue

            conn.commit()
            total_inserted += inserted
            print(f"state={state} county={county}: inserted {inserted} tracts")

        except Exception as e:
            print(f"Error state={state} county={county}: {e}")
            continue

cur.close()
conn.close()
print(f"\nDone! Total inserted: {total_inserted} census tracts across all Lemontree cities")
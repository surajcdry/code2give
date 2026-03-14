"""
build_graph.py
Lemon-Aid — Graph Construction (Phase 1 + 2)
Outputs: graph_nodes.csv, graph_edges.csv

Run:
    pip install psycopg2 pandas numpy scikit-learn requests python-dotenv
    python build_graph.py

.env needs:
    DIRECT_DATABASE_URL=...
    GOOGLE_MAPS_MATRIX_API_KEY=...   # teammate adds this
"""

import os
import json
import math
import psycopg2
import requests
import pandas as pd
import numpy as np
from sklearn.neighbors import BallTree
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
DB_URL          = os.getenv("DIRECT_DATABASE_URL")
GMAPS_API_KEY   = os.getenv("GOOGLE_MAPS_MATRIX_API_KEY")
K_NEIGHBORS     = 8
MAX_TRAVEL_MIN  = 20
EARTH_RADIUS_KM = 6371
BATCH_SIZE      = 25   # Distance Matrix API: max 25 origins per request

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
CENSUS_GEOCODER_URL = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates"

# Tags whose name contains these strings count toward magnet score
MAGNET_KEYWORDS = ["fresh produce", "meat", "dairy", "hot meals",
                   "groceries", "produce", "fruits", "vegetables"]

# ── Node feature helpers ──────────────────────────────────────────────────────

def parse_magnet_score(tags_json):
    """
    Score based on OFFERING tags that signal high-value food availability.
    Normalized 0-1 against number of known magnet keywords.
    """
    if not tags_json:
        return 0.0
    try:
        tags = tags_json if isinstance(tags_json, list) else json.loads(tags_json)
        hits = 0
        for t in tags:
            if not isinstance(t, dict):
                continue
            name = t.get("name", "").lower()
            cat  = t.get("tagCategoryId", "")
            if cat == "OFFERING" and any(kw in name for kw in MAGNET_KEYWORDS):
                hits += 1
        return min(hits / max(len(MAGNET_KEYWORDS), 1), 1.0)
    except Exception:
        return 0.0

def parse_reliability(occurrences_json):
    """
    Reliability = confirmed / (confirmed + skipped) occurrences.
    confirmedAt and skippedAt live directly on each occurrence object.
    Defaults to 0.5 if no data.
    """
    if not occurrences_json:
        return 0.5
    try:
        occs = occurrences_json if isinstance(occurrences_json, list) else json.loads(occurrences_json)
        if not occs:
            return 0.5
        confirmed = sum(1 for o in occs if isinstance(o, dict) and o.get("confirmedAt") is not None)
        skipped   = sum(1 for o in occs if isinstance(o, dict) and o.get("skippedAt")   is not None)
        total = confirmed + skipped
        return confirmed / total if total > 0 else 0.5
    except Exception:
        return 0.5

def get_poverty_index(lat, lon, census_lookup):
    """
    Hit Census geocoder with lat/lng → get full FIPS tract ID →
    look up povertyIndex from our CensusData table.
    Returns None if not found.
    """
    try:
        resp = requests.get(CENSUS_GEOCODER_URL, params={
            "x": lon, "y": lat,
            "benchmark": "Public_AR_Current",
            "vintage":   "Current_Current",
            "layers":    "Census Tracts",
            "format":    "json"
        }, timeout=5)
        tracts = resp.json()["result"]["geographies"].get("Census Tracts", [])
        if not tracts:
            return None
        t    = tracts[0]
        fips = t["STATE"] + t["COUNTY"] + t["TRACT"]
        return census_lookup.get(fips)
    except Exception:
        return None

def normalize_col(series):
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series([0.0] * len(series), index=series.index)
    return (series - mn) / (mx - mn)

# ── Edge weight helpers ───────────────────────────────────────────────────────

def get_travel_times_batch(origins, destinations):
    """
    Call Distance Matrix API for up to BATCH_SIZE origins x all destinations.
    Returns 2D list [origin_i][dest_j] = minutes, or None on failure.
    """
    origins_str = "|".join(f"{lat},{lon}" for lat, lon in origins)
    dests_str   = "|".join(f"{lat},{lon}" for lat, lon in destinations)
    try:
        resp = requests.get(DISTANCE_MATRIX_URL, params={
            "origins":      origins_str,
            "destinations": dests_str,
            "mode":         "driving",
            "key":          GMAPS_API_KEY
        }, timeout=15)
        data = resp.json()
        if data["status"] != "OK":
            print(f"  [warn] Distance Matrix status: {data['status']}")
            return None
        result = []
        for row in data["rows"]:
            row_mins = []
            for el in row["elements"]:
                if el["status"] == "OK":
                    row_mins.append(el["duration"]["value"] / 60.0)  # s → min
                else:
                    row_mins.append(None)
            result.append(row_mins)
        return result
    except Exception as e:
        print(f"  [warn] Distance Matrix request failed: {e}")
        return None

def get_all_travel_times(df, candidate_pairs):
    """
    Batch all candidate (src, dst) pairs through the Distance Matrix API.
    Groups by unique sources in chunks of BATCH_SIZE.
    Returns dict {(src_idx, dst_idx): travel_minutes}.
    """
    src_to_dsts = {}
    for src, dst in candidate_pairs:
        src_to_dsts.setdefault(src, []).append(dst)

    src_list     = list(src_to_dsts.keys())
    travel_times = {}
    n_batches    = math.ceil(len(src_list) / BATCH_SIZE)

    print(f"  Calling Distance Matrix API — {n_batches} batches of ≤{BATCH_SIZE} origins...")

    for b, batch_start in enumerate(range(0, len(src_list), BATCH_SIZE)):
        batch_srcs = src_list[batch_start: batch_start + BATCH_SIZE]
        batch_dsts = list({dst for src in batch_srcs for dst in src_to_dsts[src]})

        origins      = [(df.at[i, "lat"], df.at[i, "lon"]) for i in batch_srcs]
        destinations = [(df.at[j, "lat"], df.at[j, "lon"]) for j in batch_dsts]

        result = get_travel_times_batch(origins, destinations)
        if result is None:
            print(f"  [warn] Batch {b+1}/{n_batches} failed — skipping")
            continue

        dst_pos = {dst: pos for pos, dst in enumerate(batch_dsts)}
        for src_pos, src in enumerate(batch_srcs):
            for dst in src_to_dsts[src]:
                mins = result[src_pos][dst_pos[dst]]
                if mins is not None:
                    travel_times[(src, dst)] = mins

        print(f"  Batch {b+1}/{n_batches} done", end="\r")

    print()
    return travel_times

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not GMAPS_API_KEY:
        raise EnvironmentError("GOOGLE_MAPS_MATRIX_API_KEY not set in .env")

    # ── 1. Load data from DB ──────────────────────────────────────────────────
    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    print("Fetching pantries from Resource table...")
    cur.execute("""
        SELECT id, name, latitude, longitude,
               "resourceTypeId",
               "ratingAverage",
               "waitTimeMinutesAverage",
               tags,
               occurrences
        FROM "Resource"
        WHERE latitude  IS NOT NULL
          AND longitude IS NOT NULL
          AND "resourceStatusId" != 'CLOSED'
    """)
    rows = cur.fetchall()
    df = pd.DataFrame(rows, columns=[
        "id", "name", "lat", "lon",
        "resourceTypeId", "ratingAverage", "waitTimeMinutesAverage",
        "tags", "occurrences"
    ])
    print(f"  {len(df)} pantries loaded")

    print("Loading CensusData...")
    cur.execute('SELECT "tractId", "povertyIndex" FROM "CensusData"')
    census_lookup = {row[0]: float(row[1]) for row in cur.fetchall()}
    print(f"  {len(census_lookup)} census tracts loaded")

    cur.close()
    conn.close()

    # ── 2. Build node features ────────────────────────────────────────────────
    print("\nBuilding node features...")

    # Pantry type: 1 = FOOD_PANTRY, 0 = anything else (SOUP_KITCHEN, SNAP_EBT, etc.)
    df["pantryTypeBinary"] = (df["resourceTypeId"] == "FOOD_PANTRY").astype(float)

    # Magnet score: presence of high-value food offering tags
    df["magnetScore"] = df["tags"].apply(parse_magnet_score)

    # Reliability: ratio of confirmedAt vs skippedAt inside occurrences JSONB
    df["reliability"] = df["occurrences"].apply(parse_reliability)

    # Numeric cleanup
    df["ratingAverage"]          = pd.to_numeric(df["ratingAverage"],          errors="coerce").fillna(0.0)
    df["waitTimeMinutesAverage"] = pd.to_numeric(df["waitTimeMinutesAverage"], errors="coerce").fillna(0.0)

    # Poverty index via Census geocoder (lat/lng → FIPS → povertyIndex)
    print("  Fetching poverty indices via Census geocoder (one call per pantry — may take a while)...")
    df["povertyIndex"] = df.apply(
        lambda r: get_poverty_index(r["lat"], r["lon"], census_lookup), axis=1
    )
    n_missing = df["povertyIndex"].isna().sum()
    fallback  = df["povertyIndex"].median()
    fallback  = fallback if pd.notna(fallback) else 0.5
    df["povertyIndex"] = df["povertyIndex"].fillna(fallback)
    print(f"  {n_missing}/{len(df)} pantries had no census match — filled with median ({fallback:.3f})")

    # ── 3. Normalize all features to [0, 1] ───────────────────────────────────
    print("\nNormalizing features...")
    df["waitNorm"]    = normalize_col(df["waitTimeMinutesAverage"])
    df["ratingNorm"]  = normalize_col(df["ratingAverage"])
    df["povertyNorm"] = normalize_col(df["povertyIndex"].astype(float))

    df = df.reset_index(drop=True)

    # ── 4. Save nodes CSV ─────────────────────────────────────────────────────
    node_cols = [
        "id", "name", "lat", "lon",
        "pantryTypeBinary",   # feature 0
        "magnetScore",        # feature 1
        "reliability",        # feature 2
        "waitNorm",           # feature 3  (also GNN training label)
        "ratingNorm",         # feature 4
        "povertyNorm",        # feature 5
        "waitTimeMinutesAverage"  # raw label (for reference)
    ]
    df[node_cols].to_csv("graph_nodes.csv", index=True, index_label="nodeIdx")
    print(f"Saved graph_nodes.csv  ({len(df)} nodes)")

    # ── 5. KNN candidate pairs via BallTree ───────────────────────────────────
    print("\nFinding KNN candidate pairs with BallTree...")
    coords_rad           = np.radians(df[["lat", "lon"]].values)
    tree                 = BallTree(coords_rad, metric="haversine")
    distances, neighbors = tree.query(coords_rad, k=K_NEIGHBORS + 1)

    candidate_pairs = [
        (i, int(neighbors[i][k]))
        for i in range(len(df))
        for k in range(1, K_NEIGHBORS + 1)
    ]
    print(f"  {len(candidate_pairs)} candidate pairs → sending to Distance Matrix API")

    # ── 6. Get real travel times ──────────────────────────────────────────────
    travel_times = get_all_travel_times(df, candidate_pairs)

    # ── 7. Filter edges + build adjacency ─────────────────────────────────────
    print("Filtering edges (travel time > 20 min discarded)...")
    edge_list = []
    for src, dst in candidate_pairs:
        minutes = travel_times.get((src, dst))
        if minutes is not None and minutes <= MAX_TRAVEL_MIN:
            edge_list.append({
                "src":           src,
                "dst":           dst,
                "travelMinutes": round(minutes, 2),
                "weight":        round(1.0 - (minutes / MAX_TRAVEL_MIN), 4)
            })

    edges_df = pd.DataFrame(edge_list)
    edges_df.to_csv("graph_edges.csv", index=False)
    print(f"Saved graph_edges.csv  ({len(edges_df)} edges)")

    # ── 8. Summary ────────────────────────────────────────────────────────────
    print("\n── Adjacency Matrix Summary ─────────────────────────────────")
    print(f"  Nodes:              {len(df)}")
    print(f"  Candidate pairs:    {len(candidate_pairs)}")
    print(f"  Edges after filter: {len(edges_df)}")
    if len(edges_df):
        print(f"  Avg edges/node:     {len(edges_df)/len(df):.1f}")
        print(f"  Avg travel time:    {edges_df['travelMinutes'].mean():.1f} min")
        print(f"  Avg edge weight:    {edges_df['weight'].mean():.3f}")
    print("─────────────────────────────────────────────────────────────")
    print("\nDone! Hand graph_nodes.csv + graph_edges.csv to Yash for GNN training.")

if __name__ == "__main__":
    main()
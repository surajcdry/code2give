"""
build_graph.py
Lemon-Aid — Graph Construction (Phase 1 + 2)
Outputs: graph_nodes.csv, graph_edges.csv

Prerequisite: Run enrich_resources.py first to populate tractId in Supabase.

Run:
    pip install psycopg2 pandas numpy scikit-learn requests python-dotenv tqdm
    cd ml
    python build_graph.py

.env.local needs (at project root):
    DIRECT_URL=...
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...   (or GOOGLE_MAPS_MATRIX_API_KEY)
"""

import os
import json
import math
import pickle
from pathlib import Path
import psycopg2
import requests
import pandas as pd
import numpy as np
from sklearn.neighbors import BallTree
from dotenv import load_dotenv
from tqdm import tqdm

# Load .env.local from project root (one level up from ml/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

# ── Config ────────────────────────────────────────────────────────────────────
DB_URL          = os.getenv("DIRECT_URL", "").strip('"')
GMAPS_API_KEY   = os.getenv("GOOGLE_MAPS_MATRIX_API_KEY") or os.getenv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
K_NEIGHBORS     = 8
MIN_NEIGHBORS   = 2       # guarantee at least this many edges per node
MAX_TRAVEL_MIN  = 20
EARTH_RADIUS_KM = 6371
BATCH_SIZE      = 25

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

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
    Defaults to 0.5 if no data.
    """
    if not occurrences_json:
        return 0.5
    try:
        occs = occurrences_json if isinstance(occurrences_json, list) else json.loads(occurrences_json)
        if not occs:
            return 0.5
        confirmed = sum(1 for o in occs if isinstance(o, dict) and o.get("confirmedAt") is not None)
        skipped   = sum(1 for o in occs if isinstance(o, dict) and o.get("skippedAt") is not None)
        total = confirmed + skipped
        return confirmed / total if total > 0 else 0.5
    except Exception:
        return 0.5

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
            return None
        result = []
        for row in data["rows"]:
            row_mins = []
            for el in row["elements"]:
                if el["status"] == "OK":
                    row_mins.append(el["duration"]["value"] / 60.0)
                else:
                    row_mins.append(None)
            result.append(row_mins)
        return result
    except Exception:
        return None

def get_all_travel_times(df, candidate_pairs):
    """
    Batch all candidate (src, dst) pairs through the Distance Matrix API.
    Returns dict {(src_idx, dst_idx): travel_minutes}.
    Uses cache to avoid re-calling on restart.
    """
    cache_path = CACHE_DIR / "travel_times.pkl"
    if cache_path.exists():
        print("  Loading cached travel times...")
        with open(cache_path, "rb") as f:
            return pickle.load(f)

    src_to_dsts = {}
    for src, dst in candidate_pairs:
        src_to_dsts.setdefault(src, []).append(dst)

    src_list     = list(src_to_dsts.keys())
    travel_times = {}
    n_batches    = math.ceil(len(src_list) / BATCH_SIZE)

    for batch_start in tqdm(range(0, len(src_list), BATCH_SIZE),
                            total=n_batches, desc="  Distance Matrix API"):

        batch_srcs = src_list[batch_start: batch_start + BATCH_SIZE]
        batch_dsts = list({dst for src in batch_srcs for dst in src_to_dsts[src]})

        origins      = [(df.at[i, "lat"], df.at[i, "lon"]) for i in batch_srcs]
        destinations = [(df.at[j, "lat"], df.at[j, "lon"]) for j in batch_dsts]

        result = get_travel_times_batch(origins, destinations)

        if result is None:
            continue

        dst_pos = {dst: pos for pos, dst in enumerate(batch_dsts)}

        for src_pos, src in enumerate(batch_srcs):
            for dst in src_to_dsts[src]:
                mins = result[src_pos][dst_pos[dst]]
                if mins is not None:
                    travel_times[(src, dst)] = mins

    # Cache results
    with open(cache_path, "wb") as f:
        pickle.dump(travel_times, f)
    print(f"  Cached travel times to {cache_path}")

    return travel_times

# ── Edge filtering with minimum neighbor guarantee ────────────────────────────

def build_edges(candidate_pairs, travel_times, num_nodes):
    """
    Filter edges by MAX_TRAVEL_MIN, but guarantee every node keeps
    at least MIN_NEIGHBORS edges (its closest neighbors by travel time).
    """
    # Group candidates by source node with their travel times
    src_candidates = {}
    for src, dst in candidate_pairs:
        minutes = travel_times.get((src, dst))
        if minutes is not None:
            src_candidates.setdefault(src, []).append((dst, minutes))

    edge_list = []
    isolated_count = 0

    for src in range(num_nodes):
        candidates = src_candidates.get(src, [])
        if not candidates:
            isolated_count += 1
            continue

        # Sort by travel time (closest first)
        candidates.sort(key=lambda x: x[1])

        # Keep edges under the threshold
        kept = [(dst, mins) for dst, mins in candidates if mins <= MAX_TRAVEL_MIN]

        # If we don't have enough, keep the closest MIN_NEIGHBORS regardless
        if len(kept) < MIN_NEIGHBORS:
            kept = candidates[:MIN_NEIGHBORS]

        for dst, minutes in kept:
            weight = round(max(1.0 - (minutes / MAX_TRAVEL_MIN), 0.0), 4)

            edge_list.append({
                "src": src,
                "dst": dst,
                "travelMinutes": round(minutes, 2),
                "weight": weight
            })

            # Reverse edge
            edge_list.append({
                "src": dst,
                "dst": src,
                "travelMinutes": round(minutes, 2),
                "weight": weight
            })

    if isolated_count:
        print(f"  [warn] {isolated_count} nodes had no travel time data at all")

    return edge_list

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not GMAPS_API_KEY:
        raise EnvironmentError("No Google Maps API key found in .env.local")
    if not DB_URL:
        raise EnvironmentError("DIRECT_URL not set in .env.local")

    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    # ── 1. Load resources (with tractId from enrich_resources.py) ─────────────
    print("Fetching pantries from Resource table...")

    cur.execute("""
        SELECT r.id, r.name, r.latitude, r.longitude,
               r."resourceTypeId",
               r."ratingAverage",
               r."waitTimeMinutesAverage",
               r.tags,
               r.occurrences,
               r."tractId",
               c."povertyIndex"
        FROM "Resource" r
        LEFT JOIN "CensusData" c ON r."tractId" = c."tractId"
        WHERE r.latitude  IS NOT NULL
          AND r.longitude IS NOT NULL
          AND r."resourceStatusId" != 'CLOSED'
    """)

    rows = cur.fetchall()

    df = pd.DataFrame(rows, columns=[
        "id", "name", "lat", "lon",
        "resourceTypeId", "ratingAverage", "waitTimeMinutesAverage",
        "tags", "occurrences", "tractId", "povertyIndex"
    ])

    cur.close()
    conn.close()

    n_with_tract = df["tractId"].notna().sum()
    print(f"  {len(df)} pantries loaded ({n_with_tract} with tractId)")

    if n_with_tract == 0:
        print("\n  ⚠ No resources have tractId yet. Run enrich_resources.py first!")

    # ── 2. Build node features ────────────────────────────────────────────────
    print("\nBuilding node features...")

    df["pantryTypeBinary"] = (df["resourceTypeId"] == "FOOD_PANTRY").astype(float)

    df["magnetScore"] = df["tags"].apply(parse_magnet_score)

    df["reliability"] = df["occurrences"].apply(parse_reliability)

    df["ratingAverage"]          = pd.to_numeric(df["ratingAverage"], errors="coerce").fillna(0.0)
    df["waitTimeMinutesAverage"] = pd.to_numeric(df["waitTimeMinutesAverage"], errors="coerce").fillna(0.0)

    # Poverty index (already joined from CensusData)
    df["povertyIndex"] = pd.to_numeric(df["povertyIndex"], errors="coerce")

    fallback = df["povertyIndex"].median()
    fallback = fallback if pd.notna(fallback) else 0.5
    df["povertyIndex"] = df["povertyIndex"].fillna(fallback)

    # ── 3. Normalize ──────────────────────────────────────────────────────────
    print("Normalizing features...")

    df["waitNorm"]    = normalize_col(df["waitTimeMinutesAverage"])
    df["ratingNorm"]  = normalize_col(df["ratingAverage"])
    df["povertyNorm"] = normalize_col(df["povertyIndex"].astype(float))

    # ── KNN tree (also used for density feature)
    coords_rad = np.radians(df[["lat", "lon"]].values)
    tree       = BallTree(coords_rad, metric="haversine")

    # Local pantry density within 2km
    RADIUS_KM  = 2
    radius_rad = RADIUS_KM / EARTH_RADIUS_KM
    counts     = tree.query_radius(coords_rad, r=radius_rad, count_only=True)

    df["localDensity"] = counts - 1
    df["densityNorm"]  = normalize_col(df["localDensity"])

    df = df.reset_index(drop=True)

    # ── 4. Save nodes CSV ─────────────────────────────────────────────────────
    node_cols = [
        "id", "name", "lat", "lon",
        "pantryTypeBinary",
        "magnetScore",
        "reliability",
        "waitNorm",
        "ratingNorm",
        "povertyNorm",
        "densityNorm",
        "waitTimeMinutesAverage"
    ]

    df[node_cols].to_csv("graph_nodes.csv", index=True, index_label="nodeIdx")
    print(f"Saved graph_nodes.csv ({len(df)} nodes)")

    # ── 5. KNN candidate pairs ────────────────────────────────────────────────
    print("\nFinding KNN candidate pairs...")

    distances, neighbors = tree.query(coords_rad, k=K_NEIGHBORS + 1)

    candidate_pairs = [
        (i, int(neighbors[i][k]))
        for i in range(len(df))
        for k in range(1, K_NEIGHBORS + 1)
    ]

    # ── 6. Travel times via Distance Matrix API ───────────────────────────────
    travel_times = get_all_travel_times(df, candidate_pairs)

    # ── 7. Filter edges with minimum neighbor guarantee ───────────────────────
    print("Building edges (min 2 neighbors guaranteed)...")

    edge_list = build_edges(candidate_pairs, travel_times, len(df))
    edges_df  = pd.DataFrame(edge_list)

    # Deduplicate (reverse edges may create duplicates)
    edges_df = edges_df.drop_duplicates(subset=["src", "dst"])

    edges_df.to_csv("graph_edges.csv", index=False)
    print(f"Saved graph_edges.csv ({len(edges_df)} edges)")

    # ── Summary ───────────────────────────────────────────────────────────────
    edges_per_node = edges_df.groupby("src").size()

    print(f"\n── Summary ─────────────────────────────────────────────────────")
    print(f"  Nodes:              {len(df)}")
    print(f"  Edges:              {len(edges_df)}")
    if len(edges_df):
        print(f"  Avg edges/node:     {edges_per_node.mean():.1f}")
        print(f"  Min edges/node:     {edges_per_node.min()}")
        print(f"  Max edges/node:     {edges_per_node.max()}")
        print(f"  Avg travel time:    {edges_df['travelMinutes'].mean():.1f} min")
        print(f"  Avg edge weight:    {edges_df['weight'].mean():.3f}")

        # How many nodes got the "rescue" treatment
        beyond_threshold = edges_df[edges_df["travelMinutes"] > MAX_TRAVEL_MIN]
        if len(beyond_threshold):
            nodes_rescued = beyond_threshold["src"].nunique()
            print(f"  Nodes with edges > {MAX_TRAVEL_MIN} min (rescued): {nodes_rescued}")

    print(f"─────────────────────────────────────────────────────────────────")
    print("\nDone!")


if __name__ == "__main__":
    main()
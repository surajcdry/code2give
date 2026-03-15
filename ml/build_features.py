"""
build_features.py
Lemon-Aid — Phase 3: Feature Extraction & Graph Construction

Queries the PostgreSQL database for all published food resources nationwide,
computes node features (magnet score, barrier score, days covered, poverty index, etc.),
constructs a spatial radius graph with BallTree, computes a **coverage gap score**
for each node, and writes nodes.csv + edges.csv.

Coverage Gap Detection
----------------------
For each pantry we compute:

    gap_score = poverty_index / (1 + neighbor_count_within_2km)

High score = high need neighborhood, few nearby options.  We bucket into
three tiers for the GNN label:

    0 = well-covered  (bottom 50% of gap scores)
    1 = moderate gap   (50th–85th percentile)
    2 = critical gap   (top 15%)

This is a genuine graph problem — "how covered is this area" is inherently
about a node's relationship to its neighbors, which is exactly what message
passing captures.

Run:
    pip install -r requirements.txt
    cd ml
    python build_features.py

Prerequisite:
    - enrich_resources.py has been run (populates tractId on Resource rows)
    - seed_census.py has been run (populates CensusData table)
    - .env.local at project root contains DIRECT_URL
"""

import os
import re
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
from sklearn.neighbors import BallTree
from dotenv import load_dotenv

# Optional: censusgeocode fallback for the rare resource missing tractId
try:
    import censusgeocode as cg
    HAS_CG = True
except ImportError:
    HAS_CG = False
    print("[warn] censusgeocode not installed; skipping API fallback for missing tractIds")

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

DB_URL = os.getenv("DIRECT_URL", "").strip('"')
ML_DIR = Path(__file__).resolve().parent

RADIUS_KM    = 2.0           # max edge distance — radius is the primary constraint
EARTH_RADIUS = 6371.0        # km

TRACT_CACHE_PATH = ML_DIR / "tract_cache.json"

# Tags for magnet_score (OFFERING category)
MAGNET_TAGS = [
    "Fresh produce",
    "Client choice pantry",
    "Halal food available",
    "Kosher food available",
    "Delivery may be available",
    "Diapers/baby essentials may be available",
]

# Tags for barrier_score (REQUIREMENT category)
BARRIER_TAGS = [
    "ID required",
    "Registration required",
    "Proof of household income required",
    "Proof of address required",
    "Referral Required. Lemontree can provide this referral. Please see the requirements in notes.",
]

RESOURCE_TYPE_MAP = {
    "FOOD_PANTRY":      0,
    "SOUP_KITCHEN":     1,
    "COMMUNITY_FRIDGE": 2,
}


# ── Feature helpers ───────────────────────────────────────────────────────────

def compute_magnet_score(tags_json) -> float:
    """Count matching OFFERING tags / len(MAGNET_TAGS). Returns 0.0 on error."""
    if not tags_json:
        return 0.0
    try:
        tags = tags_json if isinstance(tags_json, list) else json.loads(tags_json)
        hits = sum(
            1 for t in tags
            if isinstance(t, dict)
            and t.get("tagCategoryId") == "OFFERING"
            and t.get("name") in MAGNET_TAGS
        )
        return hits / len(MAGNET_TAGS)
    except Exception:
        return 0.0


def compute_barrier_score(tags_json) -> float:
    """Count matching REQUIREMENT tags / len(BARRIER_TAGS). Returns 0.0 on error."""
    if not tags_json:
        return 0.0
    try:
        tags = tags_json if isinstance(tags_json, list) else json.loads(tags_json)
        hits = sum(
            1 for t in tags
            if isinstance(t, dict)
            and t.get("tagCategoryId") == "REQUIREMENT"
            and t.get("name") in BARRIER_TAGS
        )
        return hits / len(BARRIER_TAGS)
    except Exception:
        return 0.0


def compute_days_covered(shifts_json) -> float:
    """Count unique BYDAY day codes across all shifts / 7. Returns 0.0 on error."""
    if not shifts_json:
        return 0.0
    try:
        shifts = shifts_json if isinstance(shifts_json, list) else json.loads(shifts_json)
        unique_days: set = set()
        for shift in shifts:
            if not isinstance(shift, dict):
                continue
            pattern = shift.get("recurrencePattern") or ""
            for m in re.findall(r"BYDAY=([^;]+)", pattern):
                for code in m.split(","):
                    # Strip numeric prefix: "2SA" → "SA", "-1FR" → "FR"
                    cleaned = re.sub(r"^-?\d+", "", code.strip())
                    if cleaned:
                        unique_days.add(cleaned)
        return len(unique_days) / 7.0
    except Exception:
        return 0.0


# ── Census geocode fallback ───────────────────────────────────────────────────

def load_tract_cache() -> dict:
    if TRACT_CACHE_PATH.exists():
        with open(TRACT_CACHE_PATH) as f:
            return json.load(f)
    return {}


def save_tract_cache(cache: dict) -> None:
    with open(TRACT_CACHE_PATH, "w") as f:
        json.dump(cache, f)


def geocode_tract(lat: float, lon: float, cache: dict):
    """
    Return census tract GEOID string for (lat, lon), or None on failure.
    Results are cached to TRACT_CACHE_PATH keyed by 'lat,lon'.
    Note: cg.coordinates takes x=longitude, y=latitude.
    """
    key = f"{lat},{lon}"
    if key in cache:
        return cache[key]
    if not HAS_CG:
        cache[key] = None
        return None
    try:
        result = cg.coordinates(x=lon, y=lat)
        tracts = result.get("Census Tracts", [])
        if tracts:
            t = tracts[0]
            geoid = t.get(
                "GEOID",
                t.get("STATE", "") + t.get("COUNTY", "") + t.get("TRACT", ""),
            )
            cache[key] = geoid
            return geoid
        cache[key] = None
        return None
    except Exception as e:
        print(f"  [warn] censusgeocode failed for ({lat}, {lon}): {e}")
        cache[key] = None
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not DB_URL:
        raise EnvironmentError("DIRECT_URL not set in .env.local")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # ── 1. Query all published resources ──────────────────────────────────────
    print("Fetching published food resources from database...")
    cur.execute("""
        SELECT
            r.id,
            r.latitude,
            r.longitude,
            r."resourceTypeId",
            r."ratingAverage",
            r.tags,
            r.shifts,
            r."subscriberCount",
            r."reviewCount",
            r."tractId",
            c."povertyIndex",
            r.confidence,
            r."appointmentRequired"
        FROM "Resource" r
        LEFT JOIN "CensusData" c ON r."tractId" = c."tractId"
        WHERE r.latitude  IS NOT NULL
          AND r.longitude IS NOT NULL
          AND r."resourceStatusId" = 'PUBLISHED'
          AND r."resourceTypeId" IN ('FOOD_PANTRY', 'SOUP_KITCHEN', 'COMMUNITY_FRIDGE')
    """)

    rows = cur.fetchall()
    colnames = [
        "resource_id", "latitude", "longitude",
        "resourceTypeId", "ratingAverage",
        "tags", "shifts", "subscriberCount", "reviewCount",
        "tractId", "povertyIndex", "confidence", "appointmentRequired",
    ]
    df = pd.DataFrame(rows, columns=colnames)
    print(f"  {len(df)} resources loaded")

    # ── 2. Census tract fallback for the rare missing tractId ─────────────────
    missing_tract = df["tractId"].isna()
    n_missing = missing_tract.sum()

    if n_missing > 0:
        print(f"\n  {n_missing} resources missing tractId — attempting censusgeocode fallback...")
        tract_cache = load_tract_cache()

        cur.execute('SELECT "tractId", "povertyIndex" FROM "CensusData"')
        census_map = {row[0]: row[1] for row in cur.fetchall()}

        resolved = 0
        for idx in df[missing_tract].index:
            lat = df.at[idx, "latitude"]
            lon = df.at[idx, "longitude"]
            geoid = geocode_tract(lat, lon, tract_cache)
            if geoid:
                df.at[idx, "tractId"] = geoid
                if geoid in census_map:
                    df.at[idx, "povertyIndex"] = census_map[geoid]
                    resolved += 1
            time.sleep(1)  # 1 req/sec rate limit

        save_tract_cache(tract_cache)
        print(f"  Resolved {resolved}/{n_missing} via censusgeocode")
    else:
        print("  All resources have tractId — no censusgeocode calls needed")

    cur.close()
    conn.close()

    # ── 3. Compute node features ──────────────────────────────────────────────
    print("\nComputing node features...")

    # --- resource_type (0/1/2) ---
    df["resource_type"] = df["resourceTypeId"].map(RESOURCE_TYPE_MAP).fillna(0).astype(int)

    # --- rating_normalized ---
    # Raw DB scale is 1–3. Divide by 3.0 to get [0.33, 1.0].
    # Impute nulls to dataset mean of non-null normalized values (~0.598 based on DB).
    df["ratingAverage"] = pd.to_numeric(df["ratingAverage"], errors="coerce")
    df["rating_normalized"] = df["ratingAverage"] / 3.0
    rating_mean = df["rating_normalized"].mean()  # computed from non-null values
    if pd.isna(rating_mean):
        rating_mean = 0.598  # fallback if somehow all null
    df["rating_normalized"] = df["rating_normalized"].fillna(rating_mean)

    # --- magnet_score ---
    df["magnet_score"] = df["tags"].apply(compute_magnet_score)

    # --- barrier_score ---
    df["barrier_score"] = df["tags"].apply(compute_barrier_score)

    # --- days_covered ---
    df["days_covered"] = df["shifts"].apply(compute_days_covered)

    # --- poverty_index ---
    df["povertyIndex"] = pd.to_numeric(df["povertyIndex"], errors="coerce")
    mean_poverty = df["povertyIndex"].mean()
    if pd.isna(mean_poverty):
        mean_poverty = 0.13  # national ACS5 approximate mean as hard fallback
    df["poverty_index"] = df["povertyIndex"].fillna(mean_poverty)

    # --- subscriber_normalized (log1p scale) ---
    df["subscriberCount"] = pd.to_numeric(df["subscriberCount"], errors="coerce").fillna(0)
    max_subs = df["subscriberCount"].max()
    df["subscriber_normalized"] = (
        np.log1p(df["subscriberCount"]) / np.log1p(max_subs)
        if max_subs > 0 else 0.0
    )

    # --- review_normalized (log1p scale) ---
    df["reviewCount"] = pd.to_numeric(df["reviewCount"], errors="coerce").fillna(0)
    max_reviews = df["reviewCount"].max()
    df["review_normalized"] = (
        np.log1p(df["reviewCount"]) / np.log1p(max_reviews)
        if max_reviews > 0 else 0.0
    )

    # --- confidence (already 0–1, no nulls in DB) ---
    df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce").fillna(0.5)

    # --- appointment_required (bool → 0/1 int, no nulls in DB) ---
    df["appointment_required"] = df["appointmentRequired"].astype(int)

    # ── 4. Assign node indices ────────────────────────────────────────────────
    df = df.reset_index(drop=True)
    df["node_idx"] = df.index

    # ── 5. Build spatial graph with BallTree (radius-first) ───────────────────
    print("\nBuilding spatial graph with BallTree (radius constraint)...")

    coords_rad = np.radians(df[["latitude", "longitude"]].values)
    tree = BallTree(coords_rad, metric="haversine")

    # Radius in radians — this is the primary edge constraint
    radius_rad = RADIUS_KM / EARTH_RADIUS

    # query_radius returns all neighbors within radius for each node
    indices_list, distances_list = tree.query_radius(
        coords_rad, r=radius_rad, return_distance=True, sort_results=True
    )

    edge_sources: list = []
    edge_targets: list = []
    edge_weights: list = []

    # Also count neighbors per node for gap_score computation
    neighbor_counts = np.zeros(len(df), dtype=int)

    for i in range(len(df)):
        neighbors_i = indices_list[i]
        # Count excludes self
        neighbor_counts[i] = len(neighbors_i) - 1  # -1 for self

        for j_pos, neighbor in enumerate(neighbors_i):
            if neighbor == i:
                continue  # skip self-loops

            dist_km = distances_list[i][j_pos] * EARTH_RADIUS
            weight = 1.0 / (dist_km + 0.01)  # inverse distance weighting

            edge_sources.append(i)
            edge_targets.append(int(neighbor))
            edge_weights.append(round(weight, 6))

    edges_df = pd.DataFrame({
        "source": edge_sources,
        "target": edge_targets,
        "weight": edge_weights,
    })

    # query_radius with bidirectional nature: each pair (i→j) and (j→i) are
    # both added naturally since we iterate all nodes. Deduplicate to be safe.
    edges_df = edges_df.drop_duplicates(subset=["source", "target"])

    # ── 6. Compute coverage gap score and bucket ──────────────────────────────
    print("\nComputing coverage gap scores...")

    # Store neighbor count as both a feature and a component of the label
    df["neighbor_count"] = neighbor_counts

    # Normalize neighbor_count for use as a feature (log1p scale)
    max_neighbors = df["neighbor_count"].max()
    df["neighbor_count_normalized"] = (
        np.log1p(df["neighbor_count"]) / np.log1p(max_neighbors)
        if max_neighbors > 0 else 0.0
    )

    # Gap score: high poverty + few neighbors = critical gap
    #   gap_score = poverty_index / (1 + neighbor_count_within_2km)
    df["gap_score"] = df["poverty_index"] / (1 + df["neighbor_count"])

    # Bucket into three tiers by percentile:
    #   0 = well-covered  (bottom 50%)
    #   1 = moderate gap   (50th–85th percentile)
    #   2 = critical gap   (top 15%)
    p50 = df["gap_score"].quantile(0.50)
    p85 = df["gap_score"].quantile(0.85)

    def assign_gap_bucket(score):
        if score <= p50:
            return 0
        elif score <= p85:
            return 1
        else:
            return 2

    df["gap_bucket"] = df["gap_score"].apply(assign_gap_bucket)

    print(f"  Gap score thresholds: p50={p50:.6f}, p85={p85:.6f}")
    print(f"  Class distribution:")
    for cls in [0, 1, 2]:
        count = (df["gap_bucket"] == cls).sum()
        pct = 100 * count / len(df)
        label = {0: "well-covered", 1: "moderate gap", 2: "critical gap"}[cls]
        print(f"    Class {cls} ({label}): {count} ({pct:.1f}%)")

    # ── 7. Save CSVs ──────────────────────────────────────────────────────────
    print("\nSaving output files...")

    node_cols = [
        "node_idx", "resource_id", "latitude", "longitude",
        "resource_type",
        "rating_normalized",
        "magnet_score",
        "barrier_score",
        "days_covered",
        "poverty_index",
        "subscriber_normalized",
        "review_normalized",
        "confidence",
        "appointment_required",
        "neighbor_count_normalized",
        "gap_score",
        "gap_bucket",
    ]
    nodes_out = df[node_cols].copy()
    nodes_path = ML_DIR / "nodes.csv"
    nodes_out.to_csv(nodes_path, index=False)
    print(f"  Saved {nodes_path} ({len(nodes_out)} nodes)")

    edges_path = ML_DIR / "edges.csv"
    edges_df.to_csv(edges_path, index=False)
    print(f"  Saved {edges_path} ({len(edges_df)} edges)")

    # ── 8. Summary ────────────────────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print(f"  Total nodes:           {len(df)}")
    print(f"  Total edges:           {len(edges_df)}")
    print(f"  ALL nodes are labeled  (gap_bucket is computable for every node)")

    class_dist = df["gap_bucket"].value_counts().sort_index()
    total = len(df)
    print(f"\n  Class distribution:")
    for cls, count in class_dist.items():
        pct = 100 * count / total
        label_name = {0: "well-covered", 1: "moderate gap", 2: "critical gap"}
        print(f"    Class {int(cls)} ({label_name.get(int(cls), '?')}): {count} ({pct:.1f}%)")
    print(f"\n  Class weights for CrossEntropyLoss (total / (3 × class_count)):")
    for cls, count in class_dist.items():
        weight = total / (3 * count)
        print(f"    Class {int(cls)}: {weight:.3f}")

    print(f"\n  Feature coverage (% of nodes with non-imputed values):")
    coverage_checks = {
        "rating_normalized":          ("ratingAverage",            None),
        "magnet_score":               (None,                       "magnet_score > 0"),
        "barrier_score":              (None,                       "barrier_score > 0"),
        "days_covered":               (None,                       "days_covered > 0"),
        "poverty_index":              ("povertyIndex",             None),
        "subscriber_normalized":      ("subscriberCount",          None),
        "review_normalized":          ("reviewCount",              None),
        "confidence":                 ("confidence",               None),
        "appointment_required":       (None,                       "appointment_required == 1"),
        "neighbor_count_normalized":  (None,                       "neighbor_count > 0"),
    }
    for feat, (raw_col, expr) in coverage_checks.items():
        if raw_col is not None:
            n = df[raw_col].notna().sum() if raw_col in df.columns else 0
        else:
            n = df.eval(expr).sum()
        pct = 100 * n / len(df)
        print(f"    {feat:<30} {n:>5} / {len(df)} ({pct:.1f}%)")

    if len(edges_df) > 0:
        edges_per_node = edges_df.groupby("source").size()
        isolated = len(df) - edges_df["source"].nunique()
        print(f"\n  Avg edges/node:        {edges_per_node.mean():.1f}")
        print(f"  Median edges/node:     {edges_per_node.median():.0f}")
        print(f"  Max edges/node:        {edges_per_node.max()}")
        print(f"  Isolated nodes (0 edges): {isolated}")

    print(f"\n  Gap score stats:")
    print(f"    Min:    {df['gap_score'].min():.6f}")
    print(f"    Mean:   {df['gap_score'].mean():.6f}")
    print(f"    Median: {df['gap_score'].median():.6f}")
    print(f"    Max:    {df['gap_score'].max():.6f}")

    print(f"{'─' * 60}")
    print("\nDone! Run train_GNN.py next.")


if __name__ == "__main__":
    main()
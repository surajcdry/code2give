"""
cluster_archetypes.py
Lemon-Aid — Phase 3: Resource Archetype Clustering

Takes the 32-dim GNN embeddings from predictions.csv, runs K-means to find
natural groupings, characterizes each cluster by mean feature values, names
each archetype, and writes the result back to the Resource table.

Output per resource:
    archetypeId   — integer 0..K-1
    archetypeName — human-readable label e.g. "Critical Desert"

The archetypes are structurally defined — two resources in the same archetype
have similar poverty context, neighborhood density, service profile, and 2-hop
graph environment, even if they're in different cities.

Run:
    cd ml
    python cluster_archetypes.py

Optional: change K below to experiment with different numbers of archetypes.

Prerequisites:
    - build_features.py and train_gnn.py have been run
    - ml/predictions.csv and ml/nodes.csv exist
    - .env.local at project root contains DIRECT_URL
"""

import os
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

DB_URL    = os.getenv("DIRECT_URL", "").strip('"')
ML_DIR    = Path(__file__).resolve().parent

K          = 5      # number of archetypes — change this to experiment
BATCH_SIZE = 500
RANDOM_STATE = 42

PREDICTIONS_PATH = ML_DIR / "predictions.csv"
NODES_PATH       = ML_DIR / "nodes.csv"

EMB_COLS = [f"emb_{i}" for i in range(32)]

# Features used to characterize and name each cluster after K-means.
# These are NOT inputs to K-means — K-means only sees the embeddings.
CHAR_COLS = [
    "poverty_index",
    "neighbor_count_normalized",
    "gap_score",
    "barrier_score",
    "magnet_score",
    "days_covered",
    "predicted_bucket",
]


# ── Archetype naming heuristic ────────────────────────────────────────────────

def name_archetype(row: pd.Series, gap_p50: float, gap_p75: float, poverty_median: float) -> str:
    """
    Assign a human-readable name to a cluster based on its mean feature values.

    Decision logic (in priority order):
        1. Very high gap + low density            → Critical Desert
        2. Very high gap + some density           → Stressed Hub
        3. Moderate gap + meaningful poverty      → Fragile Sole Provider
        4. Moderate gap + low poverty             → Low-Need Isolated
        5. Low gap + high density + high poverty  → Urban Core Cluster
        6. Low gap + high density + low poverty   → Well-Served Suburban
        7. Otherwise                              → Well-Served Area

    Poverty median is used in step 5/6 to split the two dense-cluster types,
    preventing two clusters from receiving the same name.
    """
    gap     = row["gap_score"]
    density = row["neighbor_count_normalized"]
    poverty = row["poverty_index"]

    if gap >= gap_p75:
        if density < 0.25:
            return "Critical Desert"
        else:
            return "Stressed Hub"
    elif gap >= gap_p50:
        if poverty >= 0.10:
            return "Fragile Sole Provider"
        else:
            return "Low-Need Isolated"
    else:
        if density >= 0.40:
            if poverty >= poverty_median:
                return "Urban Core Cluster"
            else:
                return "Well-Served Suburban"
        else:
            return "Well-Served Area"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # ── 1. Load data ──────────────────────────────────────────────────────────
    print("Loading predictions.csv and nodes.csv...")

    preds = pd.read_csv(PREDICTIONS_PATH)
    nodes = pd.read_csv(NODES_PATH)

    missing_emb = [c for c in EMB_COLS if c not in preds.columns]
    if missing_emb:
        raise ValueError(
            f"Missing embedding columns in predictions.csv: {missing_emb[:5]}...\n"
            "Re-run train_gnn.py to regenerate predictions.csv."
        )

    # Merge embeddings with node features on resource_id.
    # gap_score and predicted_bucket already come from preds — exclude them from
    # the nodes side to avoid pandas renaming them to gap_score_x / gap_score_y.
    node_char_cols = [c for c in CHAR_COLS if c not in ("predicted_bucket", "gap_score")]
    df = preds[["resource_id", "predicted_bucket", "gap_score", "prob_class2"] + EMB_COLS].merge(
        nodes[["resource_id"] + node_char_cols],
        on="resource_id",
        how="left",
    )

    print(f"  {len(df)} resources loaded")

    # ── 2. K-means on embeddings ──────────────────────────────────────────────
    print(f"\nRunning K-means with K={K}...")

    X = df[EMB_COLS].values

    # StandardScaler normalizes each embedding dimension to zero mean, unit variance.
    # K-means uses Euclidean distance, so unscaled dimensions with larger ranges
    # would dominate the clustering. Scaling ensures all 32 dims contribute equally.
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=K, init="k-means++", n_init=20, random_state=RANDOM_STATE)
    df["cluster_id"] = kmeans.fit_predict(X_scaled)

    inertia = kmeans.inertia_
    print(f"  Inertia: {inertia:.1f}  (lower = tighter clusters)")

    # ── 3. Characterize clusters ──────────────────────────────────────────────
    print("\nCluster characterization (mean values per cluster):")

    cluster_means = df.groupby("cluster_id")[CHAR_COLS].mean()

    gap_p50      = df["gap_score"].quantile(0.50)
    gap_p75      = df["gap_score"].quantile(0.75)
    poverty_median = df["poverty_index"].median()

    cluster_means["archetype_name"] = cluster_means.apply(
        lambda row: name_archetype(row, gap_p50, gap_p75, poverty_median), axis=1
    )

    # Sort by gap_score descending so most critical archetypes print first
    cluster_means_sorted = cluster_means.sort_values("gap_score", ascending=False)

    header = (
        f"\n  {'Cluster':>7}  {'Archetype':<24}  {'Size':>5}  "
        f"{'Poverty':>8}  {'Density':>8}  {'GapScore':>9}  "
        f"{'Barrier':>8}  {'Magnet':>7}  {'Days':>5}"
    )
    print(header)
    print("  " + "-" * (len(header) - 2))

    cluster_sizes = df["cluster_id"].value_counts()
    for cid, row in cluster_means_sorted.iterrows():
        size = cluster_sizes[cid]
        print(
            f"  {cid:>7}  {row['archetype_name']:<24}  {size:>5}  "
            f"  {row['poverty_index']:>6.3f}  {row['neighbor_count_normalized']:>8.3f}  "
            f"  {row['gap_score']:>7.4f}  {row['barrier_score']:>8.3f}  "
            f"{row['magnet_score']:>7.3f}  {row['days_covered']:>5.2f}"
        )

    # ── 4. Map cluster_id → stable archetype_id ordered by gap_score desc ─────
    # Reindex so archetype_id=0 is always the most critical cluster.
    # This makes the ordering stable across reruns.
    ordered_clusters = cluster_means_sorted.index.tolist()
    cluster_to_archetype = {cid: aid for aid, cid in enumerate(ordered_clusters)}

    df["archetype_id"]   = df["cluster_id"].map(cluster_to_archetype)
    df["archetype_name"] = df["archetype_id"].map(
        {aid: cluster_means_sorted.loc[cid, "archetype_name"]
         for cid, aid in cluster_to_archetype.items()}
    )

    print(f"\nArchetype ID mapping (0 = most critical):")
    for cid, aid in cluster_to_archetype.items():
        name = cluster_means_sorted.loc[cid, "archetype_name"]
        size = cluster_sizes[cid]
        print(f"  archetypeId={aid} → {name} ({size} resources, cluster {cid})")

    # ── 5. Write to database ──────────────────────────────────────────────────
    if not DB_URL:
        print("\nDIRECT_URL not set — skipping database write.")
        print("Results are in-memory only. Set DIRECT_URL in .env.local to write to DB.")
        return

    print(f"\nConnecting to database...")
    conn = psycopg2.connect(DB_URL)
    cur  = conn.cursor()

    # Add columns if they don't exist (idempotent)
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Resource' AND column_name = 'archetypeId'
            ) THEN
                ALTER TABLE "Resource" ADD COLUMN "archetypeId" INTEGER;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Resource' AND column_name = 'archetypeName'
            ) THEN
                ALTER TABLE "Resource" ADD COLUMN "archetypeName" TEXT;
            END IF;
        END $$;
    """)
    conn.commit()
    print("  Columns ready (archetypeId, archetypeName)")

    # Batch update
    update_data = [
        (int(row["archetype_id"]), row["archetype_name"], row["resource_id"])
        for _, row in df.iterrows()
    ]

    print(f"  Writing archetypes to {len(update_data)} resources...")
    execute_batch(
        cur,
        'UPDATE "Resource" SET "archetypeId" = %s, "archetypeName" = %s WHERE id = %s',
        update_data,
        page_size=BATCH_SIZE,
    )
    conn.commit()

    # Verify
    cur.execute("""
        SELECT "archetypeName", COUNT(*) as n
        FROM "Resource"
        WHERE "archetypeName" IS NOT NULL
        GROUP BY "archetypeName"
        ORDER BY n DESC
    """)
    db_dist = cur.fetchall()
    print(f"\n  Distribution in database:")
    for name, count in db_dist:
        print(f"    {name:<24} {count:>5}")

    cur.close()
    conn.close()

    print(f"\nDone! archetypeId and archetypeName are now available on the Resource table.")
    print(f"Query example:")
    print(f'  SELECT id, name, "archetypeId", "archetypeName"')
    print(f'  FROM "Resource"')
    print(f'  WHERE "archetypeName" = \'Critical Desert\'')
    print(f'  ORDER BY "gnnScore" DESC LIMIT 10;')


if __name__ == "__main__":
    main()

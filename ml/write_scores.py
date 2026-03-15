"""
write_scores.py
Lemon-Aid — Phase 3: Write GNN Scores Back to Supabase

Reads predictions.csv and writes the prob_class2 value (probability of
being a critical coverage gap) as gnnScore on the Resource table.

This allows the dashboard to query and visualize GNN scores without
needing to join against a separate predictions table.

Run:
    cd ml
    python write_scores.py

Prerequisite:
    - build_features.py and train_GNN.py have been run
    - ml/predictions.csv exists with resource_id and prob_class2 columns
    - .env.local at project root contains DIRECT_URL
"""

import os
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env.local")

DB_URL = os.getenv("DIRECT_URL", "").strip('"')
ML_DIR = Path(__file__).resolve().parent
PREDICTIONS_PATH = ML_DIR / "predictions.csv"

BATCH_SIZE = 500  # rows per execute_batch call


def main():
    if not DB_URL:
        raise EnvironmentError("DIRECT_URL not set in .env.local")

    if not PREDICTIONS_PATH.exists():
        raise FileNotFoundError(
            f"{PREDICTIONS_PATH} not found. Run build_features.py and train_GNN.py first."
        )

    # ── 1. Load predictions ───────────────────────────────────────────────────
    print("Loading predictions.csv...")
    df = pd.read_csv(PREDICTIONS_PATH)

    required_cols = ["resource_id", "prob_class2"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in predictions.csv: {missing}")

    print(f"  {len(df)} predictions loaded")
    print(f"  prob_class2 range: [{df['prob_class2'].min():.4f}, {df['prob_class2'].max():.4f}]")
    print(f"  prob_class2 mean:  {df['prob_class2'].mean():.4f}")

    # ── 2. Connect to database ────────────────────────────────────────────────
    print("\nConnecting to database...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # ── 3. Add gnnScore column if it doesn't exist (idempotent) ───────────────
    print("Ensuring gnnScore column exists on Resource table...")
    cur.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'Resource' AND column_name = 'gnnScore'
            ) THEN
                ALTER TABLE "Resource" ADD COLUMN "gnnScore" DOUBLE PRECISION;
            END IF;
        END $$;
    """)
    conn.commit()
    print("  Column ready")

    # ── 4. Batch update all resources with their GNN score ────────────────────
    print(f"\nWriting gnnScore to {len(df)} resources (batch size {BATCH_SIZE})...")

    update_data = [
        (float(row["prob_class2"]), row["resource_id"])
        for _, row in df.iterrows()
    ]

    execute_batch(
        cur,
        'UPDATE "Resource" SET "gnnScore" = %s WHERE id = %s',
        update_data,
        page_size=BATCH_SIZE,
    )
    conn.commit()

    # ── 5. Verify ─────────────────────────────────────────────────────────────
    cur.execute('SELECT COUNT(*) FROM "Resource" WHERE "gnnScore" IS NOT NULL')
    updated_count = cur.fetchone()[0]

    cur.execute("""
        SELECT MIN("gnnScore"), AVG("gnnScore"), MAX("gnnScore")
        FROM "Resource"
        WHERE "gnnScore" IS NOT NULL
    """)
    min_score, avg_score, max_score = cur.fetchone()

    print(f"\n  Updated {updated_count} resources with gnnScore")
    print(f"  Score range: [{min_score:.4f}, {max_score:.4f}]")
    print(f"  Score mean:  {avg_score:.4f}")

    # Show top-5 highest scores
    cur.execute("""
        SELECT id, name, city, state, "gnnScore"
        FROM "Resource"
        WHERE "gnnScore" IS NOT NULL
        ORDER BY "gnnScore" DESC
        LIMIT 5
    """)
    top5 = cur.fetchall()
    print(f"\n  Top 5 highest-priority resources (by gnnScore):")
    for i, (rid, name, city, state, score) in enumerate(top5, 1):
        loc = f"{city}, {state}" if city and state else (city or state or "?")
        display_name = (name[:40] + "...") if name and len(name) > 43 else (name or "Unknown")
        print(f"    {i}. {display_name} ({loc}) — gnnScore={score:.4f}")

    cur.close()
    conn.close()

    print(f"\nDone! gnnScore is now available on the Resource table.")
    print(f"Query example: SELECT id, name, \"gnnScore\" FROM \"Resource\" ORDER BY \"gnnScore\" DESC LIMIT 20;")


if __name__ == "__main__":
    main()

# Lemon-Aid ML — Graph Neural Network

Identifies **coverage gaps** in food access nationwide using a GraphSAGE model
trained on spatial neighborhood context and resource features.

For each food resource we compute a **coverage gap score**:
```
gap_score = poverty_index / (1 + neighbor_count_within_2km)
```

High score = high-poverty neighborhood with few nearby food options. The GNN
learns to predict which tier each resource falls into by aggregating features
from its spatial neighbors — capturing the structural coverage landscape that
individual features alone cannot express.

**Demo story**: *"We identify where a single new pantry would have the highest
impact on food access."*

---

## What are nodes and edges in this context?

### Nodes
Each **node is one food resource** — a food pantry, soup kitchen, or community
fridge — published in the Lemontree database. A node represents a real physical
location where people go to get food. Each node carries an 11-dimensional feature
vector describing the resource (what it offers, how accessible it is, what
neighborhood it sits in, how many neighbors it has).

### Edges
Each **edge connects two nearby resources**. Two nodes get an edge if they are
within **2 km of each other** (roughly a 25-minute walk). The edge weight is
inversely proportional to distance — closer resources have stronger connections.

Edges capture the real-world dynamic of **coverage**: if an area has many closely
clustered pantries, each one contributes to serving the neighborhood's need.
If a pantry is isolated with no neighbors within 2km, it must bear the burden
alone. The GNN uses edges to learn that a high-poverty node surrounded by other
pantries is better covered than an identical node with no neighbors.

Edges are **bidirectional** — if A influences B, B also influences A.

---

## Scripts

### 1. `build_features.py`
Queries the database, computes all node features, builds the spatial graph,
computes coverage gap scores, and writes `nodes.csv` and `edges.csv`.

```bash
cd ml
python build_features.py
```

**Inputs:** Supabase PostgreSQL (via `DIRECT_URL` in `.env.local`)
**Outputs:** `ml/nodes.csv`, `ml/edges.csv`, `ml/tract_cache.json`

### 2. `train_GNN.py`
Loads `nodes.csv` and `edges.csv`, trains a GraphSAGE model for 3-class coverage
gap prediction, and writes the trained model and predictions.

```bash
cd ml
python train_GNN.py
```

**Inputs:** `ml/nodes.csv`, `ml/edges.csv`
**Outputs:** `ml/lemontree_gnn_v1.pth`, `ml/predictions.csv`, `ml/output/training_log.o`

### 3. `write_scores.py`
Reads `predictions.csv` and writes the `prob_class2` value (probability of being
a critical coverage gap) as `gnnScore` on the Resource table in Supabase.

```bash
cd ml
python write_scores.py
```

**Inputs:** `ml/predictions.csv`, Supabase PostgreSQL
**Outputs:** `gnnScore` column on the `Resource` table

---

## Output files

### `nodes.csv`
One row per food resource.

| Column | Description |
|--------|-------------|
| `node_idx` | Integer index (0-based), used as row reference in `edges.csv` |
| `resource_id` | Original Lemontree resource ID (string) |
| `latitude`, `longitude` | Coordinates |
| `resource_type` | 0=Food Pantry, 1=Soup Kitchen, 2=Community Fridge |
| `rating_normalized` | Community rating / 3.0. Nulls → dataset mean (~0.598) |
| `magnet_score` | Fraction of high-demand offering tags present |
| `barrier_score` | Fraction of access-restriction requirement tags present |
| `days_covered` | Unique days of scheduled service / 7 |
| `poverty_index` | ACS5 census tract poverty rate (0–1) |
| `subscriber_normalized` | log1p(subscribers) / log1p(max subscribers) |
| `review_normalized` | log1p(reviews) / log1p(max reviews) |
| `confidence` | Lemontree data quality score (0–1, no nulls) |
| `appointment_required` | 1 if appointment required, 0 otherwise |
| `neighbor_count_normalized` | log1p(neighbors within 2km) / log1p(max) — spatial density |
| `gap_score` | `poverty_index / (1 + neighbor_count)` — raw coverage gap |
| `gap_bucket` | Training label: 0=well-covered (bottom 50%), 1=moderate gap (50–85%), 2=critical gap (top 15%) |

### `edges.csv`
One row per directed edge (bidirectional pairs).

| Column | Description |
|--------|-------------|
| `source` | `node_idx` of the source node |
| `target` | `node_idx` of the target node |
| `weight` | `1 / (dist_km + 0.01)` — higher weight = closer neighbors |

### `predictions.csv`
One row per node after training. Key columns:

| Column | Description |
|--------|-------------|
| `resource_id` | Lemontree resource ID |
| `predicted_bucket` | Model's predicted class (0, 1, or 2) |
| `confidence` | Max class probability |
| `gap_score` | Raw coverage gap score |
| `prob_class0` | Probability of well-covered |
| `prob_class1` | Probability of moderate gap |
| `prob_class2` | **Probability of critical gap — this is `gnnScore`** |
| `emb_0` … `emb_31` | 32-dim embeddings for clustering/UMAP |

### `lemontree_gnn_v1.pth`
Saved PyTorch model weights with metadata.

### `tract_cache.json`
Cache of census tract geocode lookups. Safe to delete.

---

## Node features (11 dimensions)

| # | Feature | Range | What it captures |
|---|---------|-------|-----------------|
| 1 | `resource_type` | 0 / 1 / 2 | Type of resource (pantry / soup kitchen / community fridge) |
| 2 | `rating_normalized` | 0.33–1.0 | Community satisfaction (1–3 stars / 3) |
| 3 | `magnet_score` | 0–0.5 | Fraction of high-draw offering tags: fresh produce, client choice, halal, kosher, delivery, diapers |
| 4 | `barrier_score` | 0–0.8 | Fraction of access-restriction tags: ID, registration, proof of income/address, referral |
| 5 | `days_covered` | 0–1 | Unique scheduled weekdays / 7 |
| 6 | `poverty_index` | 0–1 | ACS5 census tract poverty rate |
| 7 | `subscriber_normalized` | 0–1 | Log-normalized active followers |
| 8 | `review_normalized` | 0–1 | Log-normalized total reviews |
| 9 | `confidence` | 0–1 | Lemontree data completeness score |
| 10 | `appointment_required` | 0 / 1 | Whether appointment is required |
| 11 | `neighbor_count_normalized` | 0–1 | Log-normalized count of pantries within 2km — spatial density |

---

## Coverage gap label

```
gap_score = poverty_index / (1 + neighbor_count_within_2km)
```

Bucketed by percentile:
- **Class 0** — Well-covered (bottom 50% of gap scores)
- **Class 1** — Moderate gap (50th–85th percentile)
- **Class 2** — Critical gap (top 15%)

All nodes are labeled — no unlabeled/masked nodes in training.

**Why this is a genuine graph problem**: The label depends on how many neighbors
a node has, and the GNN aggregates features FROM those neighbors. A pantry's
coverage status is determined not just by its own poverty index, but by the
density and characteristics of surrounding pantries — exactly what message
passing captures.

---

## Inference on a new resource

When Lemontree adds a new pantry:

1. Compute its 11 feature values using the same logic as `build_features.py`
2. Find its neighbors: run Haversine distance against all existing node coordinates,
   keep nodes within 2km
3. Run a **forward pass only** through the loaded model — no retraining needed
4. The model returns a 3-class probability distribution; `prob_class2` is the
   GNN coverage gap score

This is the key property of GraphSAGE (inductive learning): the model learns an
aggregation function, not fixed per-node embeddings, so it generalizes to nodes
it has never seen.
# Lemon-Aid ML — Graph Neural Network

## What this GNN does and why it matters

A standard poverty map tells you *where people are struggling*. It does not tell
you whether food resources already exist in those areas, how many people each one
is absorbing, or whether a neighborhood is genuinely isolated or simply clustered
near resources that are already overwhelmed.

Acting on a raw poverty index leads to misallocated resources: you open a new
pantry next to three existing ones, or you miss an entire community because its
poverty rate is moderate but its nearest pantry is 15 km away with a two-hour
wait. Neither case is visible on a choropleth.

This GNN solves that problem by learning the *structural coverage landscape* — the
relationship between poverty, resource density, access barriers, and neighborhood
context — simultaneously for every food resource in the Lemontree database.

**The key insight** is that "how covered is this area" is inherently a graph
problem. A pantry's coverage status depends not just on its own poverty index but
on the density and characteristics of surrounding pantries. That structural signal
is exactly what GraphSAGE's message passing captures — each node aggregates
features from its 2-hop neighborhood, producing an embedding that encodes whether
it is truly isolated or merely adjacent to saturated coverage.

The model outputs two things per resource:

1. **`gnnScore`** — the probability that a resource sits in a genuinely
   underserved neighborhood (`prob_class2`, written to the `Resource` table).
   Range 0–1; higher = more critical.

2. **32-dim embeddings** — a learned representation of each resource's structural
   position in the food-access graph. These are fed into K-means clustering
   (`cluster_archetypes.py`) to assign every resource one of five named archetypes.

The archetypes are the GNN's most actionable output. Two resources can share a
high poverty index and a high gap score but belong to completely different
archetypes — and therefore require completely different interventions.

---

## Archetype insight table

Five archetypes (or Resource Profiles) are produced by K-means (`K=5`) on the GNN embeddings. They are
ordered by gap severity (`archetypeId` 0 = most critical) and rendered on the map
with a fixed color per archetype.

| `archetypeId` | Archetype | Color | Poverty Index alone | What the GNN actually reveals |
|---|---|---|---|---|
| 0 | **Critical Desert** | `#6A1B9A` purple | Shows as "high need" | Poor area, genuinely unserved — **open resources here** |
| 1 | **Stressed Hub** | `#C62828` dark red | Invisible | Resources exist but are overwhelmed — **expand capacity, not count** |
| 2 | **Quietly Underserved** | `#F9A825` amber | Shows as "low priority" | Moderate poverty with access barriers — may still need help |
| 3 | **Dense & Covered** | `#1565C0` blue | Shows as "high need" | Poor area, but already well-served — don't over-invest |
| 4 | **Stable & Covered** | `#2E7D32` green | Low | Low poverty, dense coverage — lowest intervention priority |

### The most actionable split: Critical Desert vs. Urban Core Cluster

Both archetypes appear "high need" on a poverty map. The difference is density:

- A **Critical Desert** has high poverty and few or no pantries nearby. A single
  new pantry here is the highest-leverage move in the entire dataset.
- A **Dense & Covered** (also known as Urban Core Cluster) has high poverty but is already dense with resources.
  Sending another pantry there is wasted capacity — the structural problem has
  already been addressed.

The GNN learns to distinguish these because it aggregates each node's features
across its 2-hop neighborhood. A resource in a Critical Desert will have neighbors
that are also isolated, producing a structurally different 32-dim embedding than a
resource embedded in a dense, well-served cluster. That distinction is invisible
to any single-node metric.

### Stressed Hub — the signal most relevant to Lemon-Aid specifically

A **Stressed Hub** scores high on both gap and density: it is surrounded by other
resources, but all of them are in high-poverty areas and collective capacity is
insufficient. These are pantries that are structurally overburdened — not absent.

For Lemontree this is a direct operational signal. Stressed Hub resources are not
gaps to fill with new pantries; they are existing partners that need capacity
support — longer hours, satellite sites, or subscriber growth campaigns. `gnnScore`
alone would not surface them; the archetype does.

---

## Pipeline

Run in this order:

```
seed_census.py        → Seeds CensusData table from ACS5 2022 API (one-time)
enrich_resources.py   → Geocodes resources, writes tractId to Supabase (one-time)
build_features.py     → Queries DB, computes features, builds graph → nodes.csv + edges.csv
train_gnn.py          → Trains GraphSAGE → lemontree_gnn_v1.pth + predictions.csv
write_scores.py       → Writes prob_class2 as gnnScore on Resource table
cluster_archetypes.py → K-means on embeddings → writes archetypeId + archetypeName to Resource table
```

```bash
cd ml
pip install -r requirements.txt

# One-time data seeding (skip if CensusData and tractId are already populated)
python seed_census.py
python enrich_resources.py

# Regenerate graph data
python build_features.py

# Train
python train_GNN.py

# Write results back to DB
python write_scores.py
python cluster_archetypes.py
```

CUDA is used automatically if available; falls back to CPU otherwise.

---

## Graph construction

### Nodes
Each node is one published food resource (Food Pantry, Soup Kitchen, or Community
Fridge) in the Lemontree database. Every node carries a 10-dimensional feature
vector (see below).

### Edges
Two nodes are connected if they are within **2 km** of each other
(roughly a 25-minute walk). Edge weight = `1 / (dist_km + 0.01)` — closer
resources have stronger connections. Edges are bidirectional. The spatial graph
is built using a `BallTree` with Haversine metric in `build_features.py`.

### Label
```
gap_score = poverty_index / (1 + neighbor_count_within_2km)
```

| Bucket | Percentile | Meaning |
|---|---|---|
| 0 | Bottom 50% | Well-covered |
| 1 | 50th–85th | Moderate gap |
| 2 | Top 15% | Critical gap |

All nodes are labeled — `gap_score` is computable for every resource. Stratified
80/20 train/val split ensures the rarer critical gap class appears proportionally
in both sets.

`neighbor_count_normalized` appears in `nodes.csv` but is **excluded from the
training features** (`FEATURE_COLS` in `train_gnn.py`) to prevent data leakage —
the label formula uses the raw neighbor count directly.

---

## Node features (10 active dimensions)

| # | Feature | Range | Description |
|---|---|---|---|
| 1 | `resource_type` | 0 / 1 / 2 | 0=Food Pantry, 1=Soup Kitchen, 2=Community Fridge |
| 2 | `rating_normalized` | 0.33–1.0 | `ratingAverage / 3.0`; nulls filled with dataset mean |
| 3 | `magnet_score` | 0–0.5 | Fraction of high-draw OFFERING tags (fresh produce, client choice, halal, kosher, delivery, diapers) |
| 4 | `barrier_score` | 0–0.8 | Fraction of access-restriction REQUIREMENT tags (ID, registration, proof of income/address, referral) |
| 5 | `days_covered` | 0–1 | Unique scheduled weekdays / 7 |
| 6 | `poverty_index` | 0–1 | ACS5 2022 census tract poverty rate |
| 7 | `subscriber_normalized` | 0–1 | `log1p(subscribers) / log1p(max)` |
| 8 | `review_normalized` | 0–1 | `log1p(reviews) / log1p(max)` |
| 9 | `confidence` | 0–1 | Lemontree data quality score (no nulls) |
| 10 | `appointment_required` | 0 / 1 | 1 if appointment required |

---

## Model architecture

```
Input (N × 10)
      │
      ▼
SAGEConv(10 → 64)  + ReLU + Dropout(0.3)   ← 1-hop neighborhood summary
      │
      ▼
SAGEConv(64 → 32)  + ReLU                  ← 2-hop neighborhood summary
      │
      ├──── embeddings (N × 32)  →  saved to predictions.csv, used for archetype clustering
      │
      ▼
Linear(32 → 3)                              ← gap class logits
      │
      ▼
CrossEntropyLoss (inverse-frequency class weights)
```

**GraphSAGE aggregation** — at each SAGEConv layer, for node v:

$h_{v_{new}} = W \cdot CONCAT(h_v, MEAN({h_u : u \in neighbors(v)}))$

After Layer 1 each node encodes its own features plus a summary of its 1-hop
neighbors. After Layer 2 it encodes 2-hop context (neighbors-of-neighbors). This
is why the model distinguishes Critical Deserts from Dense & Covered: a
pantry whose neighbors are also isolated produces a fundamentally different
embedding than one embedded in a dense, active cluster.

**Inductive inference** — because GraphSAGE learns an aggregation function rather
than per-node embeddings, new resources can be scored without retraining. Compute
their 10 features, find their spatial neighbors within 2 km, and run a forward
pass through the loaded checkpoint.

### Training config

| Parameter | Value |
|---|---|
| Optimizer | Adam, lr=0.01, weight\_decay=5e-4 |
| Epochs | 300 (best checkpoint saved by val F1 macro) |
| Split | Stratified 80/20 train/val |
| Dropout | 0.3 (Layer 1 only) |
| Class weights | ~0.67 (well-covered) / ~0.95 (moderate) / ~2.22 (critical) |

Class weights prevent the model from collapsing to always predicting the majority
class (~50% of nodes are Class 0).

### Training results (last run)

Best checkpoint: **epoch 164, val F1 macro = 0.8849**

```
 Epoch   Val F1   F1 per class [well-covered, moderate, critical]
     1   0.3590   [0.742  0.335  0.000]
    50   0.7102   [0.836  0.608  0.686]
   100   0.8372   [0.892  0.774  0.846]
   150   0.8703   [0.907  0.825  0.879]
   170   0.8819   [0.906  0.836  0.904]
   300   0.8725   [0.913  0.830  0.874]
```

Full per-epoch log: `output/training_log.o`

---

## Outputs

### `nodes.csv`
One row per food resource.

| Column | Description |
|---|---|
| `node_idx` | Integer index (0-based) used as row reference in `edges.csv` |
| `resource_id` | Lemontree resource ID |
| `latitude`, `longitude` | Coordinates |
| *(feature columns)* | See feature table above |
| `neighbor_count_normalized` | Spatial density — in `nodes.csv` but excluded from training features |
| `gap_score` | Raw computed gap score |
| `gap_bucket` | Training label (0 / 1 / 2) |

### `edges.csv`
One row per directed edge (bidirectional pairs).

| Column | Description |
|---|---|
| `source` | `node_idx` of source node |
| `target` | `node_idx` of target node |
| `weight` | `1 / (dist_km + 0.01)` |

### `predictions.csv`
One row per resource, output after training.

| Column | Description |
|---|---|
| `resource_id` | Lemontree resource ID |
| `predicted_bucket` | 0 / 1 / 2 (well-covered / moderate / critical gap) |
| `confidence` | Max softmax probability for the predicted class |
| `gap_score` | Raw coverage gap score |
| `prob_class0/1/2` | Per-class probabilities |
| `emb_0` … `emb_31` | 32-dim embedding used for archetype clustering |

`prob_class2` is the value written to `Resource.gnnScore` by `write_scores.py`.

### `lemontree_gnn_v1.pth`
Saved checkpoint from the best epoch. Includes model weights, the active
`FEATURE_COLS` list, architecture config, and class names — everything needed
to reload and run inference without retraining.

### `Resource` table fields (after running write scripts)

| Field | Script | Description |
|---|---|---|
| `gnnScore` | `write_scores.py` | Probability of critical coverage gap (0–1) |
| `archetypeId` | `cluster_archetypes.py` | Integer 0–4, ordered by gap severity (0 = most critical) |
| `archetypeName` | `cluster_archetypes.py` | Human-readable label e.g. "Critical Desert" |

---

## Archetype clustering

`cluster_archetypes.py` runs K-means (`K=5`) on the 32-dim embeddings after
`StandardScaler` normalization. K-means uses Euclidean distance on the embedding
space — scaling ensures all 32 dimensions contribute equally.

Each cluster is characterized by its mean `poverty_index`,
`neighbor_count_normalized`, `gap_score`, `barrier_score`, `magnet_score`, and
`days_covered`. A priority-ordered decision tree assigns one of the five names:

```
gap ≥ p75  AND  density < 0.25               →  Critical Desert
gap ≥ p75  AND  density ≥ 0.25               →  Stressed Hub
gap ≥ p50                                    →  Low-Need Isolated
gap < p50  AND  density ≥ 0.40  AND  poverty ≥ median  →  Urban Core Cluster
otherwise                                    →  Well-Served Suburban
```

`archetypeId=0` is always the cluster with the highest mean gap score, making
the ordering and color assignments stable across reruns. The frontend keyed
on the integer ID and name are defined in `constants.ts` (`ARCHETYPE_LEGEND`,
`ARCHETYPE_COLORS`, `ARCHETYPE_DOT_COLORS`). Do not rename archetypes without
updating both.

---

## Inference on a new resource

When Lemontree adds a new pantry:

1. Compute its 10 feature values using the same logic as `build_features.py`
2. Find its neighbors: Haversine distance against all existing node coordinates,
   keep nodes within 2 km
3. Run a forward pass through the loaded checkpoint — no retraining needed
4. `prob_class2` is the GNN coverage gap score; the 32-dim embedding can be
   compared against existing cluster centroids to assign an archetype

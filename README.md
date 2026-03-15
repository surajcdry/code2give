# Lemontree InsightEngine

**Morgan Stanley Code to Give Hackathon — Track B, Team 9**

A full-stack, multi-stakeholder data intelligence platform that transforms raw food access data into actionable decisions. Built for [Lemontree](https://www.lemontree.org), the platform helps nonprofits, donors, government agencies, and community members understand not just *where* food resources exist, but *why* people struggle to access them — and what to do about it.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Core Features](#core-features)
  - [Role-Based Dashboards](#1-role-based-dashboards)
  - [Interactive Food Resource Map](#2-interactive-food-resource-map)
  - [AI-Powered Feedback Intelligence](#3-ai-powered-feedback-intelligence)
  - [Image Analysis via Vision AI](#4-image-analysis-via-vision-ai)
  - [Reliability Scoring System](#5-reliability-scoring-system)
  - [Analytics Page](#6-analytics-page)
  - [Data Table](#7-data-table)
  - [Community Reports Hub](#8-community-reports-hub)
  - [Role-Aware AI Chatbot](#9-role-aware-ai-chatbot)
  - [Operational Alerts](#10-operational-alerts)
  - [PDF & CSV Export](#11-pdf--csv-export)
  - [Data Sync Pipeline](#12-data-sync-pipeline)
- [ML Pipeline: Graph Neural Network](#ml-pipeline-graph-neural-network)
  - [Overview](#ml-overview)
  - [Feature Engineering](#feature-engineering)
  - [GNN Architecture](#gnn-architecture)
  - [Resource Archetypes](#resource-archetypes)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Role-Based Access Control](#role-based-access-control)
- [External Integrations](#external-integrations)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## Overview

Lemontree InsightEngine is a full-stack web application for tracking and analyzing food resource accessibility across NYC. It serves five stakeholder personas — donors, government agencies, Lemontree admins, food pantry providers, and community members — each with a tailored role-based dashboard, interactive map layers, and AI-generated insights.

The system combines:
- Live pantry data synced from the Lemontree platform API
- Community feedback processed by Google Gemini for sentiment and category tagging
- Pantry photos analyzed by Groq vision AI for stock and crowd levels
- US Census poverty data layered onto the map
- A Graph Neural Network (GNN) that scores each pantry's coverage gap probability and assigns an archetype

---

## Problem Statement

Food access organizations generate valuable data — pantry locations, hours, wait times, food availability, reviews, photos — but it is often unstructured, siloed, and hard to interpret across partners.

Real consequences:
- Feedback is scattered and unanalyzed at scale
- Pantry performance is evaluated inconsistently
- Service gaps in underserved neighborhoods stay hidden
- Donors and government agencies lack tools to measure impact or identify need
- Shortages are detected too late

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, PostCSS |
| **Charts** | Recharts |
| **Maps** | @react-google-maps/api, React Leaflet, OpenStreetMap |
| **Database** | PostgreSQL (Supabase) via Prisma ORM + raw `pg` driver |
| **AI — Feedback** | Google Gemini 2.0 Flash |
| **AI — Vision** | Groq Llama 4 Scout (17B, vision-capable) |
| **AI — Chat** | Groq Llama 3.1 8B |
| **ML** | Python — PyTorch, PyTorch Geometric (GraphSAGE), scikit-learn, NetworkX |
| **PDF Export** | jsPDF, html2canvas, @react-pdf/renderer |
| **Geo Utilities** | @turf/convex, @turf/helpers |
| **External Data** | Lemontree Platform API, US Census ACS5 2022 |

---

## Architecture Overview

```
Browser (Next.js App Router)
│
├── AppLayout.tsx          Role selection, sidebar, header, chat widget
│
├── Pages (per role)
│   ├── OverviewPage       KPI cards + role-specific charts
│   ├── FoodResourceMapPage  Interactive map, filters, layers, detail panel
│   ├── AnalyticsPage      Reliability histogram, borough charts, export
│   ├── DataTablePage      Paginated table of resources + feedback
│   ├── CommunityReportsPage  Reports feed, feedback history, alerts
│   └── SettingsPage       Placeholder
│
├── /api/* (Next.js Route Handlers)
│   ├── Compute-heavy routes cached in-memory (5-minute TTL)
│   ├── Direct PostgreSQL via pool.ts (pg driver) for performance queries
│   └── Prisma client for ORM/schema operations
│
└── External APIs
    ├── Lemontree Platform API  (resource sync)
    ├── Google Gemini           (feedback classification)
    ├── Groq                    (vision analysis, chatbot)
    └── Google Maps             (map display)

Python ML Pipeline (offline)
├── seed_census.py → enrich_resources.py → build_features.py
├── train_gnn.py → write_scores.py → cluster_archetypes.py
└── Writes gnnScore + archetypeId/Name back to PostgreSQL
```

---

## Core Features

### 1. Role-Based Dashboards

The same underlying data is presented through five distinct lenses. Role is selected at login via a persona grid; the sidebar and all page content update instantly.

**Login Screen:** Five-persona card grid with icons and descriptions. Sets the active role and navigates to the role's default starting page.

**Overview Page — role-specific content:**

| Role | KPI Focus | Chart Content |
|---|---|---|
| **Internal (Admin)** | Published, Gap %, Rating, Wait | Resource type breakdown, rating distribution, wait time distribution, top pantries by engagement |
| **Donor** | Meals provided, neighborhoods reached, active pantries, ROI | Unavailable resources by borough, high-activity zip codes, most trusted pantries |
| **Government** | Critical tracts, SNAP need met, new pantries needed | Resource status by borough (stacked bar), rating + wait distributions |
| **Provider** | Own pantry performance | Borough rating benchmarks, resource type breakdown, engagement leaders |
| **Community** | Nearest open pantries | Map-first view |

Data is fetched in parallel from `/api/map-data`, `/api/insights`, and `/api/trends` on page load.

---

### 2. Interactive Food Resource Map

Full-screen Google Maps integration with real-time viewport-based data fetching.

**Filtering controls (left panel):**
- Keyword search (debounced)
- Borough selector
- Resource type multi-select (Pantry, Soup Kitchen, Community Fridge, etc.)
- Availability toggle

**Sorting:** Default, Distance, Rating, Wait Time

**Map behavior:**
- Fetches only markers within the current viewport bounds (avoids overloading the frontend)
- Markers show color-coded badges based on rating
- Clicking a marker opens an info window with name, address, wait time, rating, and hours
- Circle overlays for poverty/density visualization

**Overlay layers (toggleable):**

| Layer | What it shows |
|---|---|
| **Service Gap** | Choropleth of underserved areas by GNN gap score |
| **Archetype** | Color-coded resource profile per pantry |
| **Tract Centroids** | Census tract overlays with poverty indices |
| **Zip Code Stats** | Per-zip aggregated ratings, wait times, and counts |
| **Poverty (SNAP Need)** | GeoJSON from US Census ACS5 data |

**Right panel (collapsible):**
- Full detail card for selected resource: hours, website, phone, directions link
- Report upload button for community photos

---

### 3. AI-Powered Feedback Intelligence

User-submitted text reviews are classified in real time using **Google Gemini 2.0 Flash**.

**Process:**
1. User submits review text via the feedback form
2. POST `/api/analyze-feedback` sends text to Gemini with a structured classification prompt
3. Response is parsed to extract sentiment and category tags
4. Result is saved to the `Feedback` table in PostgreSQL
5. Feedback appears instantly in the community feed with badges

**Outputs:**
- **Sentiment:** Positive / Negative / Neutral
- **Tags:** Wait Time, Food Quality, Transportation, Staff, Hours, Inventory, Accessibility, Cleanliness

**Fallback (no API key):**
Keyword-based heuristic classifier activates automatically:
- Positive keywords: "love", "thank", "great", "kind"
- Negative keywords: "wait", "long", "hard", "ran out", "bad"
- Tags extracted from keyword matches (e.g., "subway"/"bus" → Transportation)

**Feedback retrieval:**
GET `/api/analyze-feedback` returns the last 20 feedback entries for display.

---

### 4. Image Analysis via Vision AI

Community members can upload pantry photos to get an automated real-time assessment.

**Process:**
1. User selects an image (JPEG, PNG, WebP, GIF — max 10MB)
2. File is converted to base64 and sent to **Groq Llama 4 Scout** (17B vision model)
3. A detailed prompt asks the model to assess stock level, crowd level, and visible food categories
4. JSON response is parsed (handles markdown code fences robustly)
5. Results displayed in the community report card

**Outputs:**
- `stockLevel`: low / medium / high
- `crowdLevel`: low / medium / high
- `categories`: visible food types (e.g., "produce", "canned goods", "bread", "dairy")
- `summary`: 1–2 sentence plain-language description

---

### 5. Reliability Scoring System

Each pantry receives a computed **Reliability Score** (0–100) based on two signals:

```
feedbackScore  = (ratingAverage / 3.5) × 100   [default 50 if no ratings]
daysCovered    = (unique shift days / 7) × 100
reliabilityScore = feedbackScore × 0.6 + daysCovered × 0.4
```

**Badges:**
- `Excellent` — score ≥ 75
- `Good` — score ≥ 50
- `At Risk` — score < 50

**High Priority flag:** Set when `subscriberCount > 100 AND reliabilityScore < 50` — meaning a pantry with high community dependence is underperforming.

The `/api/reliability` endpoint also returns a histogram (10 buckets, 0–100) and aggregate counts by badge tier, used in the Analytics page.

---

### 6. Analytics Page

Data visualization dashboard with PDF export capability.

**Charts:**
- **Reliability Score Histogram:** 10 buckets (0–100), color-coded red (<40), orange (40–60), green (>60)
- **Borough Ratings:** Bar chart of average ratings per NYC borough, Y-axis capped at 5
- **Resource Mix:** Donut chart — pantry (yellow), soup kitchen (black), fridge (green)
- **Wait Time vs Rating Table:** Searchable grid (debounced 300ms search), shows first 5 rows unless searching

**PDF Export:**
- Captures the full analytics section via `html2canvas` (converts to grayscale PNG)
- Embeds in a jsPDF document
- Downloads automatically

Data sources: `/api/reliability`, `/api/trends`, `/api/insights`

---

### 7. Data Table

Two-tab operational view for browsing all data in the database.

**Resources tab:**
- Server-side paginated table (20 rows/page)
- All filtering, sorting, and search handled by PostgreSQL — not the browser
- Controls: keyword search (300ms debounce), type dropdown (populated dynamically with counts), status filter (Published / Unavailable)
- Sortable columns: Name, City, Status, Type, Rating, Wait Time, Subscribers
- Cell formatting:
  - Rating: color-coded green (≥2.5), yellow (≥2.0), red (<2.0)
  - Type: color-coded pill badge (pantry=green, soup kitchen=blue, fridge=purple, etc.)
  - Status: green for Published, gray for Unavailable
- Rows with active alerts get a subtle red background tint
- External website link icon per row

**Feedback tab:**
- Flat list from `/api/analyze-feedback`
- Columns: Sentiment badge, raw text, AI-extracted tag pills, relative timestamp ("5m ago", "2h ago")

**Export:** Yellow "Export Report" button downloads the active tab's data as a PDF/CSV via `downloadFullReport()`.

---

### 8. Community Reports Hub

Three-tab interface for community-generated content and operational signals.

**Reports tab:**
- Feed of community-uploaded pantry photos with vision AI analysis results
- Displays stock level, crowd level, visible food categories, and summary
- User avatar (seeded), sentiment indicator icon, relative timestamp
- Tag pills per report

**Feedback History tab:**
- Filter by sentiment (Positive/Negative/Neutral)
- Filter by tag (Wait Time, Food Quality, etc.)
- Sentiment distribution pie chart (Recharts)
- Feedback cards with color-coded sentiment borders
- Tag pills displayed per card

**Alerts tab:**
- System-generated alerts from `/api/alerts`
- Severity color coding: red (high), orange (medium), blue (low)
- Alert types:
  - `HIGH_UNAVAILABILITY` — zip codes where >60% of resources are unavailable
  - `LOW_RATED_HIGH_TRAFFIC` — pantries with rating <2.0 and subscribers >100
  - `DATA_GAP` — missing ratings, wait times, or shift data
  - `COVERAGE_GAP` — boroughs with no Sunday coverage
- Each alert shows type, title, description, and zip code context

---

### 9. Role-Aware AI Chatbot

A floating chat widget powered by **Groq Llama 3.1 8B** that gives each role a contextually appropriate assistant.

**How it works:**
1. On first message, fetches live dashboard context from `/api/insights`, `/api/reliability`, and `/api/trends`
2. Constructs a role-specific system prompt with that data injected
3. Sends full conversation history to Groq API
4. Returns concise responses (max 2–3 sentences unless user asks for detail)

**Role system prompts:**
| Role | Context provided | What's hidden |
|---|---|---|
| **Donor** | High-impact neighborhoods, coverage gaps, reliability scores | Raw pantry internals |
| **Government** | Borough breakdowns, poverty data, detailed statistics, policy signals | — |
| **Internal (Admin)** | Full system health, at-risk pantries, sentiment trends, anomalies | — |
| **Provider** | Competitive benchmarks, common feedback themes, wait time patterns | Competitor internal scores |
| **Community** | Basic location, availability, general info | Internal scores, donor data |

---

### 10. Operational Alerts

Generated by `/api/alerts` (cached, 5-minute TTL). Identifies systemic issues across the NYC food resource network using direct SQL analysis.

**Alert logic:**

| Alert | Trigger |
|---|---|
| `HIGH_UNAVAILABILITY` | ZIP code where >60% of resources are UNAVAILABLE |
| `LOW_RATED_HIGH_TRAFFIC` | `subscriberCount > 100 AND ratingAverage < 2.0` |
| `DATA_GAP` | `ratingAverage IS NULL OR waitTimeMinutesAverage IS NULL OR shifts IS NULL` |
| `COVERAGE_GAP` | Borough with zero resources open on Sundays (parsed from shift `BYDAY` patterns) |

Alerts are sorted by severity (high → medium → low) and returned with resource/borough context.

---

### 11. PDF & CSV Export

**PDF export (`AnalyticsPage`):**
- `html2canvas` captures the report section as an image
- Converted to grayscale PNG and embedded in jsPDF
- Downloads as `lemontree-analytics-report.pdf`

**CSV/report export (`DataTablePage`):**
- `downloadFullReport(data, tab)` in `src/utils/exportReport.tsx`
- Handles both Resources and Feedback tab formats
- Generates appropriate column headers per tab type

---

### 12. Data Sync Pipeline

`POST /api/sync` keeps the local Supabase database in sync with the external Lemontree platform API.

**Process:**
1. Paginated generator fetches resources from FoodHelpline API (100 per page)
2. Checks `syncedAt` — skips resources synced within the last 24 hours
3. Skips merged duplicates (`mergedToResourceId` set)
4. Upserts each resource:
   - **On create:** Sets all fields including immutable ones (address, coordinates)
   - **On update:** Refreshes name, description, status, ratings, occurrences, shifts, counts, `syncedAt`
5. Returns `{ success, synced, skipped }`

---

## ML Pipeline: Graph Neural Network

### ML Overview

The GNN detects **food access coverage gaps** — neighborhoods where poverty is high but food resources are insufficient, isolated, or overwhelmed. A poverty map alone cannot answer this question: a pantry surrounded by three others in a poor neighborhood is very different from an isolated pantry in the same neighborhood. The GNN learns the **structural coverage landscape** of the entire food access network.

**Pipeline (run in order):**

```
seed_census.py         → Pull US Census ACS5 2022 data → populate CensusData table
enrich_resources.py    → Geocode resources, assign census tractId to each Resource
build_features.py      → Engineer 11 features per resource, build spatial graph (2km edges)
train_gnn.py           → Train GraphSAGE model (80/20 stratified split)
write_scores.py        → Write gnnScore (critical gap probability 0–1) to Resource table
cluster_archetypes.py  → K-means on 32-dim embeddings → assign archetype names
```

---

### Feature Engineering

**`build_features.py`** extracts 11 features per resource and constructs a spatial graph:

| # | Feature | Description |
|---|---|---|
| 1 | `resource_type` | 0=Pantry, 1=Soup Kitchen, 2=Fridge |
| 2 | `rating_normalized` | ratingAverage / 3.0 (imputed to dataset mean ~0.598 if null) |
| 3 | `magnet_score` | Fraction of "OFFERING" tags that are high-draw (produce, client choice, halal, kosher, delivery, diapers) |
| 4 | `barrier_score` | Fraction of "REQUIREMENT" tags indicating access restrictions (ID, registration, income proof, referral) |
| 5 | `days_covered` | Unique BYDAY shift codes / 7 |
| 6 | `poverty_index` | ACS5 poverty rate from CensusData (0–1, imputed to ~0.13 if null) |
| 7 | `subscriber_normalized` | log1p(subscribers) / log1p(max subscribers) |
| 8 | `review_normalized` | log1p(reviews) / log1p(max reviews) |
| 9 | `confidence` | Lemontree data quality score (0–1) |
| 10 | `appointment_required` | Boolean → 0 / 1 |
| 11 | `neighbor_count_normalized` | log1p(spatial neighbors within 2km) / log1p(max) |

**Graph construction:**
- BallTree with haversine metric, 2km radius
- Edge weights: `1.0 / (distance_km + 0.01)` (inverse distance)
- Self-loops removed, bidirectional edges deduplicated

**Coverage gap label:**
```python
gap_score = poverty_index / (1 + neighbor_count_within_2km)

Class 0 (well-covered):   gap_score ≤ 50th percentile  (~50% of nodes)
Class 1 (moderate gap):   50th < gap_score ≤ 85th      (~35% of nodes)
Class 2 (critical gap):   gap_score > 85th percentile  (~15% of nodes)
```

---

### GNN Architecture

**Model: GraphSAGEWithEmbeddings**

```
Input: 11 node features
    ↓
SAGEConv(11 → 64) + ReLU + Dropout(0.3)
    ↓
SAGEConv(64 → 32) + ReLU
    ↓
32-dim node embedding  ← saved to predictions.csv (used for K-means clustering)
    ↓
Linear(32 → 3)
    ↓
3-class logits: [well-covered, moderate, critical gap]
```

**Message passing (SAGEConv):**
```
h_v_new = W × CONCAT(h_v, MEAN({h_u : u ∈ neighbors(v)}))
```
Layer 1 aggregates 1-hop neighbors; Layer 2 aggregates 2-hop neighbors.

**Training configuration:**
- Loss: CrossEntropyLoss with inverse-frequency class weighting (upweights critical gap class)
- Optimizer: Adam (LR=0.01, weight_decay=5e-4)
- Epochs: 300
- Split: Stratified 80/20 (preserves class imbalance)
- Best model checkpoint saved by macro F1 on validation set

**Outputs written to database:**
- `Resource.gnnScore` — `prob_class2`, probability (0–1) of critical gap
- `Resource.archetypeId` / `Resource.archetypeName` — from K-means clustering step

---

### Resource Archetypes

`cluster_archetypes.py` applies K-means (K=5) to the 32-dim GNN embeddings, then names each cluster based on mean feature values:

| ID | Name | Color | Meaning | Recommended Action |
|---|---|---|---|---|
| 0 | **Critical Desert** | Purple `#6A1B9A` | High poverty, isolated resources, very high gap score | Open a new pantry |
| 1 | **Stressed Hub** | Red `#C62828` | High poverty, dense resources but overwhelmed | Expand capacity, not count |
| 2 | **Quietly Underserved** | Amber `#F9A825` | Moderate poverty, high access barriers | Investigate and remove barriers |
| 3 | **Dense & Covered** | Blue `#1565C0` | High poverty, well-served by multiple pantries | Don't over-invest here |
| 4 | **Stable & Covered** | Green `#2E7D32` | Low poverty, dense coverage | Lowest priority |

**Naming decision tree:**
```
gap ≥ p75 AND density < 0.25       → Critical Desert
gap ≥ p75 AND density ≥ 0.25       → Stressed Hub
gap ≥ p50                          → Fragile Sole Provider / Low-Need Isolated
gap < p50 AND density ≥ 0.40 AND poverty ≥ median  → Urban Core Cluster
otherwise                          → Well-Served Suburban
```

---

## API Reference

All endpoints are Next.js App Router handlers returning JSON. Compute-heavy GETs use a 5-minute in-memory cache.

### Resources & Map

| Endpoint | Method | Description |
|---|---|---|
| `/api/resources` | GET | Paginated resource listing. Params: `page`, `search`, `type`, `status`, `sortBy`, `sortDir`. `meta=true` returns type counts only. |
| `/api/map-data` | GET | Bounds-based pantry fetch for map. Params: `north/south/east/west` or `id` for single resource detail. |
| `/api/sync` | POST | Sync all resources from Lemontree platform API into local database. Returns `{ synced, skipped }`. |
| `/api/availability` | GET | Week-by-week heatmap (borough × day-of-week). Also returns resources open today. |
| `/api/zip-stats` | GET | Per-zip-code published/unavailable counts and percentages. |

### Analytics & Insights

| Endpoint | Method | Description |
|---|---|---|
| `/api/insights` | GET | Comprehensive stats: counts, type breakdown, rating distribution, wait time bins, top 10 by reviews/subscribers, top 15 zip codes. |
| `/api/trends` | GET | Borough-level stats, quadrant scatter data, top 15 by subscribers, resource type counts. |
| `/api/reliability` | GET | Reliability score for every resource, histogram (10 buckets), badge tier counts. |
| `/api/alerts` | GET | System-generated operational alerts sorted by severity. |

### Feedback & AI

| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze-feedback` | POST | Submit text for Gemini AI classification. Returns `{ sentiment, tags }` and saves to DB. |
| `/api/analyze-feedback` | GET | Retrieve last 20 feedback entries. |
| `/api/feedback` | GET | Filtered feedback query. Params: `sentiment`, `tag`, `limit`, `sortBy`, `dir`, `from`, `to`. |
| `/api/analyze-image` | POST | Upload pantry photo (multipart/form-data). Returns `{ stockLevel, crowdLevel, categories, summary }`. |
| `/api/chat` | POST | Role-aware chatbot. Body: `{ messages, role }`. Returns `{ reply }`. |
| `/api/upload` | POST | General file upload handler (stub for future storage integration). |

---

## Database Schema

Managed by Prisma (`/prisma/schema.prisma`). Direct SQL via `pg` pool for performance-sensitive queries.

### Resource

The primary data entity — one row per food pantry, soup kitchen, or community fridge. Synced from the Lemontree platform API and enriched by the ML pipeline.

| Field | Type | Notes |
|---|---|---|
| `id` | String | PK, from external API |
| `name` | String | Pantry display name |
| `description` / `description_es` | String | English + Spanish descriptions |
| `addressStreet1`, `addressCity`, `addressState`, `zipCode` | String | Address fields |
| `latitude` / `longitude` | Float | Geocoded coordinates |
| `resourceTypeId` / `resourceTypeName` | String | e.g., FOOD_PANTRY, SOUP_KITCHEN |
| `resourceStatusId` | String | PUBLISHED or UNAVAILABLE |
| `ratingAverage` | Float | Average community rating (1–5 scale) |
| `waitTimeMinutesAverage` | Float | Average reported wait time |
| `reviewCount` / `subscriberCount` | Int | Engagement metrics |
| `acceptingNewClients` / `appointmentRequired` | Boolean | Access flags |
| `confidence` | Float | Lemontree data quality score (0–1) |
| `shifts` | JSON | Operating hours schedule (recurrence patterns) |
| `tags` | JSON | Food type and requirement tags |
| `tractId` | String | US Census tract ID (set by ML pipeline) |
| `gnnScore` | Float | GNN-computed coverage gap probability (0–1) |
| `archetypeId` / `archetypeName` | Int/String | K-means cluster from GNN embeddings |
| `syncedAt` | DateTime | Timestamp of last sync from external API |

### Feedback

| Field | Type | Notes |
|---|---|---|
| `id` | String | CUID primary key |
| `text` | String | Raw user-submitted review text |
| `sentiment` | String | Positive / Negative / Neutral (AI-extracted) |
| `tags` | String[] | Category tags array (AI-extracted) |
| `resourceId` | String? | Optional FK → Resource |
| `rating` | Int? | 1–3 user-submitted rating |
| `waitTimeMinutes` | Int? | Self-reported wait time |
| `createdAt` / `updatedAt` | DateTime | Timestamps |

### CensusData

| Field | Type | Notes |
|---|---|---|
| `tractId` | String | Unique US Census tract ID |
| `povertyIndex` | Float | ACS5 poverty rate (0–1) |
| `population` | Int? | Tract population |

### Stakeholder

| Field | Type | Notes |
|---|---|---|
| `role` | Enum | DONOR / GOV / ADMIN |
| `name` | String | Display name |
| `email` | String | Unique email (for future auth) |

---

## Role-Based Access Control

Role is selected at the login screen and stored in React context (`useApp()`). The `AppLayout` enforces permissions by filtering sidebar items and redirecting unauthorized page accesses to the role's default page.

| Page | Internal | Provider | Government | Donor | Community |
|---|---|---|---|---|---|
| Overview | ✅ | ✅ | ✅ | ✅ | ❌ |
| Map | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |
| Community Reports | ✅ | ✅ | ❌ | ❌ | ✅ |
| Data Table | ✅ | ❌ | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ✅ | ✅ | ❌ |

The chatbot `/api/chat` also filters what dashboard context is exposed per role — community members cannot see internal scores or donor data.

> **Note:** Authentication is currently client-side only (no persistent sessions or JWT). The `Stakeholder` database table exists for a future real auth implementation.

---

## External Integrations

| Service | Purpose | Config |
|---|---|---|
| **Lemontree Platform API** (`platform.foodhelpline.org`) | Resource sync, marker GeoJSON, detail lookup | No auth required (public) |
| **Google Maps API** | Interactive map display, markers, info windows | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| **Google Gemini 2.0 Flash** | Feedback sentiment + tag classification | `GEMINI_API_KEY` |
| **Groq — Llama 4 Scout** | Pantry image analysis (stock/crowd/categories) | `GROQ_API_KEY` |
| **Groq — Llama 3.1 8B** | Role-aware chat assistant | `GROQ_API_KEY` |
| **Supabase PostgreSQL** | Primary data persistence | `DATABASE_URL` (pgbouncer), `DIRECT_URL` (migrations) |
| **US Census ACS5 2022** | Poverty indices by census tract | Used offline in ML pipeline |

---

## Project Structure

```
/code2give
├── /src
│   ├── /app
│   │   ├── /api
│   │   │   ├── /alerts             # System-generated operational alerts
│   │   │   ├── /analyze-feedback   # Gemini AI feedback classification
│   │   │   ├── /analyze-image      # Groq vision image analysis
│   │   │   ├── /availability       # Borough × day-of-week heatmap
│   │   │   ├── /chat               # Role-aware Groq chatbot
│   │   │   ├── /feedback           # Feedback CRUD with filtering
│   │   │   ├── /insights           # Comprehensive aggregated stats
│   │   │   ├── /map-data           # Bounds-based map fetch + resource detail
│   │   │   ├── /reliability        # Reliability score computation
│   │   │   ├── /resources          # Paginated server-side table API
│   │   │   ├── /sync               # Lemontree API → Supabase sync
│   │   │   ├── /trends             # Borough and engagement analytics
│   │   │   ├── /upload             # File upload handler
│   │   │   └── /zip-stats          # Per-zip availability stats
│   │   ├── /upload                 # Upload page route
│   │   ├── layout.tsx              # Root layout with GoogleMapsProvider
│   │   └── page.tsx                # Entry point + role/page routing logic
│   │
│   ├── /components
│   │   ├── /dashboard
│   │   │   ├── AdminDashboard.tsx      # Feedback analysis widget + metrics
│   │   │   ├── DonorDashboard.tsx      # Impact KPIs + ImpactMap
│   │   │   ├── GovDashboard.tsx        # Coverage KPIs + ImpactMap
│   │   │   ├── ImpactMap.tsx           # Shared Google Maps widget
│   │   │   ├── ReliabilityScore.tsx    # SVG donut chart + breakdown bars
│   │   │   └── ReportCard.tsx          # Community feedback card
│   │   ├── /pages
│   │   │   ├── OverviewPage.tsx        # Executive KPIs + role-specific charts
│   │   │   ├── FoodResourceMapPage.tsx # Interactive map + filters + layers
│   │   │   ├── AnalyticsPage.tsx       # Charts + PDF export
│   │   │   ├── DataTablePage.tsx       # Paginated resources + feedback table
│   │   │   ├── CommunityReportsPage.tsx # Reports feed + alerts
│   │   │   └── SettingsPage.tsx        # Placeholder
│   │   ├── /layout
│   │   │   └── AppLayout.tsx           # Sidebar, header, role switcher, chat widget
│   │   ├── /providers
│   │   │   └── GoogleMapsProvider.tsx  # @react-google-maps/api wrapper
│   │   └── /ui                         # Reusable primitives (Button, Card, Badge)
│   │
│   ├── /lib
│   │   ├── /ai
│   │   │   └── feedback-analysis.ts    # Gemini API call + keyword fallback
│   │   ├── /db
│   │   │   ├── pool.ts                 # pg connection pool (serverless-optimized)
│   │   │   └── prisma.ts               # Prisma client singleton
│   │   ├── /services
│   │   │   ├── map.ts                  # Lemontree API calls, map data assembly
│   │   │   └── feedback.ts             # saveFeedback(), getRecentFeedback()
│   │   ├── /types
│   │   │   └── imageAnalysis.ts        # StockLevel, CrowdLevel, ImageAnalysisResult
│   │   └── cache.ts                    # In-memory TTL cache wrapper
│   │
│   └── /utils
│       └── exportReport.tsx            # PDF/CSV download generation
│
├── /prisma
│   ├── schema.prisma                   # Database schema
│   ├── seed.ts                         # Mock NYC resource data seeder
│   └── seed-feedback.ts                # Feedback data seeder
│
├── /ml                                 # Python ML pipeline (run offline)
│   ├── seed_census.py                  # Fetch ACS5 data → CensusData table
│   ├── enrich_resources.py             # Geocode → assign tractId
│   ├── build_features.py               # Feature engineering + spatial graph
│   ├── train_gnn.py                    # GraphSAGE training
│   ├── write_scores.py                 # gnnScore → Resource table
│   ├── cluster_archetypes.py           # K-means → archetype assignment
│   └── requirements.txt                # Python dependencies
│
├── /public                             # Static assets, GeoJSON map files
├── /data                               # Poverty map GeoJSON
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or a Supabase project)
- Python 3.10+ *(ML pipeline only)*

### Installation

```bash
# Install Node dependencies
npm install

# Push database schema to PostgreSQL
npx prisma db push

# Seed with mock NYC food resource data
npm run db:seed
```

### Development

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

`npm run build` runs `prisma generate` before `next build`.

### Database Utilities

```bash
# Seed database with test data
npm run db:seed

# Open visual database browser (Prisma Studio)
npx prisma studio

# Reset database (development only)
npx prisma db reset
```

### ML Pipeline (optional — enriches GNN scores and archetypes)

```bash
cd ml
pip install -r requirements.txt

# Run in order:
python seed_census.py
python enrich_resources.py
python build_features.py
python train_gnn.py
python write_scores.py
python cluster_archetypes.py
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# PostgreSQL — Supabase
DATABASE_URL=postgresql://...      # pgbouncer transaction mode (for app queries)
DIRECT_URL=postgresql://...        # direct connection (for Prisma migrations)

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# AI APIs (both optional — fallbacks activate if omitted)
GEMINI_API_KEY=...                 # Google Gemini 2.0 Flash — feedback classification
GROQ_API_KEY=...                   # Groq — vision analysis (Llama 4 Scout) + chatbot (Llama 3.1 8B)
```

If `GEMINI_API_KEY` is not set, the feedback classifier falls back to keyword-based heuristics automatically.

---

## Acknowledgements

Built for the **Morgan Stanley Code to Give Hackathon** in partnership with [Lemontree](https://www.lemontree.org), a nonprofit dedicated to connecting communities with local food resources across New York City.

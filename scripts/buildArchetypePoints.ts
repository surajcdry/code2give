// Reads data/Resource.csv and extracts [lat, lng, archetypeId] tuples for
// resources with a valid GNN/K-means archetype assignment (ids 0–4).
//
// Output is loaded at runtime by useArchetypePoints when the archetype layer
// is toggled on. Keeping it as a static JSON avoids Supabase egress on every
// map load.
//
// Run:
//   npx ts-node scripts/buildArchetypePoints.ts

import fs from "fs"

// archetypeId values produced by the ML pipeline with K=5
const VALID_IDS = new Set([0, 1, 2, 3, 4])

type Point = [number, number, number] // [lat, lng, archetypeId]

function parseCSVRow(line: string): string[] {
  const cols: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === "," && !inQ) {
      cols.push(cur); cur = ""
    } else {
      cur += ch
    }
  }
  cols.push(cur)
  return cols
}

function build() {
  const raw   = fs.readFileSync("data/Resource.csv", "utf8")
  const lines = raw.split("\n")

  const header  = parseCSVRow(lines[0])
  const latIdx  = header.indexOf("latitude")
  const lngIdx  = header.indexOf("longitude")
  const idIdx   = header.indexOf("archetypeId")

  if (latIdx === -1 || lngIdx === -1 || idIdx === -1) {
    throw new Error(
      `Missing columns — found: ${header.join(", ")}\n` +
      `Expected: latitude, longitude, archetypeId`
    )
  }

  const points: Point[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = parseCSVRow(lines[i])

    const lat = parseFloat(cols[latIdx])
    const lng = parseFloat(cols[lngIdx])
    const id  = parseInt(cols[idIdx], 10)

    if (isNaN(lat) || isNaN(lng) || isNaN(id) || !VALID_IDS.has(id)) {
      skipped++
      continue
    }

    points.push([
      Math.round(lat * 1e5) / 1e5,  // ~1m precision
      Math.round(lng * 1e5) / 1e5,
      id,
    ])
  }

  const out = JSON.stringify(points)
  fs.writeFileSync("public/archetype-points.json", out)

  const byId: Record<number, number> = {}
  for (const [,, id] of points) byId[id] = (byId[id] ?? 0) + 1

  console.log(
    `Written ${points.length} points to public/archetype-points.json ` +
    `(${(Buffer.byteLength(out) / 1024).toFixed(0)} KB)  |  skipped ${skipped}`
  )
  console.log("  Distribution:", byId)
}

build()

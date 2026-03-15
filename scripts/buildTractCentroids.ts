// Joins povertyMap.json with Census Bureau tract centroids and outputs a
// compact array used by the Google Maps HeatmapLayer at runtime.
//
// Before running, download the 2020 national tract Gazetteer file:
//   https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_tracts_national.zip
// Unzip and save the .txt file as:
//   data/2020_Gaz_tracts_national.txt
// Then run:
//   npx ts-node scripts/buildTractCentroids.ts

import fs from "fs"
import readline from "readline"

// Output: compact array of [lat, lng, weight] tuples (weight = povertyIndex).
type Centroid = [number, number, number]

const povertyMap: Record<string, number> = JSON.parse(
  fs.readFileSync("data/povertyMap.json", "utf8")
)

async function build() {
  const centroids: Centroid[] = []
  let total = 0
  let matched = 0

  const rl = readline.createInterface({
    input: fs.createReadStream("data/2020_Gaz_tracts_national.txt"),
    crlfDelay: Infinity,
  })

  let headers: string[] = []
  let first = true

  for await (const line of rl) {
    if (first) {
      // Gazetteer columns are tab-separated; header row names the fields.
      headers = line.split("\t").map(h => h.trim().toUpperCase())
      first = false
      continue
    }

    total++
    const cols = line.split("\t")
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim() })

    const geoid = row["GEOID"]
    const lat   = parseFloat(row["INTPTLAT"])
    const lng   = parseFloat(row["INTPTLONG"])

    if (!geoid || isNaN(lat) || isNaN(lng)) continue

    const weight = povertyMap[geoid]
    if (weight === undefined) continue

    centroids.push([
      Math.round(lat * 1e5) / 1e5,   // 5 decimal places is ~1m precision
      Math.round(lng * 1e5) / 1e5,
      weight,
    ])
    matched++
  }

  fs.writeFileSync("public/tract-centroids.json", JSON.stringify(centroids))

  console.log(
    `Matched ${matched} / ${total} tracts — ` +
    `written to public/tract-centroids.json ` +
    `(${(Buffer.byteLength(JSON.stringify(centroids)) / 1024 / 1024).toFixed(1)} MB)`
  )
}

build()

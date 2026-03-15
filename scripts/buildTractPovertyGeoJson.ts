// Merges poverty index values from data/povertyMap.json into a Census
// tract GeoJSON boundary file and writes the result to public/ so the
// Next.js app can serve it as a static asset.
//
// Before running this script you need a tract boundary GeoJSON for
// New York state.  Download the 500k-scale cartographic boundary file
// from the Census Bureau:
//   https://www2.census.gov/geo/tiger/GENZ2020/geojson/cb_2020_36_tract_500k.zip
// Unzip it and save the contained .geojson file as:
//   data/ny_tracts.geojson
// Then run:
//   npx ts-node scripts/buildTractPovertyGeoJson.ts

import fs from "fs"

interface Feature {
  type: "Feature"
  properties: Record<string, unknown>
  geometry: unknown
}

interface FeatureCollection {
  type: "FeatureCollection"
  features: Feature[]
}

const povertyMap: Record<string, number> = JSON.parse(
  fs.readFileSync("data/povertyMap.json", "utf8")
)

const raw: FeatureCollection = JSON.parse(
  fs.readFileSync("data/ny_tracts.geojson", "utf8")
)

let matched = 0

const features = raw.features
  .map(feature => {
    // Census CBF GeoJSON uses GEOID — the 11-digit FIPS string that
    // matches povertyMap.json keys exactly.
    const geoid = String(
      feature.properties.GEOID ?? feature.properties.geoid ?? ""
    ).trim()

    const povertyIndex = povertyMap[geoid]
    if (povertyIndex === undefined) return null

    matched++
    return {
      ...feature,
      properties: { ...feature.properties, povertyIndex },
    }
  })
  .filter((f): f is Feature => f !== null)

const output: FeatureCollection = { type: "FeatureCollection", features }

// Write compact (no pretty-print) to keep file size down.
fs.writeFileSync("public/ny-tracts-poverty.geojson", JSON.stringify(output))

console.log(
  `Matched ${matched} / ${raw.features.length} tracts — ` +
  `written to public/ny-tracts-poverty.geojson`
)

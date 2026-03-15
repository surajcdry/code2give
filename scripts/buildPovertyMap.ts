import fs from "fs"
import csv from "csv-parser"

const povertyMap: Record<string, number> = {}

fs.createReadStream("data/CensusData.csv")
  .pipe(csv())
  .on("data", (row) => {
    const tract = row.tractId
    const poverty = parseFloat(row.povertyIndex)

    povertyMap[tract] = poverty
  })
  .on("end", () => {
    fs.writeFileSync(
      "data/povertyMap.json",
      JSON.stringify(povertyMap, null, 2)
    )

    console.log("Hash map created")
  })
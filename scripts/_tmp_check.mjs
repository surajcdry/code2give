import fs from "fs";

function parseCSVRow(line) {
  const cols = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      cols.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

const lines = fs.readFileSync("data/Resource.csv", "utf8").split("\n");
const header = parseCSVRow(lines[0]);
const idIdx   = header.indexOf("archetypeId");
const nameIdx = header.indexOf("archetypeName");
const latIdx  = header.indexOf("latitude");
const lngIdx  = header.indexOf("longitude");
console.log("cols:", { idIdx, nameIdx, latIdx, lngIdx });

const counts = {};
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const c  = parseCSVRow(lines[i]);
  const id = c[idIdx]?.trim();
  const nm = c[nameIdx]?.trim();
  if (!id || isNaN(Number(id))) continue;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 0 || n > 4) continue;
  const k = n + ":" + nm;
  counts[k] = (counts[k] || 0) + 1;
}
console.log(JSON.stringify(counts, null, 2));

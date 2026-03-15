import { useState, useEffect } from "react";
import type { ZipStat } from "./types";

export function useZipStats(): Record<string, ZipStat> {
  const [zipStats, setZipStats] = useState<Record<string, ZipStat>>({});

  useEffect(() => {
    fetch("/api/zip-stats")
      .then(r => r.json())
      .then(d => setZipStats(d.zipStats ?? {}))
      .catch(() => {});
  }, []);

  return zipStats;
}

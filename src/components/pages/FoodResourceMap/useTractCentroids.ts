import { useState, useEffect } from "react";

export function useTractCentroids(enabled: boolean): [number, number, number][] {
  const [centroids, setCentroids] = useState<[number, number, number][]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    setLoaded(true);
    fetch("/tract-centroids.json")
      .then(r => { if (!r.ok) throw new Error(`/tract-centroids.json ${r.status}`); return r.json(); })
      .then(d => setCentroids(d))
      .catch(err => console.error("[TractLayer] centroids error:", err));
  }, [enabled, loaded]);

  return centroids;
}

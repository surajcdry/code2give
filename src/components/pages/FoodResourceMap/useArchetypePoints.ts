import { useState, useEffect } from "react";

export function useArchetypePoints(enabled: boolean): [number, number, number][] {
  const [points, setPoints] = useState<[number, number, number][]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    setLoaded(true);
    fetch("/archetype-points.json")
      .then(r => { if (!r.ok) throw new Error(`/archetype-points.json ${r.status}`); return r.json(); })
      .then(d => setPoints(d))
      .catch(err => console.error("[ArchetypeLayer] points error:", err));
  }, [enabled, loaded]);

  return points;
}

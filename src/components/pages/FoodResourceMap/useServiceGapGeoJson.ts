import { useState, useEffect } from "react";

export function useServiceGapGeoJson(enabled: boolean): object | null {
  const [geoJson, setGeoJson] = useState<object | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    setLoaded(true);
    fetch("/nyc-zips.geojson")
      .then(r => { if (!r.ok) throw new Error(`/nyc-zips.geojson ${r.status}`); return r.json(); })
      .then(d => setGeoJson(d))
      .catch(err => console.error("[ZipStats] GeoJSON error:", err));
  }, [enabled, loaded]);

  return geoJson;
}

"use client";

import { useEffect, useState } from "react";
import { Filter, MapPin, Clock, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

type Pantry = {
  id: string; name: string; location: string;
  latitude: number; longitude: number;
  hours: string; description: string;
};

export function FoodResourceMapPage() {
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const L = await import("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    })();
    fetch("/api/map-data").then(r => r.json()).then(d => setPantries(d.pantries || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-gray-900">Food Resource Map</h1>
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">{pantries.length} pantries loaded from database</span>
        </div>
      </div>

      {/* Map */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-[500px] rounded-lg overflow-hidden isolate">
          {mounted ? (
            <MapContainer center={[40.730610, -73.935242]} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pantries.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]}>
                  <Popup>
                    <strong className="block mb-1">{p.name}</strong>
                    <p className="text-xs text-gray-600 mb-1">{p.description}</p>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{p.hours}</span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <p className="text-gray-400 text-sm">Loading map...</p>
            </div>
          )}
        </div>
      </div>

      {/* Resource List */}
      <div className="bg-card rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">All Pantries ({pantries.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {pantries.map((p) => (
            <div key={p.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-gray-900">{p.name}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{p.location}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{p.hours}</span>
                    </div>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mt-2">{p.description}</p>}
                </div>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary">Active</span>
              </div>
            </div>
          ))}
          {pantries.length === 0 && (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No pantries found. Make sure the database is seeded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

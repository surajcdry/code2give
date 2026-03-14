"use client";

import { useEffect, useState } from "react";
import { Filter, MapPin, Clock, AlertCircle } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";

type Pantry = {
  id: string; name: string; location: string;
  latitude: number; longitude: number;
  hours: string; description: string;
};

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const center = {
  lat: 40.730610,
  lng: -73.935242,
};

export function FoodResourceMapPage() {
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Pantry | null>(null);

  useEffect(() => {
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
        <div className="h-[500px] rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={11}
            options={{
              scrollwheel: false,
            }}
          >
            {pantries.map((p) => (
              <Marker
                key={p.id}
                position={{ lat: p.latitude, lng: p.longitude }}
                onClick={() => setSelectedMarker(p)}
              >
                {selectedMarker?.id === p.id && (
                  <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                    <div className="w-48">
                      <strong className="block mb-1">{p.name}</strong>
                      <p className="text-xs text-gray-600 mb-2">{p.description}</p>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{p.hours}</span>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
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

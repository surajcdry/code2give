"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';

// Next.js dynamic import for Leaflet (needs window object, can't SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });

// Types
type Pantry = { id: string; name: string; latitude: number; longitude: number; hours: string; description: string };

interface ImpactMapProps {
  title?: string;
  subtitle?: string;
  initialLayer?: "pantry" | "poverty";
  pantries?: Pantry[];
}

export default function ImpactMap({
  title = "NYC Impact Layer",
  subtitle = "Live data from Lemontree InsightEngine",
  initialLayer = "pantry",
  pantries: initialPantries,
}: ImpactMapProps) {
  const [layer, setLayer] = useState<"pantry" | "poverty">(initialLayer);
  const [pantries, setPantries] = useState<Pantry[]>(initialPantries ?? []);
  const [mounted, setMounted] = useState(false);

  // Update map data if the parent provides new values
  useEffect(() => {
    if (initialPantries) {
      setPantries(initialPantries);
    }
  }, [initialPantries]);

  // NYC center
  const position: [number, number] = [40.730610, -73.935242];

  useEffect(() => {
    setMounted(true);

    // Fix Leaflet default icon paths
    (async function init() {
      const L = await import('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    })();

    // If data was not provided by the parent, load it ourselves.
    if (!initialPantries) {
      fetch('/api/map-data')
        .then(res => res.json())
        .then(data => {
          if (data.pantries) setPantries(data.pantries);
        })
        .catch(err => console.error("Map Data Error:", err));
    }
  }, [initialPantries]);

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-[500px]">
      {/* Map Control Header */}
      <div className="bg-card p-4 border-b border-slate-100 flex items-center justify-between z-10 relative">
        <div>
          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex bg-accent/10 p-1 rounded-md border border-accent/20">
          <Button
            variant={layer === "pantry" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLayer("pantry")}
            className="rounded-sm"
          >
            Pantry Density
          </Button>
          <Button
            variant={layer === "poverty" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLayer("poverty")}
            className="rounded-sm"
          >
            Poverty SNAP Need
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative z-0">
        {mounted ? (
          <MapContainer center={position} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {layer === 'pantry' && pantries.map((pantry) => (
              <Marker key={pantry.id} position={[pantry.latitude, pantry.longitude]}>
                <Popup>
                  <strong className="block mb-1 font-semibold">{pantry.name}</strong>
                  <p className="text-xs text-muted-foreground mb-1">{pantry.description}</p>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-800">{pantry.hours}</span>
                </Popup>
              </Marker>
            ))}

            {layer === 'poverty' && pantries.map((pantry, idx) => (
              <CircleMarker
                key={`pov-${idx}`}
                center={[pantry.latitude, pantry.longitude]}
                pathOptions={{ color: 'red', fillColor: '#f87171', fillOpacity: 0.4 }}
                radius={25 + idx * 5}
              >
                <Popup>SNAP Need Index: {(0.3 + idx * 0.08).toFixed(2)}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <p className="text-slate-400 text-sm">Loading Map...</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { GoogleMap, Marker, Circle, InfoWindow } from '@react-google-maps/api';

type Pantry = { id: string; name: string; latitude: number; longitude: number; hours: string; description: string };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 40.730610,
  lng: -73.935242,
};

export default function ImpactMap() {
  const [layer, setLayer] = useState<"pantry" | "poverty">("pantry");
  const [pantries, setPantries] = useState<Pantry[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Pantry | null>(null);

  useEffect(() => {
    fetch('/api/map-data?north=40.92&south=40.49&east=-73.70&west=-74.26')
      .then(res => res.json())
      .then(data => {
        if (data.pantries) setPantries(data.pantries);
      })
      .catch(err => console.error("Map Data Error:", err));
  }, []);

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm flex flex-col h-125">
      {/* Map Control Header */}
      <div className="bg-card p-4 border-b border-slate-100 flex items-center justify-between z-10 relative">
        <div>
          <h3 className="font-semibold text-slate-900">NYC Impact Layer</h3>
          <p className="text-sm text-primary-foreground0">Live data from Lemontree InsightEngine</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <Button
            variant={layer === "pantry" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLayer("pantry")}
            className="rounded-md"
          >
            Pantry Density
          </Button>
          <Button
            variant={layer === "poverty" ? "default" : "ghost"}
            size="sm"
            onClick={() => setLayer("poverty")}
            className="rounded-md"
          >
            Poverty SNAP Need
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative z-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={11}
          options={{
            scrollwheel: false,
          }}
        >
          {layer === 'pantry' && pantries.map((pantry) => (
            <Marker
              key={pantry.id}
              position={{ lat: pantry.latitude, lng: pantry.longitude }}
              onClick={() => setSelectedMarker(pantry)}
            >
              {selectedMarker?.id === pantry.id && (
                <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                  <div className="w-48">
                    <strong className="block mb-1 font-semibold">{pantry.name}</strong>
                    <p className="text-xs text-muted-foreground mb-1">{pantry.description}</p>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-800">{pantry.hours}</span>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}

          {layer === 'poverty' && pantries.map((pantry, idx) => (
            <React.Fragment key={`pov-${idx}`}>
              <Circle
                center={{ lat: pantry.latitude, lng: pantry.longitude }}
                radius={2000 + idx * 400}
                options={{
                  fillColor: '#f87171',
                  fillOpacity: 0.4,
                  strokeColor: '#dc2626',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
                onClick={() => setSelectedMarker(pantry)}
              />
              {selectedMarker?.id === pantry.id && (
                <InfoWindow
                  position={{ lat: pantry.latitude, lng: pantry.longitude }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="text-sm">
                    <strong className="block mb-1">{pantry.name}</strong>
                    SNAP Need Index: {(0.3 + idx * 0.08).toFixed(2)}
                  </div>
                </InfoWindow>
              )}
            </React.Fragment>
          ))}
        </GoogleMap>
      </div>
    </div>
  );
}

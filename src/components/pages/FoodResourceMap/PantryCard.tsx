"use client";

import { MapPin, Phone, Navigation, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Pantry } from "./types";
import { BADGE_STYLES, TYPE_LABELS } from "./constants";
import { waitColor, waitLabel, ratingColor } from "./mapUtils";

export function PantryCard({ pantry, selected, distance, onSelect }: {
  pantry: Pantry; selected: boolean; distance: number | null; onSelect: () => void;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pantry.location)}`;
  const bs      = pantry.badge ? BADGE_STYLES[pantry.badge] : null;

  return (
    <div onClick={onSelect}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 shadow-sm hover:shadow-md
        ${selected ? "border-primary bg-primary/5 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm leading-snug truncate">
            {pantry.name || TYPE_LABELS[pantry.resourceTypeId ?? ""] || "Food Resource"}
          </h4>
          {pantry.resourceTypeId && (
            <p className="text-[11px] text-gray-400 mt-0.5">{TYPE_LABELS[pantry.resourceTypeId] ?? pantry.resourceTypeId}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {pantry.isOpenNow !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pantry.isOpenNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {pantry.isOpenNow ? "● Open" : "Closed"}
            </span>
          )}
          {bs && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bs.bg} ${bs.text}`}>{pantry.badge}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-2.5">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {pantry.location || "Click to load address"}
        </span>
        {distance !== null && (
          <span className="flex items-center gap-1 text-indigo-600 font-medium shrink-0">
            <Navigation className="w-3 h-3" />{distance.toFixed(1)} mi
          </span>
        )}
        {pantry.waitTimeMinutesAverage != null && (
          <span className={`flex items-center gap-1 shrink-0 font-medium ${waitColor(pantry.waitTimeMinutesAverage)}`}>
            <Timer className="w-3 h-3" />{waitLabel(pantry.waitTimeMinutesAverage)}
          </span>
        )}
        {pantry.ratingAverage != null && (
          <span className={`flex items-center gap-1 shrink-0 font-medium ${ratingColor(pantry.ratingAverage)}`}>
            ⭐ {pantry.ratingAverage.toFixed(1)}
          </span>
        )}
      </div>

      {((pantry.culturalTags?.length ?? 0) > 0 || (pantry.languages?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {pantry.culturalTags?.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-medium">{t}</span>
          ))}
          {pantry.languages?.map(l => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">{l}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          <Button variant="default" size="sm" className="h-7 text-xs gap-1">
            <MapPin className="w-3 h-3" /> Get Directions
          </Button>
        </a>
        {pantry.phone && (
          <a href={`tel:${pantry.phone}`} onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-500">
              <Phone className="w-3 h-3" /> Call
            </Button>
          </a>
        )}
        <span className={`ml-auto text-[10px] font-medium ${pantry.isPublished !== false ? "text-green-600" : "text-gray-400"}`}>
          {pantry.isPublished !== false ? "✓ Published" : "Unpublished"}
        </span>
      </div>
    </div>
  );
}

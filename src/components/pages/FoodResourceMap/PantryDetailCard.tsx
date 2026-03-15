"use client";

import {
  MapPin, Clock, ExternalLink, Phone, Navigation, Timer, Star, Layers, X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Pantry } from "./types";
import { BADGE_STYLES, TYPE_LABELS } from "./constants";
import { resolveHours, ratingColor, waitColor, waitLabel } from "./mapUtils";

export function PantryDetailCard({ pantry, onClose }: { pantry: Pantry; onClose: () => void }) {
  const mapsUrl   = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pantry.location)}`;
  const bs        = pantry.badge ? BADGE_STYLES[pantry.badge] : null;
  const typeLabel = TYPE_LABELS[pantry.resourceTypeId ?? ""] ?? "Food Resource";

  return (
    <div className="rounded-xl border-2 border-primary bg-white shadow-lg overflow-hidden">
      <div className="bg-primary/10 px-4 py-3 flex items-start justify-between gap-2 border-b border-primary/20">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">{typeLabel}</p>
          <h3 className="font-bold text-gray-900 text-sm leading-snug">{pantry.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pantry.isOpenNow !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pantry.isOpenNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {pantry.isOpenNow ? "● Open" : "Closed"}
            </span>
          )}
          <button onClick={onClose} className="p-1 rounded-md hover:bg-primary/10 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 text-sm">
        {(pantry.ratingAverage != null || pantry.waitTimeMinutesAverage != null) && (
          <div className="grid grid-cols-2 gap-2">
            {pantry.ratingAverage != null && (
              <div className={`flex flex-col items-center justify-center py-2.5 rounded-lg border border-transparent ${bs ? bs.bg : "bg-gray-50"}`}>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i}
                      className={`w-3 h-3 ${pantry.ratingAverage! >= i ? (bs ? bs.text : "text-yellow-500") : "text-gray-300"}`}
                      fill={pantry.ratingAverage! >= i ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className={`text-sm font-bold ${bs ? bs.text : ratingColor(pantry.ratingAverage)}`}>
                  {pantry.ratingAverage.toFixed(1)}
                  <span className="text-[10px] font-normal opacity-60">/5</span>
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                  {pantry.reviewCount != null ? `${pantry.reviewCount.toLocaleString()} reviews` : "Rating"}
                </span>
              </div>
            )}
            {pantry.waitTimeMinutesAverage != null && (
              <div className="flex flex-col items-center justify-center py-2.5 rounded-lg bg-blue-50 border border-transparent">
                <Timer className={`w-3.5 h-3.5 mb-0.5 ${waitColor(pantry.waitTimeMinutesAverage)}`} />
                <span className={`text-sm font-bold ${waitColor(pantry.waitTimeMinutesAverage)}`}>
                  {waitLabel(pantry.waitTimeMinutesAverage)}
                </span>
                <span className="text-[10px] text-blue-400 uppercase tracking-wide">Avg Wait</span>
              </div>
            )}
          </div>
        )}

        {(pantry.subscriberCount != null || pantry.acceptingNewClients != null || pantry.appointmentRequired != null) && (
          <div className="flex flex-wrap gap-1.5">
            {pantry.subscriberCount != null && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                👥 {pantry.subscriberCount.toLocaleString()} subscribers
              </span>
            )}
            {pantry.acceptingNewClients === true && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                ✓ Accepting clients
              </span>
            )}
            {pantry.acceptingNewClients === false && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                ✗ Not accepting
              </span>
            )}
            {pantry.appointmentRequired === true && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 font-medium">
                📅 Appointment needed
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2.5">
          <Layers className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Resource Type</p>
            <p className="text-gray-800 text-xs">{typeLabel}</p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
            <p className="text-gray-800 text-xs leading-snug">{pantry.location}</p>
            {(pantry.city || pantry.zipCode) && (
              <p className="text-gray-400 text-xs mt-0.5">{[pantry.city, pantry.zipCode].filter(Boolean).join(", ")}</p>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              Open in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex gap-2.5">
          <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Hours</p>
            <p className="text-gray-800 text-xs whitespace-pre-line">{resolveHours(pantry.hours)}</p>
          </div>
        </div>

        {pantry.phone && (
          <div className="flex gap-2.5">
            <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
              <a href={`tel:${pantry.phone}`} className="text-xs text-blue-600 hover:underline">{pantry.phone}</a>
            </div>
          </div>
        )}

        {pantry.website && (
          <div className="flex gap-2.5">
            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Website</p>
              <a href={pantry.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline break-all">
                {pantry.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          </div>
        )}

        {pantry.description && (
          <div className="flex gap-2.5">
            <Navigation className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">About</p>
              <p className="text-gray-600 text-xs leading-relaxed">{pantry.description}</p>
            </div>
          </div>
        )}

        {((pantry.culturalTags?.length ?? 0) > 0 || (pantry.languages?.length ?? 0) > 0) && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1">
              {pantry.culturalTags?.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-medium">{t}</span>
              ))}
              {pantry.languages?.map(l => (
                <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">{l}</span>
              ))}
            </div>
          </div>
        )}

        {pantry.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-[11px] font-bold text-amber-700 mb-0.5">Note</p>
            <p className="text-xs text-amber-800 leading-relaxed">{pantry.notes}</p>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
          <span className={`w-1.5 h-1.5 rounded-full ${pantry.isPublished !== false ? "bg-green-500" : "bg-gray-300"}`} />
          <span className="text-[11px] text-gray-400">
            {pantry.isPublished !== false ? "Published & active" : "Unpublished"}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="default" size="sm" className="w-full gap-1.5 h-8">
            <MapPin className="w-3.5 h-3.5" /> Get Directions
          </Button>
        </a>
      </div>
    </div>
  );
}

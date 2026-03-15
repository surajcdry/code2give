"use client";

import { LoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing")[] = [];

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      libraries={GOOGLE_MAPS_LIBRARIES}
    >
      {children}
    </LoadScript>
  );
}

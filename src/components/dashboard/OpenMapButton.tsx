"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export function OpenMapButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/food-resource-map")}
      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <MapPin className="h-3 w-3" />
      Open full map
    </button>
  );
}

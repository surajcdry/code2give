import type { SortOption } from "./types";

// Start in NYC so markers are visible immediately on load
export const DEFAULT_CENTER  = { lat: 40.7128, lng: -74.006 };
export const DEFAULT_ZOOM    = 13;
// Don't fetch when zoomed out further than this — bounding box too large for API
export const MIN_FETCH_ZOOM  = 13; // Only fetch markers at neighborhood level or closer
export const MIN_MAP_ZOOM    = 4;  // Allow zooming out to national view to navigate
export const MAX_MARKERS     = 300; // Cap rendered pins to keep the map responsive

export const MILES_TO_METERS = 1609.34;
export const RADIUS_OPTIONS  = [0.5, 1, 2, 5, 10];

export const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY:      "Food Pantry",
  SOUP_KITCHEN:     "Soup Kitchen",
  COMMUNITY_FRIDGE: "Community Fridge",
};

export const FOOD_TAGS = [
  "Halal", "Kosher", "Caribbean", "Chinese", "South Asian",
  "Latin American", "West African", "Korean", "Vegan/Vegetarian", "Fresh Produce",
];

export const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Excellent: { bg: "bg-green-50",  text: "text-green-700"  },
  Good:      { bg: "bg-yellow-50", text: "text-yellow-700" },
  "At Risk": { bg: "bg-red-50",    text: "text-red-700"    },
};

export const MARKER_COLORS: Record<string, string> = {
  Excellent: "#2E7D32",
  Good:      "#F9A825",
  "At Risk": "#E53935",
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default",  label: "Default"        },
  { value: "distance", label: "Nearest first"  },
  { value: "rating",   label: "Highest rated"  },
  { value: "open_now", label: "Open now first" },
];

export const GAP_COLORS = [
  { label: "Critical ≥80%",    color: "#B71C1C", min: 80 },
  { label: "High 50–79%",      color: "#EF5350", min: 50 },
  { label: "Moderate 20–49%",  color: "#FFB74D", min: 20 },
  { label: "Good <20%",        color: "#C8E6C9", min: 0  },
];

export const POVERTY_COLORS = [
  { label: "High ≥40%",        color: "#7B1FA2" },
  { label: "Mod-high 25–39%",  color: "#BA68C8" },
  { label: "Moderate 10–24%",  color: "#E1BEE7" },
  { label: "Low <10%",         color: "#F3E5F5" },
];

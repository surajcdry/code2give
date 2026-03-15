export type Pantry = {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  hours: string;
  description?: string;
  resourceTypeId?: string;
  reliabilityScore?: number;
  badge?: string;
  archetypeId?: number | null;
  archetypeName?: string | null;
  phone?: string;
  website?: string;
  notes?: string;
  waitTime?: string;
  waitTimeMinutesAverage?: number | null;
  isOpenNow?: boolean;
  isPublished?: boolean;
  culturalTags?: string[];
  languages?: string[];
  ratingAverage?: number | null;
  reviewCount?: number | null;
  subscriberCount?: number | null;
  acceptingNewClients?: boolean | null;
  appointmentRequired?: boolean | null;
  city?: string | null;
  zipCode?: string | null;
};

export type ZipStat = { total: number; published: number; unavailable: number; pctUnavailable: number };

export type SortOption = "default" | "distance" | "rating" | "open_now";

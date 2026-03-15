"use client";

import { useEffect, useState } from "react";
import { Star, Clock, MapPin, Camera, MessageSquare, ChevronRight, Navigation } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

// ── Types ──────────────────────────────────────────────────────────────────────
type Resource = {
  id: string;
  name: string;
  location: string;
  hours: string;
  ratingAverage?: number | null;
  reviewCount?: number | null;
  waitTimeMinutesAverage?: number | null;
  badge?: string;
  resourceTypeId?: string;
  city?: string | null;
  zipCode?: string | null;
  phone?: string;
  acceptingNewClients?: boolean | null;
};

type FeedbackItem = {
  id: string;
  text: string;
  sentiment: string;
  tags: string[];
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY: "Food Pantry",
  SOUP_KITCHEN: "Soup Kitchen",
  COMMUNITY_FRIDGE: "Community Fridge",
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{value.toFixed(1)}</span>
    </div>
  );
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Resource Card ──────────────────────────────────────────────────────────────
function ResourceCard({ r }: { r: Resource }) {
  const badgeColors: Record<string, string> = {
    Excellent: "bg-green-100 text-green-700",
    Good: "bg-amber-100 text-amber-700",
    "At Risk": "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-card rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{r.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABELS[r.resourceTypeId ?? ""] ?? "Food Resource"}</p>
        </div>
        {r.badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeColors[r.badge] ?? "bg-gray-100 text-gray-600"}`}>
            {r.badge}
          </span>
        )}
      </div>

      {r.ratingAverage != null && <StarRating value={r.ratingAverage} />}

      <div className="flex flex-col gap-1.5 text-xs text-gray-500">
        {r.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{r.location}</span>
          </div>
        )}
        {r.hours && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{r.hours}</span>
          </div>
        )}
        {r.waitTimeMinutesAverage != null && (
          <div className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span>~{r.waitTimeMinutesAverage} min wait</span>
          </div>
        )}
      </div>

      {r.acceptingNewClients && (
        <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full w-fit">
          Accepting new clients
        </span>
      )}

      {r.phone && (
        <a
          href={`tel:${r.phone}`}
          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {r.phone}
        </a>
      )}
    </div>
  );
}

// ── Review Form ────────────────────────────────────────────────────────────────
function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/analyze-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setText("");
      setSuccess(true);
      onSubmitted();
      setTimeout(() => setSuccess(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your experience — what was the wait like, was the staff helpful, what food was available?"
        rows={4}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
      />
      {success && (
        <p className="text-sm text-green-600 font-medium">Thanks for your review! It helps the community.</p>
      )}
      <button
        type="submit"
        disabled={submitting || !text.trim()}
        className="self-end px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}

// ── Recent Reviews ─────────────────────────────────────────────────────────────
function RecentReviews({ feedback }: { feedback: FeedbackItem[] }) {
  if (feedback.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-6">No reviews yet. Be the first!</p>
  );

  return (
    <div className="space-y-3">
      {feedback.slice(0, 6).map((fb) => (
        <div key={fb.id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              fb.sentiment === "Positive" ? "bg-green-100 text-green-700" :
              fb.sentiment === "Negative" ? "bg-red-100 text-red-600" :
              "bg-gray-200 text-gray-600"
            }`}>
              {fb.sentiment}
            </span>
            <span className="text-[10px] text-gray-400">{timeAgo(fb.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 italic">&ldquo;{fb.text}&rdquo;</p>
          {fb.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {fb.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Client Page ───────────────────────────────────────────────────────────
export function ClientPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeedback = () =>
    fetch("/api/analyze-feedback")
      .then((r) => r.json())
      .then((d) => setFeedback(d.feedback || []));

  useEffect(() => {
    Promise.all([
      fetch("/api/map-data").then((r) => r.json()),
      loadFeedback(),
    ]).then(([mapData]) => {
      const list: Resource[] = mapData.listResources || mapData.pantries || [];
      const topRated = list
        .filter((r: Resource) => r.ratingAverage != null)
        .sort((a: Resource, b: Resource) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0))
        .slice(0, 8);
      setResources(topRated.length > 0 ? topRated : list.slice(0, 8));
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* Welcome banner */}
      <div className="bg-[#FFCC10] rounded-2xl px-8 py-6 flex items-center gap-4">
        <Navigation className="w-8 h-8 text-gray-800 shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Find Food Near You</h1>
          <p className="text-sm text-gray-700 mt-0.5">
            Browse top-rated food resources, share photos, and leave reviews to help your community.
          </p>
        </div>
      </div>

      {/* Recommended Resources */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <h2 className="text-lg font-semibold text-gray-900">Top Recommended Resources</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map((r) => <ResourceCard key={r.id} r={r} />)}
          </div>
        )}
      </section>

      {/* Upload + Review — side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Upload a Photo */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Upload a Photo</h2>
          </div>
          <div className="bg-card rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-4">
              Help others by sharing photos of available food, the space, or anything useful.
            </p>
            <ImageUpload />
          </div>
        </section>

        {/* Write a Review */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Write a Review</h2>
          </div>
          <div className="bg-card rounded-2xl border border-gray-200 p-6 flex flex-col gap-6">
            <ReviewForm onSubmitted={loadFeedback} />
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Recent Community Reviews</p>
              <RecentReviews feedback={feedback} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
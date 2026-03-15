"use client";

import { X } from "lucide-react";

export function Chip({ label, onRemove, color }: { label: string; onRemove: () => void; color?: "green" | "orange" }) {
  const cls = color === "green"  ? "bg-green-50 text-green-700 border-green-200"
            : color === "orange" ? "bg-orange-50 text-orange-700 border-orange-200"
            :                      "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
      <button onClick={e => { e.stopPropagation(); onRemove(); }} className="hover:opacity-60">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

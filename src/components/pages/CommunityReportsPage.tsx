"use client";


import { useEffect, useState, useMemo } from "react";
import {
  Clock, CheckCircle, AlertTriangle, Star,
  MessageSquare as MessageSquareIcon, Calendar, Filter,
  ChevronDown, Info, Upload, Navigation, MapPin, Camera,
  MessageSquare, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useApp } from "@/components/layout/AppLayout";
import type { ImageAnalysisResult } from "@/lib/types/imageAnalysis";


// ─── Types ────────────────────────────────────────────────────────────────────


type FeedbackItem = {
  id: string; text: string; sentiment: string;
  tags: string[]; createdAt: string;
};


 


interface Alert {
  type: string; severity: "high" | "medium" | "low";
  title: string; description: string; count: number; zipCode?: string;
}


type ActiveTab = "reports" | "feedback_history" | "alerts";

type CommunityReport = {
  id: string;
  resourceName: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  displayName?: string;
  anonymous: boolean;
  avatarSeed: string;
  tags?: string[];
  stockLevel?: "low" | "medium" | "high";
};


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
  phone?: string | null;
  acceptingNewClients?: boolean | null;
};


// ─── Fallback images (used when a resource has no API image) ──────────────────


const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&q=80",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80",
  "https://images.unsplash.com/photo-1506484381205-f7945653044d?w=600&q=80",
  "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600&q=80",
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=600&q=80",
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80",
  "https://images.unsplash.com/photo-1543168256-418811576931?w=600&q=80",
];


const RELATIVE_TIMES = [
  "Just now", "2 hours ago", "5 hours ago", "Yesterday",
  "Yesterday", "2 days ago", "2 days ago", "3 days ago", "4 days ago", "5 days ago",
];


// ─── Mock fallback reports (shown when API returns < 3 named resources) ───────


const MOCK_REPORTS: CommunityReport[] = [
  { id:"m1", resourceName:"Bronx Community Pantry", imageUrl:FALLBACK_IMAGES[0], caption:"A lot of canned food today but not much fruit left. Shelves are pretty well-stocked overall!", createdAt:"2 hours ago", anonymous:true, avatarSeed:"alpha" },
  { id:"m2", resourceName:"Harlem Food Hub", imageUrl:FALLBACK_IMAGES[1], caption:"Fresh produce just came in — apples, carrots, and some greens. Get here early!", createdAt:"5 hours ago", displayName:"Maria L.", anonymous:false, avatarSeed:"bravo" },
  { id:"m3", resourceName:"East Side Table", imageUrl:FALLBACK_IMAGES[2], caption:"Bread and pastries available near the entrance. Also saw pasta and rice.", createdAt:"Yesterday", anonymous:true, avatarSeed:"charlie" },
  { id:"m4", resourceName:"Brooklyn Pantry Network", imageUrl:FALLBACK_IMAGES[3], caption:"Long line today but moved fast. Lots of dairy and frozen items available.", createdAt:"Yesterday", displayName:"James T.", anonymous:false, avatarSeed:"delta" },
  { id:"m5", resourceName:"Queens Fresh Table", imageUrl:FALLBACK_IMAGES[5], caption:"Great selection this week — lots of veggies and some meat packages too.", createdAt:"2 days ago", displayName:"Sofia R.", anonymous:false, avatarSeed:"foxtrot" },
];


// ─── Badge SVGs ───────────────────────────────────────────────────────────────


const BADGES = [
  {
    id:"first", label:"First Snapshot", desc:"Share your 1st report", threshold:1, color:"#F9A825",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#FFF3B0":"#e8e8e8"} stroke={u?"#F4B400":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#FFD54F":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <rect x="26" y="38" width="48" height="30" rx="5" fill={u?"#fff":"#d0d0d0"} stroke={u?"#E65100":"#a0a0a0"} strokeWidth="2.5"/>
        <circle cx="50" cy="53" r="9" fill={u?"#B3E5FC":"#c8c8c8"} stroke={u?"#0277BD":"#909090"} strokeWidth="2"/>
        <circle cx="50" cy="53" r="5" fill={u?"#E1F5FE":"#e0e0e0"} stroke={u?"#4FC3F7":"#b0b0b0"} strokeWidth="1.5"/>
        <rect x="38" y="33" width="14" height="8" rx="3" fill={u?"#fff":"#d0d0d0"} stroke={u?"#E65100":"#a0a0a0"} strokeWidth="2"/>
        <circle cx="66" cy="43" r="3" fill={u?"#FFD600":"#c0c0c0"}/>
        {u && <><text x="16" y="24" fontSize="10" fill="#FFD600">✦</text><text x="74" y="20" fontSize="8" fill="#FFD600">✦</text></>}
      </svg>
    ),
  },
  {
    id:"produce", label:"Produce Power", desc:"Share 3 fresh finds", threshold:3, color:"#558B2F",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#F1F8E9":"#e8e8e8"} stroke={u?"#558B2F":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#AED581":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <path d="M50 36 Q60 42 58 60 Q54 70 50 72 Q46 70 42 60 Q40 42 50 36Z" fill={u?"#FF8F00":"#d0d0d0"} stroke={u?"#E65100":"#a0a0a0"} strokeWidth="1.5"/>
        <path d="M44 48 Q50 46 56 48" fill="none" stroke={u?"#E65100":"#b8b8b8"} strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M43 55 Q50 53 57 55" fill="none" stroke={u?"#E65100":"#b8b8b8"} strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M50 36 Q44 24 38 26 Q44 32 48 37" fill={u?"#558B2F":"#b0b0b0"}/>
        <path d="M50 36 Q50 22 50 24 Q50 30 50 36" fill={u?"#7CB342":"#b8b8b8"}/>
        <path d="M50 36 Q56 24 62 26 Q56 32 52 37" fill={u?"#558B2F":"#b0b0b0"}/>
        {u && <><text x="13" y="22" fontSize="9" fill="#8BC34A">✦</text><text x="75" y="20" fontSize="7" fill="#558B2F">✦</text></>}
      </svg>
    ),
  },
  {
    id:"hand", label:"Helping Hand", desc:"Share 5 reports", threshold:5, color:"#7CB342",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#F1F8E9":"#e8e8e8"} stroke={u?"#7CB342":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#AED581":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <rect x="28" y="46" width="44" height="28" rx="6" fill={u?"#fff":"#d0d0d0"} stroke={u?"#388E3C":"#a0a0a0"} strokeWidth="2.5"/>
        <path d="M36 46 Q36 34 50 34 Q64 34 64 46" fill="none" stroke={u?"#388E3C":"#a0a0a0"} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="43" cy="38" r="6" fill={u?"#EF5350":"#c0c0c0"} stroke={u?"#B71C1C":"#909090"} strokeWidth="1.5"/>
        <path d="M43 33 Q44 30 46 31" fill="none" stroke={u?"#43A047":"#a0a0a0"} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M54 42 L56 52" stroke={u?"#E65100":"#a0a0a0"} strokeWidth="3" strokeLinecap="round"/>
        <path d="M54 42 Q52 38 50 39 M54 42 Q55 38 57 38" stroke={u?"#43A047":"#a0a0a0"} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        {u && <><text x="14" y="22" fontSize="9" fill="#8BC34A">✦</text><text x="74" y="20" fontSize="7" fill="#CDDC39">✦</text></>}
      </svg>
    ),
  },
  {
    id:"shelf", label:"Shelf Spotter", desc:"Share 8 reports", threshold:8, color:"#F57C00",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#FFF3E0":"#e8e8e8"} stroke={u?"#F57C00":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#FFCC80":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <rect x="24" y="62" width="40" height="5" rx="2" fill={u?"#fff":"#d8d8d8"} stroke={u?"#F57C00":"#a0a0a0"} strokeWidth="1.8"/>
        <rect x="24" y="50" width="40" height="5" rx="2" fill={u?"#fff":"#d8d8d8"} stroke={u?"#F57C00":"#a0a0a0"} strokeWidth="1.8"/>
        <rect x="24" y="38" width="40" height="5" rx="2" fill={u?"#fff":"#d8d8d8"} stroke={u?"#F57C00":"#a0a0a0"} strokeWidth="1.8"/>
        <rect x="27" y="57" width="5" height="5" rx="1" fill={u?"#EF5350":"#c0c0c0"}/>
        <rect x="34" y="58" width="4" height="4" rx="1" fill={u?"#42A5F5":"#c0c0c0"}/>
        <rect x="27" y="45" width="4" height="5" rx="1" fill={u?"#66BB6A":"#c0c0c0"}/>
        <rect x="33" y="46" width="5" height="4" rx="1" fill={u?"#FFA726":"#c0c0c0"}/>
        <circle cx="64" cy="44" r="11" fill="none" stroke={u?"#F57C00":"#a0a0a0"} strokeWidth="3.5"/>
        <circle cx="64" cy="44" r="7" fill={u?"#FFF3E0":"#e8e8e8"} stroke="none"/>
        <line x1="72" y1="52" x2="78" y2="58" stroke={u?"#F57C00":"#a0a0a0"} strokeWidth="4" strokeLinecap="round"/>
        {u && <><text x="12" y="22" fontSize="9" fill="#FFB74D">✦</text><text x="75" y="20" fontSize="7" fill="#F57C00">✦</text></>}
      </svg>
    ),
  },
  {
    id:"contrib", label:"Contributor", desc:"Share 10 reports", threshold:10, color:"#1976D2",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#E3F2FD":"#e8e8e8"} stroke={u?"#1976D2":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#64B5F6":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <rect x="24" y="60" width="52" height="14" rx="4" fill={u?"#fff":"#d0d0d0"} stroke={u?"#1565C0":"#a0a0a0"} strokeWidth="2.2"/>
        <line x1="50" y1="60" x2="50" y2="74" stroke={u?"#90CAF9":"#c0c0c0"} strokeWidth="1.5"/>
        <rect x="28" y="48" width="44" height="14" rx="4" fill={u?"#fff":"#d0d0d0"} stroke={u?"#1976D2":"#a0a0a0"} strokeWidth="2.2"/>
        <line x1="50" y1="48" x2="50" y2="62" stroke={u?"#90CAF9":"#c0c0c0"} strokeWidth="1.5"/>
        <rect x="32" y="36" width="36" height="14" rx="4" fill={u?"#FFF9C4":"#d0d0d0"} stroke={u?"#F57F17":"#a0a0a0"} strokeWidth="2.2"/>
        <text x="41" y="48" fontSize="11" fill={u?"#F57F17":"#b0b0b0"}>★</text>
        {u && <><text x="13" y="22" fontSize="10" fill="#2196F3">✦</text><text x="74" y="20" fontSize="8" fill="#42A5F5">✦</text></>}
      </svg>
    ),
  },
  {
    id:"voice", label:"Community Voice", desc:"Share 12 reports", threshold:12, color:"#00838F",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#E0F7FA":"#e8e8e8"} stroke={u?"#00838F":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#80DEEA":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <rect x="43" y="30" width="14" height="22" rx="7" fill={u?"#fff":"#d0d0d0"} stroke={u?"#00838F":"#a0a0a0"} strokeWidth="2.5"/>
        <path d="M35 52 Q35 66 50 66 Q65 66 65 52" fill="none" stroke={u?"#00838F":"#a0a0a0"} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="50" y1="66" x2="50" y2="74" stroke={u?"#00838F":"#a0a0a0"} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="42" y1="74" x2="58" y2="74" stroke={u?"#00838F":"#a0a0a0"} strokeWidth="2.5" strokeLinecap="round"/>
        {u && <>
          <path d="M68 42 Q73 50 68 58" fill="none" stroke="#00838F" strokeWidth="2" strokeLinecap="round"/>
          <path d="M73 37 Q80 50 73 63" fill="none" stroke="#B2EBF2" strokeWidth="1.5" strokeLinecap="round"/>
          <text x="11" y="22" fontSize="9" fill="#26C6DA">✦</text><text x="75" y="20" fontSize="7" fill="#00838F">✦</text>
        </>}
      </svg>
    ),
  },
  {
    id:"fresh", label:"Freshness Scout", desc:"Share 20 reports", threshold:20, color:"#00796B",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#E0F2F1":"#e8e8e8"} stroke={u?"#00796B":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#80CBC4":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <circle cx="50" cy="50" r="18" fill={u?"#B2DFDB":"#d8d8d8"} stroke={u?"#00796B":"#a0a0a0"} strokeWidth="2.5"/>
        <path d="M38 50 L46 58 L63 40" fill="none" stroke={u?"#00796B":"#909090"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M62 28 Q72 22 74 32 Q64 34 62 28Z" fill={u?"#4CAF50":"#c0c0c0"}/>
        <path d="M62 28 Q68 28 74 32" fill="none" stroke={u?"#2E7D32":"#a0a0a0"} strokeWidth="1.2" strokeLinecap="round"/>
        {u && <><text x="12" y="22" fontSize="9" fill="#4DB6AC">✦</text><text x="74" y="19" fontSize="7" fill="#00796B">✦</text></>}
      </svg>
    ),
  },
  {
    id:"local", label:"Local Guide", desc:"Share 15 reports", threshold:15, color:"#0288D1",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#E1F5FE":"#e8e8e8"} stroke={u?"#0288D1":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#4FC3F7":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        {/* Compass rose */}
        <circle cx="50" cy="50" r="18" fill={u?"#fff":"#d8d8d8"} stroke={u?"#0288D1":"#a0a0a0"} strokeWidth="2"/>
        <polygon points="50,32 53,48 50,44 47,48" fill={u?"#E53935":"#b0b0b0"}/>
        <polygon points="50,68 53,52 50,56 47,52" fill={u?"#90A4AE":"#c0c0c0"}/>
        <polygon points="32,50 48,47 44,50 48,53" fill={u?"#90A4AE":"#c0c0c0"}/>
        <polygon points="68,50 52,47 56,50 52,53" fill={u?"#90A4AE":"#c0c0c0"}/>
        <circle cx="50" cy="50" r="3.5" fill={u?"#0288D1":"#a0a0a0"}/>
        {u && <><text x="12" y="22" fontSize="9" fill="#29B6F6">✦</text><text x="75" y="20" fontSize="7" fill="#0288D1">✦</text></>}
      </svg>
    ),
  },
  {
    id:"mvp", label:"Community MVP", desc:"Share 25 reports", threshold:25, color:"#F9A825",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#FFF8E1":"#e8e8e8"} stroke={u?"#F9A825":"#b0b0b0"} strokeWidth="3.5"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#FFD54F":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        <ellipse cx="50" cy="52" rx="15" ry="17" fill={u?"#FFD600":"#d0d0d0"} stroke={u?"#F9A825":"#a0a0a0"} strokeWidth="2"/>
        <path d="M50 35 Q53 31 56 33" fill="none" stroke={u?"#F9A825":"#a0a0a0"} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="44" cy="49" r="2.5" fill={u?"#5D4037":"#909090"}/>
        <circle cx="56" cy="49" r="2.5" fill={u?"#5D4037":"#909090"}/>
        <circle cx="45" cy="48.2" r="1" fill="#fff"/>
        <circle cx="57" cy="48.2" r="1" fill="#fff"/>
        <path d="M44 55 Q50 60 56 55" fill="none" stroke={u?"#5D4037":"#909090"} strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="61" y1="42" x2="70" y2="33" stroke={u?"#F57F17":"#b0b0b0"} strokeWidth="2.5" strokeLinecap="round"/>
        <text x="62" y="36" fontSize="14" fill={u?"#FFD600":"#c0c0c0"}>★</text>
        <path d="M38 38 L42 30 L50 36 L58 30 L62 38 Z" fill={u?"#FFD600":"#d0d0d0"} stroke={u?"#F9A825":"#a0a0a0"} strokeWidth="2" strokeLinejoin="round"/>
        {u && <><text x="10" y="18" fontSize="11" fill="#FFD600">✦</text><text x="76" y="17" fontSize="10" fill="#FFD600">✦</text></>}
      </svg>
    ),
  },
  {
    id:"hero", label:"Neighborhood Hero", desc:"Share 50 reports", threshold:50, color:"#C62828",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#FFEBEE":"#e8e8e8"} stroke={u?"#C62828":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#EF9A9A":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        {/* Shield */}
        <path d="M50 28 L68 35 L68 52 Q68 65 50 74 Q32 65 32 52 L32 35 Z"
          fill={u?"#fff":"#d0d0d0"} stroke={u?"#C62828":"#a0a0a0"} strokeWidth="2.5"/>
        <path d="M50 33 L63 38 L63 52 Q63 62 50 69 Q37 62 37 52 L37 38 Z"
          fill={u?"#FFCDD2":"#e0e0e0"} stroke="none"/>
        {/* Star on shield */}
        <text x="43" y="56" fontSize="16" fill={u?"#C62828":"#b0b0b0"}>★</text>
        {u && <><text x="13" y="22" fontSize="9" fill="#EF5350">✦</text><text x="75" y="19" fontSize="8" fill="#C62828">✦</text></>}
      </svg>
    ),
  },
  {
    id:"champ", label:"Food Champion", desc:"Share 100 reports", threshold:100, color:"#2E7D32",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#E8F5E9":"#e8e8e8"} stroke={u?"#2E7D32":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#A5D6A7":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        {/* Medal circle */}
        <circle cx="50" cy="46" r="16" fill={u?"#FFD600":"#d0d0d0"} stroke={u?"#F9A825":"#a0a0a0"} strokeWidth="2.5"/>
        <circle cx="50" cy="46" r="11" fill={u?"#FFF8E1":"#e8e8e8"} stroke={u?"#FFB300":"#b8b8b8"} strokeWidth="1.5"/>
        <text x="43.5" y="51" fontSize="13" fill={u?"#2E7D32":"#b0b0b0"}>1</text>
        {/* Ribbon left */}
        <path d="M42 60 L36 74 L44 70 L46 76 L52 62" fill={u?"#43A047":"#c0c0c0"} stroke="none"/>
        {/* Ribbon right */}
        <path d="M58 60 L64 74 L56 70 L54 76 L48 62" fill={u?"#388E3C":"#c0c0c0"} stroke="none"/>
        {u && <><text x="12" y="22" fontSize="9" fill="#66BB6A">✦</text><text x="75" y="20" fontSize="8" fill="#2E7D32">✦</text></>}
      </svg>
    ),
  },
  {
    id:"legend", label:"Community Legend", desc:"Share 200 reports", threshold:200, color:"#6A1B9A",
    Svg: ({ u }: { u: boolean }) => (
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill={u?"#F3E5F5":"#e8e8e8"} stroke={u?"#6A1B9A":"#b0b0b0"} strokeWidth="3"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={u?"#CE93D8":"#c8c8c8"} strokeWidth="2" strokeDasharray="4 3"/>
        {/* Crown base */}
        <rect x="30" y="60" width="40" height="10" rx="3" fill={u?"#FFD600":"#d0d0d0"} stroke={u?"#F9A825":"#a0a0a0"} strokeWidth="2"/>
        {/* Crown points */}
        <path d="M30 60 L30 42 L40 52 L50 34 L60 52 L70 42 L70 60 Z"
          fill={u?"#FFD600":"#d0d0d0"} stroke={u?"#F9A825":"#a0a0a0"} strokeWidth="2" strokeLinejoin="round"/>
        {/* Gems */}
        <circle cx="50" cy="52" r="4" fill={u?"#E040FB":"#c0c0c0"}/>
        <circle cx="37" cy="56" r="3" fill={u?"#AB47BC":"#c0c0c0"}/>
        <circle cx="63" cy="56" r="3" fill={u?"#AB47BC":"#c0c0c0"}/>
        {u && <><text x="10" y="19" fontSize="11" fill="#CE93D8">✦</text><text x="76" y="17" fontSize="9" fill="#6A1B9A">✦</text></>}
      </svg>
    ),
  },
];


// ─── Avatar ───────────────────────────────────────────────────────────────────


const AVATAR_COLORS = ["#f97316","#10b981","#6366f1","#ec4899","#14b8a6","#f59e0b","#8b5cf6"];
function hashSeed(s: string) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))>>>0; return h; }


function Avatar({ seed, size=8 }: { seed: string; size?: number }) {
  const col = AVATAR_COLORS[hashSeed(seed) % AVATAR_COLORS.length];
  const px = size * 4;
  return (
    <div style={{ width:px, height:px, backgroundColor:col, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:px*0.4, flexShrink:0 }}>
      {seed[0].toUpperCase()}
    </div>
  );
}


// ─── BadgeStrip ───────────────────────────────────────────────────────────────


function BadgeStrip({ count }: { count: number }) {
  const next = BADGES.find(b => b.threshold > count);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <span className="font-bold text-sm text-gray-900">Your Badges</span>
          {next && <span className="ml-3 text-xs text-gray-400">{count} / {next.threshold} reports to next badge</span>}
        </div>
        <span className="text-xs bg-amber-50 text-amber-800 rounded-full px-3 py-1 font-semibold">
          🌟 {count} report{count !== 1 ? "s" : ""} shared
        </span>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-1">
        {BADGES.map(b => {
          const unlocked = count >= b.threshold;
          return (
            <div key={b.id} className="flex flex-col items-center gap-1.5 min-w-[80px]">
              <div style={{
                width:64, height:64,
                filter: unlocked ? "none" : "grayscale(1) opacity(0.45)",
                boxShadow: unlocked ? `0 0 14px ${b.color}55` : "none",
                borderRadius:"50%", transition:"all .3s",
              }}>
                <b.Svg u={unlocked} />
              </div>
              <span className="text-[10px] font-bold text-center leading-tight" style={{ color: unlocked ? "#1f2937" : "#9ca3af" }}>{b.label}</span>
              <span className="text-[9px] text-gray-400 text-center">{b.desc}</span>
            </div>
          );
        })}
      </div>
      {next && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Progress to {next.label}</span><span>{count}/{next.threshold}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full">
            <div className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100,(count/next.threshold)*100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}


// ─── ReportCard ───────────────────────────────────────────────────────────────


const STOCK_PILL: Record<string, string> = {
  high:   "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-red-100   text-red-700",
};


function ReportCard({ report }: { report: CommunityReport }) {
  const [hovered, setHovered] = useState(false);
  const name = report.anonymous ? "Anonymous" : (report.displayName || "Anonymous");
  return (
    <div className="flex-shrink-0 w-64 cursor-pointer overflow-hidden"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="h-52 overflow-hidden relative rounded-t-xl">
        <img src={report.imageUrl} alt={report.caption}
          className="w-full h-full object-cover block transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }} />
        <div className="absolute bottom-2.5 left-2.5 bg-black/55 text-white text-[10px] font-medium px-2 py-0.5 rounded">
          {report.createdAt}
        </div>
        {report.stockLevel && (
          <div className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${STOCK_PILL[report.stockLevel]}`}>
            {report.stockLevel} stock
          </div>
        )}
      </div>
      <div className="pt-2.5 pb-1.5 flex items-start gap-2">
        <Avatar seed={report.avatarSeed} size={6} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-gray-900 mb-0.5 truncate">📍 {report.resourceName}</p>
          <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{report.caption}</p>
          {report.tags && report.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {report.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">{tag}</span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-1">{name}</p>
        </div>
      </div>
    </div>
  );
}


// ─── ReportFeed ───────────────────────────────────────────────────────────────


function ReportFeed({ reports }: { reports: CommunityReport[] }) {
  return (
    <div>
      <div className="h-1.5 rounded-t bg-gradient-to-r from-violet-600 to-violet-700" />
      <div className="flex gap-1 overflow-x-auto pb-3" style={{ scrollbarWidth:"none" }}>
        {reports.map(r => <ReportCard key={r.id} report={r} />)}
      </div>
      <div className="h-1 rounded-b bg-gradient-to-r from-violet-700 to-violet-600" />
    </div>
  );
}


// ─── UploadModal ──────────────────────────────────────────────────────────────


const REPORT_QUESTIONS = [
  { key: "freshProduce",  label: "Fresh Fruit / Produce", icon: "🥬" },
  { key: "halal",         label: "Halal Options",          icon: "☪️" },
  { key: "kosher",        label: "Kosher Options",         icon: "✡️" },
  { key: "cannedGoods",   label: "Canned Goods",           icon: "🥫" },
  { key: "dairy",         label: "Dairy",                  icon: "🥛" },
  { key: "frozen",        label: "Frozen Foods",           icon: "❄️" },
  { key: "bread",         label: "Bread / Bakery",         icon: "🍞" },
  { key: "largeVariety",  label: "Large Variety",          icon: "🛒" },
] as const;
type QuestionKey = typeof REPORT_QUESTIONS[number]["key"];
type Answers = Record<QuestionKey, boolean | null>;


function UploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [caption, setCaption] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [anon, setAnon] = useState(true);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<ImageAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({
    freshProduce: null, halal: null, kosher: null, cannedGoods: null,
    dairy: null, frozen: null, bread: null, largeVariety: null,
  });


  const handleFileChange = async (f: File) => {
    setImgPreview(URL.createObjectURL(f));
    setAiResult(null);
    setAiError(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const res = await fetch("/api/analyze-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Analysis failed");
      const data: ImageAnalysisResult = await res.json();
      setAiResult(data);
      const cats = data.categories.map(c => c.toLowerCase());
      setAnswers(prev => ({
        ...prev,
        freshProduce: cats.some(c => ["produce","fresh","fruit","vegetable","vegetables"].some(k => c.includes(k))),
        cannedGoods:  cats.some(c => c.includes("canned")),
        dairy:        cats.some(c => c.includes("dairy")),
        frozen:       cats.some(c => c.includes("frozen")),
        bread:        cats.some(c => c.includes("bread") || c.includes("bakery")),
      }));
    } catch {
      setAiError("Auto-analysis unavailable — answer the questions manually below.");
    } finally {
      setAnalyzing(false);
    }
  };


  const toggle = (key: QuestionKey, val: boolean) =>
    setAnswers(prev => ({ ...prev, [key]: prev[key] === val ? null : val }));


  const activeTags = REPORT_QUESTIONS.filter(q => answers[q.key] === true).map(q => q.label);


  const AI_PREFILLED: QuestionKey[] = ["freshProduce", "cannedGoods", "dairy", "frozen", "bread"];


  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>


        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Share a Report</h2>
            <p className="text-xs text-gray-400 mt-0.5">Help your community know what&apos;s available right now</p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-xl leading-none">✕</button>
        </div>


        <div className="p-6 space-y-6">


          {/* Photo upload + AI analysis */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-500" />
              Upload a Photo
              <span className="ml-auto text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">AI-Powered</span>
            </p>
            <label className="block border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer bg-gray-50 hover:border-purple-300 hover:bg-purple-50/20 transition-colors">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />
              {imgPreview ? (
                <div className="relative">
                  <img src={imgPreview} alt="preview" className="w-full max-h-72 object-cover" />
                  {analyzing && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 text-white">
                      <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      <p className="text-sm font-semibold">AI is analyzing your photo…</p>
                      <p className="text-xs text-white/70">Detecting food categories, stock level &amp; crowd</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-gray-400 gap-3">
                  <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <Camera className="w-7 h-7 text-purple-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Tap to upload a pantry photo</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI auto-detects food categories · JPEG, PNG, WebP</p>
                  </div>
                </div>
              )}
            </label>


            {/* AI result summary bar */}
            {aiResult && !analyzing && (
              <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 space-y-2">
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-purple-800">Stock:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold capitalize ${
                      aiResult.stockLevel === "high" ? "bg-green-100 text-green-800" :
                      aiResult.stockLevel === "low"  ? "bg-red-100   text-red-800"   : "bg-amber-100 text-amber-800"
                    }`}>{aiResult.stockLevel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-purple-800">Crowd:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold capitalize ${
                      aiResult.crowdLevel === "high" ? "bg-red-100   text-red-800"   :
                      aiResult.crowdLevel === "low"  ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}>{aiResult.crowdLevel}</span>
                  </div>
                  {aiResult.categories.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-purple-800">Detected:</span>
                      {aiResult.categories.map(c => (
                        <span key={c} className="bg-white border border-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 italic">{aiResult.summary}</p>
              </div>
            )}
            {aiError && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">{aiError}</p>
            )}
          </div>


          {/* Yes/No checklist */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">What did you see there today?</p>
            <p className="text-xs text-gray-400 mb-3">
              Upload a photo and AI pre-fills what it detects — you can adjust manually.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_QUESTIONS.map(q => (
                <div key={q.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                  <span className="text-sm text-gray-700 flex items-center gap-1.5 truncate mr-2">
                    <span>{q.icon}</span>
                    <span className="truncate">{q.label}</span>
                    {AI_PREFILLED.includes(q.key) && answers[q.key] !== null && (
                      <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 rounded shrink-0">AI</span>
                    )}
                  </span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => toggle(q.key, true)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        answers[q.key] === true
                          ? "bg-green-500 text-white"
                          : "bg-white border border-gray-200 text-gray-500 hover:border-green-400"
                      }`}>Yes</button>
                    <button onClick={() => toggle(q.key, false)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        answers[q.key] === false
                          ? "bg-red-400 text-white"
                          : "bg-white border border-gray-200 text-gray-500 hover:border-red-300"
                      }`}>No</button>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Caption */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">Add a note <span className="font-normal text-gray-400">(optional)</span></p>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2}
              placeholder="e.g. Busy today but volunteers were helpful. Lots of produce!"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-purple-300 text-gray-900" />
          </div>


          {/* Anonymous toggle */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Post anonymously</p>
              <p className="text-[11px] text-gray-400">Your name won&apos;t be shown</p>
            </div>
            <button onClick={() => setAnon(a => !a)}
              className="w-10 h-5 rounded-full relative transition-colors duration-200"
              style={{ background: anon ? "#9333ea" : "#e5e7eb" }}>
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: anon ? "calc(100% - 18px)" : "2px" }} />
            </button>
          </div>


          {!anon && (
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name (optional)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-300 text-gray-900" />
          )}


          {/* Submit */}
          <button
            onClick={() => {
              onSubmit({ caption, displayName, anon, imgPreview, tags: activeTags, aiResult });
              onClose();
            }}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            Share Report
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Analyst-only sub-components ─────────────────────────────────────────────


function FeedbackCard({ fb }: { fb: FeedbackItem }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
          fb.sentiment === "Positive" ? "bg-green-50 text-green-700" :
          fb.sentiment === "Negative" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
        }`}>{fb.sentiment}</span>
        <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/>{fb.createdAt}</span>
      </div>
      <p className="text-sm text-gray-700 italic mb-3">&ldquo;{fb.text}&rdquo;</p>
      <div className="flex flex-wrap gap-1">
        {fb.tags?.map(t => <span key={t} className="text-[9px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100">{t}</span>)}
      </div>
    </div>
  );
}


function AlertCard({ alert }: { alert: Alert }) {
  const isHigh = alert.severity === "high";
  return (
    <div className={`p-4 rounded-lg border-l-4 ${isHigh ? "border-red-500 bg-red-50/50" : "border-yellow-500 bg-yellow-50/50"}`}>
      <div className="flex items-start gap-3">
        {isHigh ? <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5"/> : <Info className="w-5 h-5 text-yellow-600 mt-0.5"/>}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-bold text-gray-900">{alert.title}</h4>
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{alert.type.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}



// ─── Client-view sub-components ──────────────────────────────────────────────


const TYPE_LABELS: Record<string, string> = {
  FOOD_PANTRY: "Food Pantry",
  SOUP_KITCHEN: "Soup Kitchen",
  COMMUNITY_FRIDGE: "Community Fridge",
};


function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} />
      ))}
      <span className="ml-1 text-xs text-gray-500">{value.toFixed(1)}</span>
    </div>
  );
}


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
        <a href={`tel:${r.phone}`} className="text-xs text-primary underline underline-offset-2 hover:text-primary/80">
          {r.phone}
        </a>
      )}
    </div>
  );
}


function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


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
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Share your experience — what was the wait like, was the staff helpful, what food was available?"
        rows={4}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50" />
      {success && <p className="text-sm text-green-600 font-medium">Thanks for your review! It helps the community.</p>}
      <button type="submit" disabled={submitting || !text.trim()}
        className="self-end px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}


function RecentReviews({ feedback }: { feedback: FeedbackItem[] }) {
  if (feedback.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-6">No reviews yet. Be the first!</p>
  );
  return (
    <div className="space-y-3">
      {feedback.slice(0, 6).map(fb => (
        <div key={fb.id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              fb.sentiment === "Positive" ? "bg-green-100 text-green-700" :
              fb.sentiment === "Negative" ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-600"
            }`}>{fb.sentiment}</span>
            <span className="text-[10px] text-gray-400">{timeAgo(fb.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 italic">&ldquo;{fb.text}&rdquo;</p>
          {fb.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {fb.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────


export function CommunityHubPage() {
  const { role } = useApp();
  const isClient = role === "client";


  // Shared state
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [userCount, setUserCount] = useState(13);


  // Analyst-only state
  const [activeTab, setActiveTab] = useState<ActiveTab>("reports");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");


  // Client-only state
  const [resources, setResources] = useState<Resource[]>([]);


  const loadFeedback = () =>
    fetch("/api/analyze-feedback").then(r => r.json()).then(d => setFeedback(d.feedback || []));


  useEffect(() => {
    setLoading(true);


    const promises: Promise<any>[] = [
      fetch("/api/map-data").then(r => r.json()),
      fetch("/api/analyze-feedback").then(r => r.json()),
      ...(!isClient ? [
        fetch("/api/alerts").then(r => r.json()),
      ] : []),
    ];


    Promise.all(promises)
      .then(([mapData, fbData, alData]) => {
        // Build report feed: mix API images with fallbacks
        const listResources: any[] = mapData.listResources || mapData.pantries || [];
        const named = listResources.filter((r: any) => r.name).slice(0, 10);
        const apiReports: CommunityReport[] = named.map((r: any, i: number) => ({
          id: r.id,
          resourceName: r.name,
          // Use real API image if available, otherwise fall back to Unsplash
          imageUrl: r.imageUrl || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
          caption: r.description?.trim() || "Check here for available food resources and current stock.",
          createdAt: RELATIVE_TIMES[i] ?? "Recently",
          anonymous: true,
          avatarSeed: r.id.slice(0, 6),
        }));


        // Always mix API reports with the mock reports for a full feed
        setReports([...apiReports, ...MOCK_REPORTS]);


        setFeedback(fbData?.feedback || []);


        if (isClient) {
          setResources(named.slice(0, 8) as Resource[]);
        } else {
          setAlerts(alData?.alerts || []);
        }


        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isClient]);


  const filteredFeedback = useMemo(() => {
    if (timeFilter === "all") return feedback;
    if (timeFilter === "custom" && selectedDate)
      return feedback.filter(f => f.createdAt.includes(selectedDate));
    return feedback;
  }, [feedback, timeFilter, selectedDate]);


  function handleReportSubmit({ caption, displayName, anon, imgPreview, tags, aiResult }: any) {
    const autoCaption = aiResult
      ? `${aiResult.summary} (${aiResult.stockLevel} stock, ${aiResult.crowdLevel} crowd)`
      : "No caption provided.";
    setReports(prev => [{
      id: Date.now().toString(),
      resourceName: "Your Local Pantry",
      imageUrl: imgPreview || FALLBACK_IMAGES[0],
      caption: caption || autoCaption,
      createdAt: "Just now",
      displayName: anon ? undefined : (displayName || undefined),
      anonymous: anon,
      avatarSeed: Math.random().toString(36).slice(2, 7),
      tags: tags || [],
      stockLevel: aiResult?.stockLevel ?? undefined,
    }, ...prev]);
    setUserCount(c => c + 1);
  }


  // ── Client layout ────────────────────────────────────────────────────────────


  if (isClient) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">


        {/* Welcome banner */}
        <div className="bg-[#FFCC10] rounded-2xl px-8 py-6 flex items-center gap-4">
          <Navigation className="w-8 h-8 text-gray-800 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Hub</h1>
            <p className="text-sm text-gray-700 mt-0.5">
              See what&apos;s available at pantries near you — powered by your community and AI.
            </p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="ml-auto flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base px-6 py-3 rounded-xl shadow-md transition-colors shrink-0">
            <Camera className="w-5 h-5" />
            Add Report
          </button>
        </div>


        {/* AI feature highlight */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-100 rounded-2xl px-6 py-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-900">AI-Powered Photo Reports</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  Snap a pantry photo — our AI instantly identifies what&apos;s in stock and feeds it into the map filters.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 sm:mt-0 sm:ml-auto">
              {[
                { icon: "🥬", label: "Fresh Produce" },
                { icon: "☪️", label: "Halal" },
                { icon: "✡️", label: "Kosher" },
                { icon: "🥫", label: "Canned Goods" },
                { icon: "🥛", label: "Dairy" },
                { icon: "❄️", label: "Frozen" },
                { icon: "🍞", label: "Bakery" },
                { icon: "🛒", label: "Large Variety" },
              ].map(({ icon, label }) => (
                <span key={label} className="text-xs bg-white border border-purple-200 text-purple-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                  <span>{icon}</span>{label}
                </span>
              ))}
            </div>
          </div>
        </div>


        {/* Badges + report feed */}
        <section>
          <BadgeStrip count={userCount} />
          <h2 className="font-semibold text-gray-900 mb-3 text-base">Community Reports</h2>
          <ReportFeed reports={reports} />
        </section>


        {/* Top recommended resources */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="text-lg font-semibold text-gray-900">Top Recommended Resources</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {resources.map(r => <ResourceCard key={r.id} r={r} />)}
            </div>
          )}
        </section>


        {/* Write a Review — full width */}
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


        {modalOpen && <UploadModal onClose={() => setModalOpen(false)} onSubmit={handleReportSubmit} />}
      </div>
    );
  }


  // ── Analyst layout ───────────────────────────────────────────────────────────


  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Hub</h1>
          <p className="text-sm text-gray-500">Citizen reports, resource reliability, and urgent alerts</p>
        </div>
        {activeTab === "reports" && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors">
            <Upload className="w-4 h-4" />
            Add Report
          </button>
        )}
      </header>


      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "reports",          label: "Citizen Reports",    icon: MessageSquareIcon },
          { id: "feedback_history", label: "Feedback History",   icon: Calendar },
          { id: "alerts",           label: "Operational Alerts", icon: AlertTriangle },
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as ActiveTab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <t.icon className={`w-4 h-4 ${activeTab === t.id ? "text-[#FFCC10]" : ""}`} />
            {t.label}
            {t.id === "alerts" && alerts.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full ml-1">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>


      {/* Reports tab */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          <BadgeStrip count={userCount} />
          <ReportFeed reports={reports} />
        </div>
      )}


      {/* Feedback History tab */}
      {activeTab === "feedback_history" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg text-xs font-bold text-gray-600">
              <Filter className="w-3.5 h-3.5" /><span>Timeframe</span>
            </div>
            <div className="relative">
              <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 text-xs rounded-lg px-4 py-2 pr-8 outline-none font-medium cursor-pointer">
                <option value="all">All Feedback</option>
                <option value="custom">Select Specific Date...</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
            {timeFilter === "custom" && (
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 outline-none font-medium" />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeedback.map(fb => <FeedbackCard key={fb.id} fb={fb} />)}
          </div>
        </div>
      )}

      {/* Alerts tab */}
      {activeTab === "alerts" && (
        <div className="max-w-3xl space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4"/>
              <h3 className="font-bold">System All Clear</h3>
              <p className="text-sm text-gray-500">No high-priority issues detected.</p>
            </div>
          ) : alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
        </div>
      )}


      {modalOpen && <UploadModal onClose={() => setModalOpen(false)} onSubmit={handleReportSubmit} />}
    </div>
  );
}





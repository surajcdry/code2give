"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  LayoutDashboard, MapPin, FileText, Settings, User, 
  PanelLeftClose, PanelLeftOpen, Table2, BarChart3, ChevronDown,
  LogOut, ShieldCheck, Heart, Building2, Users
} from "lucide-react";
import { ChatBot } from "@/components/TempBot";

// --- TYPES ---
export type UserRole = "internal" | "client" | "government" | "donor" | "provider";
export type PageId = "overview" | "map" | "community" | "analytics" | "table" | "settings";

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  page: PageId;
  setPage: (page: PageId) => void;
}

// --- PERMISSIONS CONFIGURATION ---
const PERMISSIONS: Record<UserRole, PageId[]> = {
  internal: ["overview", "map", "analytics", "community", "table"],
  client: ["map", "community"],
  provider: ["overview", "map", "analytics", "community"],
  government: ["overview", "map", "analytics", "table"],
  donor: ["overview", "map", "analytics", "table"],
};

// UPDATED: Order defined here determines dropdown order
const roleLabels: Record<UserRole, string> = {
  internal: "Lemontree Team",
  client: "Community Member",
  government: "Government Agency",
  donor: "Donor",
  provider: "Food Pantry",
};

const STARTING_PAGES: Record<UserRole, PageId> = {
  internal: "overview",
  client: "map",
  government: "overview",
  donor: "overview",
  provider: "overview",
};

const navItems: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "map", label: "Food Resource Map", icon: MapPin },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "community", label: "Community Hub", icon: FileText },
  { id: "table", label: "Data Table", icon: Table2 },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppLayout");
  return ctx;
}

// --- LOGIN SCREEN COMPONENT ---
function LoginScreen({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const personas: { role: UserRole; icon: React.ElementType; desc: string }[] = [
    { role: "internal", icon: ShieldCheck, desc: "System Admin & Staff" },
    { role: "client", icon: Users, desc: "Community Member" },
    { role: "government", icon: Building2, desc: "City & State Officials" },
    { role: "donor", icon: Heart, desc: "Philanthropic Partners" },
    { role: "provider", icon: MapPin, desc: "Pantry & Soup Kitchens" },
  ];

  return (
    <div className="min-h-screen bg-[#FFCC10] flex flex-col items-center justify-center p-6 text-gray-900">
      <div className="mb-12 text-center">
        <img src="/lemontreeLogo.png" alt="Logo" className="h-20 w-20 mx-auto mb-4" />
        <h1 className="text-5xl font-black tracking-tighter uppercase">LemonAid</h1>
        <p className="text-gray-800 font-bold mt-2 uppercase tracking-widest text-xs">Select Persona to Enter</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-7xl w-full">
        {personas.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.role}
              onClick={() => onLogin(p.role)}
              className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-black transition-all shadow-xl hover:-translate-y-2 flex flex-col items-center text-center group"
            >
              <div className="bg-gray-100 p-5 rounded-2xl mb-4 group-hover:bg-[#FFCC10] transition-colors">
                <Icon className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight mb-1">
                {roleLabels[p.role]}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{p.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- SIDEBAR COMPONENT ---
function Sidebar({ page, setPage, collapsed, setCollapsed, role }: {
  page: PageId;
  setPage: (p: PageId) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  role: UserRole;
}) {
  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} bg-card border-r border-gray-200 flex flex-col fixed left-0 top-16 bottom-0 z-20 transition-all duration-300`}>
      <nav className="flex-1 overflow-y-auto p-2 mt-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isAllowed = PERMISSIONS[role].includes(item.id);
            if (!isAllowed) return null;

            const Icon = item.icon;
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-left ${
                  collapsed ? "justify-center" : ""
                } ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
      <div className={`p-4 border-t border-gray-100 mt-auto flex ${collapsed ? "justify-center" : "justify-end"}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}

// --- MAIN LAYOUT ---
export function AppLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("internal");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState<PageId>("overview");
  const [collapsed, setCollapsed] = useState(false);

  const handleLogin = (newRole: UserRole) => {
    setRole(newRole);
    setIsLoggedIn(true);
    // Direct link to the persona's specific starting page
    setPage(STARTING_PAGES[newRole]);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // If not logged in, only show the Login Screen
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppContext.Provider value={{ role, setRole, page, setPage }}>
      {typeof window !== 'undefined' && (
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      )}
      
      <div className="min-h-screen bg-background flex flex-col text-gray-900">
        <header className="fixed top-0 left-0 right-0 h-16 bg-[#FFCC10] z-30 flex items-center px-6">
          
          {/* TRACK & TEAM TEXT */}
          <div className="flex-1 flex items-center">
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-900 font-mono whitespace-nowrap">
              Track B <span className="mx-2 text-gray-900/30">|</span> Team 9
            </span>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <img src="/lemontreeLogo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <span 
              className="text-3xl text-gray-900 pr-1" 
              style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}
            >
              LemonAid
            </span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            {/* CURRENT ROLE LABEL */}
            <div className="flex items-center gap-2 bg-white/40 px-4 py-1.5 rounded-xl border border-black/5 shadow-sm">
              <User className="w-3.5 h-3.5 text-gray-700" />
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-900">{roleLabels[role]}</span>
            </div>

            {/* LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all text-xs font-bold uppercase tracking-tight"
            >
              <LogOut size={14} />
              Logout
            </button>

            <button
              onClick={() => setPage("settings")}
              className={`h-10 w-10 flex items-center justify-center rounded-lg border transition-all shadow-sm ${
                page === "settings" ? "bg-black text-[#FFCC10] border-black" : "bg-white/30 hover:bg-white/50 border-black/10 text-gray-900"
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} role={role} />
        
        <main className={`${collapsed ? "ml-16" : "ml-64"} pt-16 transition-all duration-300`}>
          <div className={page === "map" ? "" : "p-8"}>
            {children}
          </div>
        </main>

        <ChatBot />
      </div>
    </AppContext.Provider>
  );
}
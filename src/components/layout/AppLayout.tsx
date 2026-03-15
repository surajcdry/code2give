"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  LayoutDashboard, MapPin, FileText, Settings, User, 
  PanelLeftClose, PanelLeftOpen, Table2, BarChart3, ChevronDown
} from "lucide-react";

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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                  collapsed ? "justify-center" : ""
                } ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
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
  const [page, setPage] = useState<PageId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setOpen(false);
    if (!PERMISSIONS[newRole].includes(page)) {
      setPage(PERMISSIONS[newRole][0]);
    }
  };

  return (
    <AppContext.Provider value={{ role, setRole, page, setPage }}>
      {typeof window !== 'undefined' && (
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      )}
      
      <div className="min-h-screen bg-background flex flex-col text-gray-900">
        <header className="fixed top-0 left-0 right-0 h-16 bg-[#FFCC10] z-30 flex items-center px-6">
          
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-2.5 px-4 py-1.5 bg-black rounded-full border border-white/10 shadow-lg">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFCC10] animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFCC10] font-mono whitespace-nowrap">
                Track B <span className="mx-0.5 text-white/30">/</span> Team 9
              </span>
            </div>
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

          <div className="flex-1 flex justify-end items-center gap-4 relative">
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="h-10 flex items-center gap-2 px-4 rounded-lg bg-white/30 hover:bg-white/50 border border-black/10 transition-all shadow-sm"
              >
                <User className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{roleLabels[role]}</span>
                <ChevronDown className="w-4 h-4 text-gray-700" />
              </button>
              
              {open && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-20 overflow-hidden text-sm">
                    {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          role === r ? "text-primary font-bold bg-primary/5" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {roleLabels[r]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

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
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
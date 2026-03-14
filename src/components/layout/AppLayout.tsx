"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  LayoutDashboard, MapPin, FileText, TrendingUp,
  Apple, AlertTriangle, Settings, ChevronDown, User, Leaf, PanelLeftClose, PanelLeftOpen, Table2, Star,
} from "lucide-react";

export type UserRole = "internal" | "government" | "donor" | "provider";
export type PageId = "overview" | "map" | "reports" | "trends" | "reliability" | "availability" | "issues" | "settings" | "table";

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  page: PageId;
  setPage: (page: PageId) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppLayout");
  return ctx;
}

const roleLabels: Record<UserRole, string> = {
  internal: "Lemontree Team",
  government: "Government Agency",
  donor: "Donor / Foundation",
  provider: "Food Provider",
};

const navItems: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "map", label: "Food Resource Map", icon: MapPin },
  { id: "reports", label: "Community Reports", icon: FileText },
  { id: "trends", label: "Trends & Analytics", icon: TrendingUp },
  { id: "reliability", label: "Reliability Scores", icon: Star },
  { id: "availability", label: "Food Availability", icon: Apple },
  { id: "issues", label: "Service Issues", icon: AlertTriangle },
  { id: "table", label: "Data Table", icon: Table2 },
  { id: "settings", label: "Settings", icon: Settings },
];

function Sidebar({ page, setPage, collapsed, setCollapsed }: {
  page: PageId;
  setPage: (p: PageId) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} bg-card border-r border-gray-200 flex flex-col fixed left-0 top-16 bottom-0 z-20 transition-all duration-300`}>
      <div className={`p-4 border-b border-gray-200 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mx-auto"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

function TopNav({ role, setRole, collapsed }: { role: UserRole; setRole: (r: UserRole) => void; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <header className={`h-16 bg-card border-b border-gray-200 flex items-center justify-between px-6 fixed top-16 right-0 z-10 transition-all duration-300 ${collapsed ? "left-16" : "left-64"}`}>
      <div className="flex items-center gap-4">
        <h1 className="text-gray-900 font-semibold">Dashboard</h1>
        <div className="h-6 w-px bg-gray-300" />
        <span className="text-sm text-gray-600">{today}</span>
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-900">{roleLabels[role]}</span>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-lg shadow-lg border border-gray-200 py-2 z-20">
              {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    role === r ? "text-primary bg-primary/5" : "text-gray-700"
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("internal");
  const [page, setPage] = useState<PageId>("overview");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AppContext.Provider value={{ role, setRole, page, setPage }}>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="fixed top-0 left-0 right-0 h-16 bg-[#FFCC10] z-30 flex items-center justify-center px-6 gap-3">
          <div className="h-8 w-8 flex items-center justify-center overflow-hidden">
            <img src="/lemontreeLogo.png" alt="Lemontree Logo" className="h-full w-full object-contain" />
          </div>
          <div className="h-8 flex items-center justify-center overflow-hidden">
            <img src="/lemontreeText.png" alt="Lemontree Text" className="h-full w-auto object-contain" />
          </div>
        </div>
        <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
        <TopNav role={role} setRole={setRole} collapsed={collapsed} />
        <main className={`${collapsed ? "ml-16" : "ml-64"} pt-32 transition-all duration-300`}>
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}

"use client";

import { AppLayout, useApp } from "@/components/layout/AppLayout";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { FoodResourceMapPage } from "@/components/pages/FoodResourceMapPage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { DataTablePage } from "@/components/pages/DataTablePage";
import { CommunityHubPage } from "@/components/pages/CommunityReportsPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";

// Define the same permissions here or import them if you exported them from AppLayout
const PERMISSIONS = {
  internal: ["overview", "map", "analytics", "community", "table", "settings"],
  provider: ["overview", "map", "analytics", "community", "settings"],
  government: ["overview", "map", "analytics", "table", "settings"],
  donor: ["overview", "map", "analytics", "table", "settings"],
  client: ["map", "community"],
};

function PageContent() {
  const { page, role } = useApp();

  // 1. SAFETY GUARD: Check if the current role is allowed to see the current page
  // If not allowed, we force-render their default page (usually the Map)
  const isAllowed = PERMISSIONS[role]?.includes(page);
  
  if (!isAllowed) {
    return <FoodResourceMapPage />; 
  }

  // 2. RENDER LOGIC: Now that we know they are allowed, just show the page
  switch (page) {
    case "overview":
      return <OverviewPage />;
    case "map":
      return <FoodResourceMapPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "community":
      return <CommunityHubPage />;
    case "table":
      return <DataTablePage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <FoodResourceMapPage />;
  }
}

export default function Home() {
  return (
    <AppLayout>
      <PageContent />
    </AppLayout>
  );
}
"use client";

import { AppLayout, useApp } from "@/components/layout/AppLayout";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { FoodResourceMapPage } from "@/components/pages/FoodResourceMapPage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { DataTablePage } from "@/components/pages/DataTablePage";
import { ClientPage } from "@/components/pages/ClientPage";
import { CommunityHubPage } from "@/components/pages/CommunityReportsPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";

function PageContent() {
  const { page, role } = useApp();

  // Handle the "Client" persona specifically
  if (role === "client") {
    if (page === "map") return <FoodResourceMapPage />;
    return <ClientPage />;
  }

  // Handle all other personas (Government, Donor, Provider, Internal)
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
      return <OverviewPage />;
  }
}

export default function Home() {
  return (
    <AppLayout>
      <PageContent />
    </AppLayout>
  );
}
"use client";

import { AppLayout, useApp } from "@/components/layout/AppLayout";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { FoodResourceMapPage } from "@/components/pages/FoodResourceMapPage";
import { CommunityReportsPage } from "@/components/pages/CommunityReportsPage";
import { TrendsPage } from "@/components/pages/TrendsPage";
import { ServiceIssuesPage } from "@/components/pages/ServiceIssuesPage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { DataTablePage } from "@/components/pages/DataTablePage";
import { FoodAvailabilityPage } from "@/components/pages/FoodAvailabilityPage";
import { ReliabilityPage } from "@/components/pages/ReliabilityPage";
import { ClientPage } from "@/components/pages/ClientPage";

function PageContent() {
  const { page, role } = useApp();

  if (role === "client") {
    if (page === "map") return <FoodResourceMapPage />;
    return <ClientPage />;
  }

  switch (page) {
    case "overview":
      return <OverviewPage />;
    case "map":
      return <FoodResourceMapPage />;
    case "reports":
      return <CommunityReportsPage />;
    case "trends":
      return <TrendsPage />;
    case "issues":
      return <ServiceIssuesPage />;
    case "table":
      return <DataTablePage />;
    case "settings":
      return <SettingsPage />;
    case "reliability":
      return <ReliabilityPage />;
    case "availability":
      return <FoodAvailabilityPage />;
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

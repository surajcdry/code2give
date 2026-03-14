"use client";

import { AppLayout, useApp } from "@/components/layout/AppLayout";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { FoodResourceMapPage } from "@/components/pages/FoodResourceMapPage";
import { CommunityReportsPage } from "@/components/pages/CommunityReportsPage";
import { TrendsPage } from "@/components/pages/TrendsPage";
import { ServiceIssuesPage } from "@/components/pages/ServiceIssuesPage";
import { SettingsPage } from "@/components/pages/SettingsPage";

function PageContent() {
  const { page } = useApp();

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
    case "settings":
      return <SettingsPage />;
    case "availability":
      return (
        <div className="space-y-6">
          <h1 className="text-gray-900">Food Availability</h1>
          <div className="bg-card rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              Real-time inventory tracking coming soon. Check the Trends page for weekly availability data.
            </p>
          </div>
        </div>
      );
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

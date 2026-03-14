import ImpactMap from "./ImpactMap";

export default function GovDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-primaryxl font-bold tracking-tight text-slate-900">City Planner Dashboard</h2>
        <div className="text-sm text-primary-foreground0">Last updated: Just now</div>
      </div>
      
      <p className="text-muted-foreground text-lg">
        Identify High Need / Low Coverage Food Deserts across the boroughs based on real SNAP data and Pantry density.
      </p>

      {/* Placeholder Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="font-medium text-destructive mb-1">Critical Priority Tracts</div>
          <div className="text-primaryxl font-bold text-red-900">12</div>
          <div className="text-sm text-red-700 mt-2 font-medium">Boroughs: Bronx, Brooklyn</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="font-medium text-primary-foreground0 mb-1">Total SNAP Need Met</div>
          <div className="text-primaryxl font-bold text-slate-900">42%</div>
          <div className="text-sm text-amber-600 mt-2">NYC Average</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="font-medium text-primary-foreground0 mb-1">New Pantries Needed</div>
          <div className="text-primaryxl font-bold text-slate-900">28</div>
          <div className="text-sm text-primary-foreground0 mt-2">To reach baseline coverage</div>
        </div>
      </div>
      
      {/* Map Widget */}
      <div className="mt-8">
        <ImpactMap />
      </div>
    </div>
  );
}

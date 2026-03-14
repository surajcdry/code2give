import ImpactMap from "./ImpactMap";

export default function DonorDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-primaryxl font-bold tracking-tight text-slate-900">Donor Dashboard</h2>
        <div className="text-sm text-primary-foreground0">Last updated: Just now</div>
      </div>
      
      <p className="text-muted-foreground text-lg">
        Track the ROI of your contributions and see exactly where communities are being served.
      </p>

      {/* Placeholder Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="font-medium text-primary-foreground0 mb-1">Total Meals Provided</div>
          <div className="text-primaryxl font-bold text-slate-900">124,500</div>
          <div className="text-sm text-green-600 mt-2 font-medium">+14% from last month</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="font-medium text-primary-foreground0 mb-1">Community Reach</div>
          <div className="text-primaryxl font-bold text-slate-900">42 Neighborhoods</div>
          <div className="text-sm text-primary-foreground0 mt-2">Across 5 Boroughs</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="font-medium text-primary-foreground0 mb-1">Active Pantries Run</div>
          <div className="text-primaryxl font-bold text-slate-900">18</div>
          <div className="text-sm text-amber-600 mt-2 font-medium">3 running low on stock</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <div className="font-medium text-secondary mb-1">Estimated ROI per $100</div>
          <div className="text-primaryxl font-bold text-emerald-900">45 Meals</div>
          <div className="text-sm text-emerald-700 mt-2">High Efficiency Tier</div>
        </div>
      </div>
      
      {/* Map Widget */}
      <div className="mt-8">
        <ImpactMap />
      </div>
    </div>
  );
}

import { BarChart3, Scan, Users, TrendingUp, CreditCard, Eye } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { getFaceScannerStats } from "@/lib/face-measurement-actions";
import { prisma } from "@/lib/db";

export const metadata = { title: "Face Scanner Analytics | Admin | Vision Vistara" };

export default async function FaceScannerAdminPage() {
  await requireAdmin();

  const stats = await getFaceScannerStats();

  // Funnel data from analytics events
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const funnelEvents = await prisma.analyticsEvent.groupBy({
    by: ["event"],
    where: {
      event: {
        in: [
          "face_scanner_opened",
          "camera_permission_granted",
          "camera_permission_denied",
          "calibration_completed",
          "calibration_skipped",
          "measurement_completed",
          "recommendations_viewed",
          "recommended_frame_clicked",
        ],
      },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  }).catch(() => []);

  type FunnelEvent = { event: string; _count: number };
  const funnelMap = new Map(funnelEvents.map((e: FunnelEvent) => [e.event, e._count]));

  const funnelSteps = [
    { label: "Scanner Opened", count: funnelMap.get("face_scanner_opened") ?? 0, icon: Scan },
    { label: "Camera Granted", count: funnelMap.get("camera_permission_granted") ?? 0, icon: Eye },
    { label: "Measurement Done", count: funnelMap.get("measurement_completed") ?? 0, icon: BarChart3 },
    { label: "Recommendations Viewed", count: funnelMap.get("recommendations_viewed") ?? 0, icon: Users },
    { label: "Frame Clicked", count: funnelMap.get("recommended_frame_clicked") ?? 0, icon: TrendingUp },
  ];

  return (
    <main className="vv-container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
          <Scan className="h-7 w-7 text-teal-600" />
          Face Scanner Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Camera-based face measurement and frame-fit recommendation metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Scans</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{stats.totalScans}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Confidence</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {stats.averageConfidence ? `${(stats.averageConfidence * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Card Calibrations</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {stats.calibrationMethodBreakdown.find((m) => m.method === "card")?.count ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Heuristic Only</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {stats.calibrationMethodBreakdown.find((m) => m.method === "heuristic")?.count ?? 0}
          </p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft mb-8">
        <h2 className="text-lg font-extrabold text-slate-800 mb-5">Conversion Funnel (30 days)</h2>
        <div className="grid gap-3">
          {funnelSteps.map((step, _i) => {
            const maxCount = funnelSteps[0].count || 1;
            const pct = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-700">{step.label}</span>
                    <span className="text-sm font-extrabold text-slate-900">{step.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Face Shape Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-extrabold text-slate-800 mb-4">Face Shape Distribution</h2>
          {stats.faceShapeDistribution.length > 0 ? (
            <div className="grid gap-2">
              {stats.faceShapeDistribution.map((item) => (
                <div key={item.shape} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-bold text-slate-700">{item.shape}</span>
                  <span className="rounded-full bg-teal-50 px-3 py-0.5 text-xs font-extrabold text-teal-700">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No scans yet</p>
          )}
        </div>

        {/* Measurement Quality */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-extrabold text-slate-800 mb-4">Measurement Quality</h2>
          {stats.qualityBreakdown.length > 0 ? (
            <div className="grid gap-2">
              {stats.qualityBreakdown.map((item) => (
                <div key={item.quality} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-bold text-slate-700">{item.quality}</span>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${
                    item.quality === "Good" ? "bg-emerald-50 text-emerald-700" :
                    item.quality === "Fair" ? "bg-amber-50 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No scans yet</p>
          )}
        </div>
      </div>

      {/* Recent Scans */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft mt-6">
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">Recent Scans</h2>
        {stats.recentScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">ID</th>
                  <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Face Shape</th>
                  <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Size</th>
                  <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Quality</th>
                  <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Method</th>
                  <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentScans.map((scan) => (
                  <tr key={scan.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-mono text-xs text-slate-400">{scan.id.slice(0, 8)}…</td>
                    <td className="py-2 font-bold text-slate-700">{scan.faceShape ?? "—"}</td>
                    <td className="py-2 text-slate-600">{scan.recommendedSize ?? "—"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        scan.measurementQuality === "Good" ? "bg-emerald-50 text-emerald-700" :
                        scan.measurementQuality === "Fair" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {scan.measurementQuality ?? "—"}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        {scan.calibrationMethod === "card" ? <CreditCard className="h-3 w-3" /> : null}
                        {scan.calibrationMethod ?? "—"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-slate-400">
                      {scan.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No scans recorded yet</p>
        )}
      </div>
    </main>
  );
}

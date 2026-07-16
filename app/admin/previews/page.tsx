import Link from "next/link";
import { ImageIcon, Sparkles } from "lucide-react";
import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { deleteTryOnAsset, getTryOnResultUrl } from "@/lib/integrations/gemini-try-on";

async function deletePreviewImages(formData: FormData) {
  "use server";

  const admin = await requireManager();
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !requestId) return;

  const preview = await prisma.framePreviewRequest.findUnique({
    where: { id: requestId },
    select: { customerImagePublicId: true, resultImagePublicId: true }
  });
  if (!preview) return;

  await Promise.all([
    preview.customerImagePublicId ? deleteTryOnAsset(preview.customerImagePublicId) : undefined,
    preview.resultImagePublicId ? deleteTryOnAsset(preview.resultImagePublicId) : undefined
  ]);
  await prisma.framePreviewRequest.update({
    where: { id: requestId },
    data: {
      customerImageUrl: null,
      customerImagePublicId: null,
      resultImageUrl: null,
      resultImagePublicId: null,
      resultBytes: null
    }
  });
  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
      action: "AI_PREVIEW_ASSETS_DELETED",
      entityType: "frame_preview_request",
      entityId: requestId
    }
  });
  revalidatePath("/admin/previews");
}

export default async function AdminPreviewsPage() {
  await requireManager();
  const [requests, statusGroups] = await Promise.all([
    prisma.framePreviewRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { product: { select: { name: true, brand: true, sku: true, slug: true } } }
    }),
    prisma.framePreviewRequest.groupBy({ by: ["status"], _count: { _all: true } })
  ]);
  const completed = requests.filter((request) => request.status === "READY");
  const failed = requests.filter((request) => request.status === "FAILED");
  const avgGenerationMs = completed.length
    ? Math.round(completed.reduce((total, request) => total + (request.generationMs ?? 0), 0) / completed.length)
    : 0;
  const storedResultBytes = completed.reduce((total, request) => total + (request.resultBytes ?? 0), 0);
  const providerCredits = completed.reduce((total, request) => total + (request.providerCost ?? 0), 0);
  const mostTried = [...requests].reduce<Record<string, number>>((counts, request) => {
    counts[request.productSlug] = (counts[request.productSlug] ?? 0) + 1;
    return counts;
  }, {});
  const mostTriedSlug = Object.entries(mostTried).sort(([, left], [, right]) => right - left)[0]?.[0] ?? "—";

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">AI previews</p>
        <h1 className="text-4xl font-extrabold">Frame preview requests</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Review Gemini-generated previews, failure reasons, cost estimates, cache reuse, and temporary customer-photo retention.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="vv-card p-4"><span className="text-xs font-extrabold uppercase text-slate-500">Success rate</span><strong className="mt-1 block text-2xl">{requests.length ? Math.round((completed.length / requests.length) * 100) : 0}%</strong><span className="text-xs text-slate-500">Last {requests.length} requests · {completed.length} ready · {failed.length} failed</span></div>
          <div className="vv-card p-4"><span className="text-xs font-extrabold uppercase text-slate-500">Average generation</span><strong className="mt-1 block text-2xl">{avgGenerationMs ? `${(avgGenerationMs / 1000).toFixed(1)}s` : "—"}</strong><span className="text-xs text-slate-500">completed previews</span></div>
          <div className="vv-card p-4"><span className="text-xs font-extrabold uppercase text-slate-500">Generated storage</span><strong className="mt-1 block text-2xl">{(storedResultBytes / (1024 * 1024)).toFixed(1)} MB</strong><span className="text-xs text-slate-500">result assets on this page</span></div>
          <div className="vv-card p-4"><span className="text-xs font-extrabold uppercase text-slate-500">Most tried frame</span><strong className="mt-1 block truncate text-lg">{mostTriedSlug}</strong><span className="text-xs text-slate-500">{providerCredits ? `$${providerCredits.toFixed(2)} estimated cost` : "Cost estimate unavailable"}</span></div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500">{statusGroups.map((group) => `${group.status.replace(/_/g, " ")}: ${group._count._all}`).join(" · ") || "No generation activity yet."}</p>

        <div className="mt-8 grid gap-3">
          {requests.length ? (
            requests.map((request) => (
              <article key={request.id} className="vv-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Sparkles className="h-5 w-5 text-retail" />
                    <h2 className="text-xl font-extrabold">
                      {request.product.brand} {request.product.name}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">SKU {request.product.sku} | Request {request.id}</p>
                  <p className="mt-1 text-xs text-slate-500">{request.model ?? "Legacy preview"}{request.generationMs ? ` · ${(request.generationMs / 1000).toFixed(1)}s` : ""}{request.providerCost !== null ? ` · ${request.providerCost.toFixed(2)} credits` : ""}</p>
                  {request.failureReason ? <p className="mt-3 text-sm font-bold text-amber-800">{request.failureReason}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Link className="vv-button-light" href={`/frames/${request.product.slug}?preview=admin`}>
                    View frame
                  </Link>
                  {getTryOnResultUrl(request.customerImagePublicId, request.customerImageUrl) ? (
                    <a className="vv-button-light" href={getTryOnResultUrl(request.customerImagePublicId, request.customerImageUrl) ?? "#"} target="_blank" rel="noopener">
                      <ImageIcon className="h-4 w-4" />
                      Customer image
                    </a>
                  ) : null}
                  {getTryOnResultUrl(request.resultImagePublicId, request.resultImageUrl) ? (
                    <a className="vv-button-retail" href={getTryOnResultUrl(request.resultImagePublicId, request.resultImageUrl) ?? "#"} target="_blank" rel="noopener">
                      Result image
                    </a>
                  ) : null}
                  {request.customerImageUrl || request.resultImageUrl ? (
                    <form action={deletePreviewImages}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button type="submit" className="vv-button-light w-full text-rose-700">
                        Delete stored images
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="vv-card p-6 text-slate-600">No preview requests yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}

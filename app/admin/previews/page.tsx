import Link from "next/link";
import { ImageIcon, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export default async function AdminPreviewsPage() {
  await requireAdmin();
  const requests = await prisma.framePreviewRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { product: { select: { name: true, brand: true, sku: true, slug: true } } }
  });

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">AI previews</p>
        <h1 className="text-4xl font-extrabold">Frame preview requests</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Staff can review generated and fallback requests. Fallback requests mean the selected-frame preview pipeline did not return a trustworthy result.
        </p>

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
                  {request.failureReason ? <p className="mt-3 text-sm font-bold text-amber-800">{request.failureReason}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Link className="vv-button-light" href={`/frames/${request.product.slug}?preview=admin`}>
                    View frame
                  </Link>
                  <a className="vv-button-light" href={request.customerImageUrl} target="_blank" rel="noopener">
                    <ImageIcon className="h-4 w-4" />
                    Customer image
                  </a>
                  {request.resultImageUrl ? (
                    <a className="vv-button-retail" href={request.resultImageUrl} target="_blank" rel="noopener">
                      Result image
                    </a>
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

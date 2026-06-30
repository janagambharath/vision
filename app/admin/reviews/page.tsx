import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Star, CheckCircle, Trash2, ShieldAlert, MessageSquare } from "lucide-react";
import { requireAdmin, requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Review Moderation | Admin" };

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: true }
  });

  async function approveReviewAction(formData: FormData) {
    "use server";
    await requireManager();

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    await prisma.review.update({
      where: { id },
      data: { approved: true }
    });

    await prisma.activityLog.create({
      data: {
        action: "REVIEW_APPROVED",
        entityType: "review",
        entityId: id
      }
    });

    revalidatePath("/admin/reviews");
  }

  async function deleteReviewAction(formData: FormData) {
    "use server";
    await requireManager();

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    await prisma.review.delete({
      where: { id }
    });

    await prisma.activityLog.create({
      data: {
        action: "REVIEW_DELETED",
        entityType: "review",
        entityId: id
      }
    });

    revalidatePath("/admin/reviews");
  }

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container">
        {/* Header */}
        <div className="mb-8">
          <p className="vv-kicker text-retail">Customer Feedback</p>
          <h1 className="text-4xl font-extrabold text-slate-900">Review Moderation</h1>
          <p className="mt-2 text-slate-600">Approve or reject customer product reviews before they appear online.</p>
        </div>

        {reviews.length === 0 ? (
          <div className="vv-card p-12 text-center text-slate-500">
            No customer reviews submitted yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((rev) => {
              return (
                <article
                  key={rev.id}
                  className={`vv-card p-6 grid gap-4 md:grid-cols-[1fr_200px] items-start hover:shadow-md transition-all ${
                    !rev.approved ? "border-l-4 border-l-amber-500 bg-amber-50/5" : ""
                  }`}
                >
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900">{rev.name || "Anonymous"}</span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-xs text-slate-500">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      <span className="text-slate-400 text-xs">•</span>
                      <Link href={`/frames/${rev.product.slug}`} className="text-xs font-bold text-retail hover:underline">
                        Product: {rev.product.brand} {rev.product.name}
                      </Link>
                    </div>

                    {/* Star Ratings */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>

                    {rev.title ? <h3 className="font-extrabold text-slate-800 text-base">{rev.title}</h3> : null}
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{rev.body}"</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 justify-stretch border-t border-slate-100 md:border-t-0 md:border-l md:border-slate-100 pt-4 md:pt-0 md:pl-6 self-center">
                    <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                      {rev.approved ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-700">Live on Store</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-700">Pending Approval</span>
                        </>
                      )}
                    </div>

                    {!rev.approved ? (
                      <form action={approveReviewAction}>
                        <input type="hidden" name="id" value={rev.id} />
                        <button className="vv-button bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 w-full justify-center" type="submit">
                          Approve Review
                        </button>
                      </form>
                    ) : null}

                    <form action={deleteReviewAction} onSubmit={(e) => {
                      if (!confirm("Are you sure you want to delete this review?")) {
                        e.preventDefault();
                      }
                    }}>
                      <input type="hidden" name="id" value={rev.id} />
                      <button className="vv-button bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs py-2 w-full justify-center flex items-center gap-1" type="submit">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

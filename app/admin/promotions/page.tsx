import { Plus, LayoutTemplate } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin Promotions" };

export default async function AdminPromotionsPage() {
  await requireAdmin();

  const [banners, homepageSections] = await Promise.all([
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.homepageSection.findMany({ orderBy: { sortOrder: "asc" } })
  ]);

  async function createBanner(formData: FormData) {
    "use server";
    await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    const subtitle = String(formData.get("subtitle") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const href = String(formData.get("href") ?? "").trim();
    const sortOrder = Number(formData.get("sortOrder") ?? 0);

    if (!title) redirect("/admin/promotions?error=missing-title");

    await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl: imageUrl || null,
        href: href || null,
        sortOrder,
        active: true
      }
    });

    redirect("/admin/promotions");
  }

  return (
    <main className="vv-section">
      <div className="vv-container grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Banner list & sections list */}
        <div className="grid gap-6">
          {/* Banners */}
          <section>
            <div className="mb-6">
              <p className="vv-kicker text-retail">Admin</p>
              <h1 className="text-4xl font-extrabold">Banners &amp; Promos</h1>
              <p className="mt-2 text-slate-600">Design store headers, slide banners, and promotional links.</p>
            </div>

            <div className="grid gap-4">
              {banners.map((banner) => (
                <article key={banner.id} className="vv-card p-5 hover:shadow-strong transition">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5 text-retail" />
                        {banner.title}
                      </h2>
                      {banner.subtitle ? <p className="text-sm text-slate-600 mt-1">{banner.subtitle}</p> : null}
                      <p className="text-xs text-slate-400 mt-2">
                        Link: <strong className="text-slate-700">{banner.href ?? "None"}</strong> · 
                        Image: <strong className="text-slate-700">{banner.imageUrl ? "Configured" : "None"}</strong>
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      banner.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {banner.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Homepage Sections */}
          <section>
            <h2 className="text-2xl font-extrabold mb-4 border-b border-slate-100 pb-2">Clinic homepage sections</h2>
            <div className="grid gap-3">
              {homepageSections.map((section) => (
                <div key={section.id} className="vv-card p-4 flex justify-between items-center text-sm">
                  <div>
                    <strong>{section.title}</strong>
                    <p className="text-xs text-slate-500">Key: {section.key}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    section.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                  }`}>
                    {section.active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Add Banner Sidebar */}
        <aside className="vv-card p-6 self-start sticky top-28 bg-slate-50">
          <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">Add Promo Banner</h2>
          <form action={createBanner} className="grid gap-4">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Banner Title *
              <input className="store-input" type="text" name="title" required placeholder="e.g. Winter Sale 50% Off" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Subtitle
              <input className="store-input" type="text" name="subtitle" placeholder="e.g. Applicable on all full rim frames" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Image URL
              <input className="store-input" type="text" name="imageUrl" placeholder="e.g. /assets/banners/winter-sale.jpg" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Destination URL (Link)
              <input className="store-input" type="text" name="href" placeholder="e.g. /frames/category/premium" />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Display Sort Order
              <input className="store-input" type="number" name="sortOrder" defaultValue="0" />
            </label>
            <button className="vv-button-retail mt-2 w-full inline-flex items-center justify-center gap-2" type="submit">
              <Plus className="h-4 w-4" />
              Add Banner
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}

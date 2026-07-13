import { Plus, Edit, Trash2, Gem, Save, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Brands | Admin" };

export default async function AdminBrandsPage() {
  await requireAdmin();

  const brands = await prisma.brand.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } }
  });

  async function createBrand(formData: FormData) {
    "use server";
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const description = String(formData.get("description") ?? "").trim() || null;
    const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
    const bannerUrl = String(formData.get("bannerUrl") ?? "").trim() || null;
    const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
    const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
    const active = formData.get("active") === "on";
    const sortOrder = Number(formData.get("sortOrder") ?? 0);

    if (!name) {
      redirect("/admin/brands?error=name-required");
    }

    await prisma.brand.create({
      data: { slug, name, description, logoUrl, bannerUrl, seoTitle, seoDescription, active, sortOrder }
    });

    await prisma.activityLog.create({
      data: { action: "BRAND_CREATED", entityType: "brand", metadata: { slug, name } }
    });

    revalidatePath("/admin/brands");
    redirect("/admin/brands");
  }

  async function updateBrand(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id")).trim();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
    const bannerUrl = String(formData.get("bannerUrl") ?? "").trim() || null;
    const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
    const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
    const active = formData.get("active") === "on";
    const sortOrder = Number(formData.get("sortOrder") ?? 0);

    await prisma.brand.update({
      where: { id },
      data: { name, slug, description, logoUrl, bannerUrl, seoTitle, seoDescription, active, sortOrder }
    });

    revalidatePath("/admin/brands");
    redirect("/admin/brands");
  }

  async function deleteBrand(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id")).trim();

    // Remove brand reference from products
    await prisma.product.updateMany({
      where: { brandId: id },
      data: { brandId: null }
    });

    await prisma.brand.delete({ where: { id } });

    revalidatePath("/admin/brands");
    redirect("/admin/brands");
  }

  return (
    <main className="vv-section">
      <div className="vv-container max-w-5xl">
        <div className="mb-6">
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-4xl font-extrabold flex items-center gap-3">
            <Gem className="h-8 w-8 text-teal-600" />
            Brand Management
          </h1>
          <p className="mt-1 text-slate-600">{brands.length} brands registered</p>
        </div>

        {/* Create New Brand */}
        <details className="vv-card mb-6 group">
          <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-extrabold text-teal-700 hover:text-teal-900">
            <Plus className="h-4 w-4" />
            Register New Brand
          </summary>
          <form action={createBrand} className="border-t border-slate-100 p-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Brand Name *
                <input className="store-input" type="text" name="name" required placeholder="e.g. Vision Vistara" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Slug
                <input className="store-input" type="text" name="slug" placeholder="Auto-generated from name" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Description
              <textarea className="store-input min-h-16 py-2" name="description" placeholder="Brand story, origin, specialty..." />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Logo URL
                <input className="store-input" type="text" name="logoUrl" placeholder="Brand logo image URL" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Banner URL
                <input className="store-input" type="text" name="bannerUrl" placeholder="Brand banner image URL" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                SEO Title
                <input className="store-input" type="text" name="seoTitle" placeholder="SEO page title" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                SEO Description
                <input className="store-input" type="text" name="seoDescription" placeholder="SEO meta description" />
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600 w-24">
                Sort Order
                <input className="store-input" type="number" name="sortOrder" defaultValue={0} />
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer self-end mb-1">
                <input type="checkbox" name="active" defaultChecked className="rounded border-slate-300 text-teal-600 h-4 w-4" />
                Active
              </label>
              <button className="vv-button-retail inline-flex items-center gap-2 self-end" type="submit">
                <Save className="h-4 w-4" /> Create Brand
              </button>
            </div>
          </form>
        </details>

        {/* Brand List */}
        <div className="grid gap-2">
          {brands.map((brand) => (
            <details key={brand.id} className="vv-card group">
              <summary className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50 transition rounded-xl">
                <div className="flex items-center gap-3">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt={brand.name} className="h-8 w-8 rounded-lg object-contain border border-slate-100" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 font-extrabold text-sm">
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="font-extrabold text-slate-900">{brand.name}</span>
                    <span className="ml-2 text-xs text-slate-400">/{brand.slug}</span>
                    {!brand.active && (
                      <span className="ml-2 text-xs font-bold text-red-500 bg-red-50 rounded-full px-1.5 py-0.5">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">{brand._count.products} products</span>
                  <Edit className="h-4 w-4 text-slate-400" />
                </div>
              </summary>

              <div className="border-t border-slate-100 p-4">
                <form action={updateBrand} className="grid gap-3">
                  <input type="hidden" name="id" value={brand.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                      Name <input className="store-input text-sm" name="name" defaultValue={brand.name} />
                    </label>
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                      Slug <input className="store-input text-sm" name="slug" defaultValue={brand.slug} />
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                    Description <textarea className="store-input text-sm min-h-12 py-1" name="description" defaultValue={brand.description ?? ""} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                      Logo URL <input className="store-input text-sm" name="logoUrl" defaultValue={brand.logoUrl ?? ""} />
                    </label>
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                      Banner URL <input className="store-input text-sm" name="bannerUrl" defaultValue={brand.bannerUrl ?? ""} />
                    </label>
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                      SEO Title <input className="store-input text-sm" name="seoTitle" defaultValue={brand.seoTitle ?? ""} />
                    </label>
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600">
                      SEO Description <input className="store-input text-sm" name="seoDescription" defaultValue={brand.seoDescription ?? ""} />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="grid gap-1 text-xs font-extrabold text-slate-600 w-20">
                      Order <input className="store-input text-sm" type="number" name="sortOrder" defaultValue={brand.sortOrder} />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" name="active" defaultChecked={brand.active} className="rounded border-slate-300 text-teal-600 h-3.5 w-3.5" />
                      Active
                    </label>
                    <button className="vv-button-retail text-xs px-3 py-1.5 inline-flex items-center gap-1 ml-auto" type="submit">
                      <Save className="h-3.5 w-3.5" /> Update
                    </button>
                  </div>
                </form>
                <form action={deleteBrand} className="mt-2 border-t border-slate-100 pt-2">
                  <input type="hidden" name="id" value={brand.id} />
                  <button className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-600 transition" type="submit">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Brand
                  </button>
                </form>
              </div>
            </details>
          ))}

          {brands.length === 0 && (
            <div className="vv-card p-12 text-center text-slate-500">
              No brands yet. Use the form above to register your first brand.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

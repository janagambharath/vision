import Link from "next/link";
import { Plus, Edit, Eye, Star, Search, Filter, AlertTriangle, Archive, Copy, Trash2, CheckCircle, XCircle, Camera } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/money";
import { getStoreProducts, getStoreProductsCount } from "@/lib/store-data";
import { deleteProduct, archiveProduct, publishProduct, unpublishProduct, duplicateProduct } from "@/lib/product-actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin Products" };

const PAGE_SIZE = 50;

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const currentPage = Math.max(1, Number(params.page ?? 1));

  const options = {
    query: params.q,
    includeDrafts: true,
    page: currentPage,
    limit: PAGE_SIZE,
    sort: "new" as const
  };

  let products = await getStoreProducts(options);
  const totalCount = await getStoreProductsCount({ includeDrafts: true, query: params.q });

  if (params.status) {
    products = products.filter((p) => p.status === params.status);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function handlePublish(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug"));
    await publishProduct(slug);
    redirect("/admin/products");
  }
  async function handleUnpublish(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug"));
    await unpublishProduct(slug);
    redirect("/admin/products");
  }
  async function handleArchive(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug"));
    await archiveProduct(slug);
    redirect("/admin/products");
  }
  async function handleDelete(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug"));
    await deleteProduct(slug);
    redirect("/admin/products");
  }
  async function handleDuplicate(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug"));
    await duplicateProduct(slug);
    redirect("/admin/products");
  }

  const activeProducts = products.filter(p => p.status === "ACTIVE");
  const activeCount = activeProducts.length;
  const draftCount = products.filter(p => p.status === "DRAFT").length;
  const archivedCount = products.filter(p => p.status === "ARCHIVED").length;
  const imageUrlCounts: Record<string, number> = {};
  activeProducts.forEach(p => {
    p.images
      .filter(img => img.role !== "ar")
      .forEach(img => {
        imageUrlCounts[img.url] = (imageUrlCounts[img.url] || 0) + 1;
      });
  });
  const duplicateUrls = Object.keys(imageUrlCounts).filter(url => imageUrlCounts[url] > 1);
  const activeProductsWithDuplicateImages = activeProducts.filter(p =>
    p.images.some(img => img.role !== "ar" && duplicateUrls.includes(img.url))
  );
  const tryOnReadyCount = activeProducts.filter((p) => p.tryOnEligible && p.arImageUrl).length;
  const tryOnMissingArProducts = activeProducts.filter((p) => p.tryOnEligible && !p.arImageUrl);

  return (
    <main className="vv-section">
      <div className="vv-container">
        {activeProductsWithDuplicateImages.length > 0 ? (
          <div className="mb-6 rounded-vv border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex flex-col gap-2">
            <h3 className="font-extrabold text-base flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              Image integrity warning
            </h3>
            <p>These active products are reusing the same product photo. Use unique product photography before launch.</p>
            <ul className="list-disc list-inside mt-1 font-semibold">
              {activeProductsWithDuplicateImages.map(p => (
                <li key={p.slug}>{p.brand} {p.name} ({p.sku})</li>
              ))}
            </ul>
          </div>
        ) : null}

        {tryOnMissingArProducts.length > 0 ? (
          <div className="mb-6 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex flex-col gap-2">
            <h3 className="font-extrabold text-base flex items-center gap-1.5">
              <Camera className="h-5 w-5 text-amber-600 shrink-0" />
              Try-on readiness warning
            </h3>
            <p>These active products are marked for virtual try-on but do not have an AR overlay URL:</p>
            <ul className="list-disc list-inside mt-1 font-semibold">
              {tryOnMissingArProducts.map(p => (
                <li key={p.slug}>{p.brand} {p.name} ({p.sku})</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="vv-kicker text-retail">Admin</p>
            <h1 className="text-4xl font-extrabold">Product Catalog</h1>
            <p className="mt-1 text-slate-600">
              {totalCount} total products · {activeCount} active · {draftCount} drafts · {archivedCount} archived
            </p>
          </div>
          <Link href="/admin/products/new" className="vv-button-retail inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Product
          </Link>
        </div>

        <div className="vv-card mb-6 p-4">
          <form className="grid gap-3 md:grid-cols-3" method="get" action="/admin/products">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Search Products
              <div className="relative">
                <input className="store-input pl-9" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Search name, brand, SKU..." />
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Filter by Status
              <select className="store-input" name="status" defaultValue={params.status ?? ""}>
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active (Live)</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <button className="vv-button-retail self-end" type="submit">
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
          </form>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-vv border border-slate-200 bg-white p-4">
            <span className="text-xs font-extrabold uppercase text-slate-500">Active products on page</span>
            <strong className="mt-1 block text-2xl text-slate-900">{activeProducts.length}</strong>
          </div>
          <div className="rounded-vv border border-slate-200 bg-white p-4">
            <span className="text-xs font-extrabold uppercase text-slate-500">Try-on ready</span>
            <strong className="mt-1 block text-2xl text-teal-700">{tryOnReadyCount}</strong>
          </div>
          <div className="rounded-vv border border-slate-200 bg-white p-4">
            <span className="text-xs font-extrabold uppercase text-slate-500">Missing AR overlay</span>
            <strong className={`mt-1 block text-2xl ${tryOnMissingArProducts.length ? "text-amber-700" : "text-slate-900"}`}>
              {tryOnMissingArProducts.length}
            </strong>
          </div>
        </div>

        <div className="grid gap-3">
          {products.length ? (
            products.map((product) => (
              <article key={product.slug} className="vv-card grid gap-4 p-4 md:grid-cols-[1fr_auto] items-center hover:shadow-strong transition">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">{product.brand} {product.name}</h2>
                    {product.featured && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Featured
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      product.status === "DRAFT" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>{product.status}</span>
                    {product.tryOnEligible && product.arImageUrl ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
                        <Camera className="h-3 w-3" /> Try-on ready
                      </span>
                    ) : product.tryOnEligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <Camera className="h-3 w-3" /> Needs AR
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    SKU: <strong className="text-slate-800">{product.sku}</strong> ·
                    Price: <strong className="text-retail">{formatMoney(product.pricePaise)}</strong> ·
                    Stock: <strong className={product.inventoryQuantity <= 2 ? "text-red-600 font-extrabold" : "text-slate-800"}>{product.inventoryQuantity} pcs</strong>
                    {product.gender && <> · {product.gender}</>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {[product.material, product.colour, product.shape, product.rimType].filter(Boolean).join(" · ")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 md:self-center">
                  <Link className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700 transition" href={`/frames/${product.slug}`} target="_blank">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Link>
                  <Link className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition" href={`/admin/products/${product.slug}/edit`}>
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Link>

                  {product.status === "DRAFT" ? (
                    <form action={handlePublish}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <button className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition" type="submit">
                        <CheckCircle className="h-3.5 w-3.5" /> Publish
                      </button>
                    </form>
                  ) : product.status === "ACTIVE" ? (
                    <form action={handleUnpublish}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <button className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition" type="submit">
                        <XCircle className="h-3.5 w-3.5" /> Unpublish
                      </button>
                    </form>
                  ) : null}

                  <form action={handleDuplicate}>
                    <input type="hidden" name="slug" value={product.slug} />
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition" type="submit">
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </button>
                  </form>

                  {product.status !== "ARCHIVED" && (
                    <form action={handleArchive}>
                      <input type="hidden" name="slug" value={product.slug} />
                      <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-amber-700 hover:border-amber-300 transition" type="submit">
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                    </form>
                  )}

                  <form action={handleDelete}>
                    <input type="hidden" name="slug" value={product.slug} />
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-red-700 hover:border-red-300 transition" type="submit">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div className="vv-card p-12 text-center text-slate-500">
              No products found matching filters.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={`/admin/products?page=${currentPage - 1}${params.q ? `&q=${params.q}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700 transition"
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm font-bold text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/admin/products?page=${currentPage + 1}${params.q ? `&q=${params.q}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700 transition"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

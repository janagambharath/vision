import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getCategories } from "@/lib/store-data";

export const metadata = { title: "Edit Product | Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug: currentSlug } = await params;
  const categories = await getCategories();

  const product = await prisma.product.findUnique({
    where: { slug: currentSlug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      inventory: true,
      categories: true
    }
  });

  if (!product) {
    notFound();
  }

  async function updateProduct(formData: FormData) {
    "use server";
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const status = String(formData.get("status") ?? "DRAFT") as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const featured = formData.get("featured") === "on";
    const tryAtHomeEligible = formData.get("tryAtHomeEligible") === "on";
    
    const pricePaise = formData.get("pricePaise") ? Math.round(Number(formData.get("pricePaise")) * 100) : null;
    const compareAtPaise = formData.get("compareAtPaise") ? Math.round(Number(formData.get("compareAtPaise")) * 100) : null;
    const quantity = Number(formData.get("quantity") ?? 0);

    const description = String(formData.get("description") ?? "").trim();
    const material = String(formData.get("material") ?? "").trim();
    const colour = String(formData.get("colour") ?? "").trim();
    const shape = String(formData.get("shape") ?? "").trim();
    const rimType = String(formData.get("rimType") ?? "").trim();
    const size = String(formData.get("size") ?? "").trim();
    const measurements = String(formData.get("measurements") ?? "").trim();
    const careInstructions = String(formData.get("careInstructions") ?? "").trim();
    const warranty = String(formData.get("warranty") ?? "").trim();
    const returnPolicy = String(formData.get("returnPolicy") ?? "").trim();
    const deliveryEstimate = String(formData.get("deliveryEstimate") ?? "").trim();

    const selectedCategories = formData.getAll("categories").map(String);
    const highlights = String(formData.get("highlights") ?? "").split("\n").map(h => h.trim()).filter(Boolean);
    const faceShapes = String(formData.get("faceShapes") ?? "").split(",").map(f => f.trim()).filter(Boolean);
    const lensCompatibility = String(formData.get("lensCompatibility") ?? "").split("\n").map(l => l.trim()).filter(Boolean);
    
    const imageUrl1 = String(formData.get("imageUrl1") ?? "").trim();
    const imageAlt1 = String(formData.get("imageAlt1") ?? "").trim() || `${brand} ${name} Front View`;
    const imageUrl2 = String(formData.get("imageUrl2") ?? "").trim();
    const imageAlt2 = String(formData.get("imageAlt2") ?? "").trim() || `${brand} ${name} Angle View`;

    if (!name || !brand || !sku) {
      redirect(`/admin/products/${currentSlug}/edit?error=missing-fields`);
    }

    // Update main product details
    await prisma.product.update({
      where: { id: product.id },
      data: {
        slug,
        sku,
        name,
        brand,
        status,
        featured,
        tryAtHomeEligible,
        pricePaise,
        compareAtPaise,
        description,
        material,
        colour,
        shape,
        rimType,
        size,
        measurements,
        careInstructions,
        warranty,
        returnPolicy,
        deliveryEstimate,
        highlights,
        faceShapes,
        lensCompatibility,
        searchText: [sku, name, brand, material, colour, shape, rimType, selectedCategories.join(" ")].join(" ")
      }
    });

    // Update Inventory
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {
        quantity,
        status: pricePaise ? (quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "PRICE_REQUIRED"
      },
      create: {
        productId: product.id,
        quantity,
        status: pricePaise ? (quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "PRICE_REQUIRED",
        location: "Vision Vistara clinic inventory"
      }
    });

    // Update Images (clear existing and rewrite)
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (imageUrl1) {
      await prisma.productImage.create({
        data: { productId: product.id, url: imageUrl1, alt: imageAlt1, role: "front", sortOrder: 0 }
      });
    }
    if (imageUrl2) {
      await prisma.productImage.create({
        data: { productId: product.id, url: imageUrl2, alt: imageAlt2, role: "angle", sortOrder: 1 }
      });
    }

    // Update Linked Categories
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    for (const catSlug of selectedCategories) {
      const category = await prisma.category.findUnique({ where: { slug: catSlug } });
      if (category) {
        await prisma.productCategory.create({
          data: { productId: product.id, categoryId: category.id }
        });
      }
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "PRODUCT_UPDATED",
        entityType: "product",
        entityId: product.id,
        metadata: { slug, name, brand }
      }
    });

    redirect("/admin/products");
  }

  const linkedCategorySlugs = product.categories.map(c => {
    const found = categories.find(cat => cat.id === c.categoryId);
    return found ? found.slug : "";
  }).filter(Boolean);

  const highlightsText = product.highlights.join("\n");
  const faceShapesText = product.faceShapes.join(", ");
  const lensCompatibilityText = product.lensCompatibility.join("\n");

  const image1 = product.images.find(img => img.role === "front") || product.images[0];
  const image2 = product.images.find(img => img.role === "angle") || product.images[1];

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container max-w-4xl">
        <Link href="/admin/products" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-4xl font-extrabold">Edit Frame: {product.brand} {product.name}</h1>
          <p className="mt-2 text-slate-600">Update frame details, categories, pricing, stock levels, and images.</p>
        </div>

        <form action={updateProduct} className="grid gap-6">
          {/* General Information */}
          <section className="vv-card p-6">
            <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">General Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Frame Name *
                <input className="store-input" type="text" name="name" required defaultValue={product.name} placeholder="e.g. Classic Aviator 3001" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Brand *
                <input className="store-input" type="text" name="brand" required defaultValue={product.brand} placeholder="e.g. Vision Vistara" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                SKU *
                <input className="store-input" type="text" name="sku" required defaultValue={product.sku} placeholder="e.g. VV-3001" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Slug
                <input className="store-input" type="text" name="slug" defaultValue={product.slug} placeholder="e.g. classic-aviator-3001" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600 mt-4">
              Description *
              <textarea className="store-input min-h-24 py-2" name="description" required defaultValue={product.description} placeholder="Describe the frame design, materials, comfort, style..." />
            </label>
          </section>

          {/* Pricing & Inventory */}
          <section className="vv-card p-6">
            <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">Pricing &amp; Inventory</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Price (INR) *
                <input className="store-input" type="number" step="0.01" name="pricePaise" required defaultValue={product.pricePaise ? product.pricePaise / 100 : ""} placeholder="e.g. 1899.00" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Compare-at Price (INR)
                <input className="store-input" type="number" step="0.01" name="compareAtPaise" defaultValue={product.compareAtPaise ? product.compareAtPaise / 100 : ""} placeholder="e.g. 2499.00" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Stock Quantity *
                <input className="store-input" type="number" name="quantity" required defaultValue={product.inventory?.quantity ?? 0} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
                <input type="checkbox" name="featured" defaultChecked={product.featured} className="rounded border-slate-300 text-retail focus:ring-retail h-4 w-4" />
                Feature on Homepage / Store
              </label>
              <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700 cursor-pointer">
                <input type="checkbox" name="tryAtHomeEligible" defaultChecked={product.tryAtHomeEligible} className="rounded border-slate-300 text-retail focus:ring-retail h-4 w-4" />
                Eligible for Try-at-Home
              </label>
            </div>
          </section>

          {/* Categories & Specifications */}
          <section className="vv-card p-6">
            <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">Categories &amp; Specifications</h2>
            
            <div className="mb-4">
              <span className="block text-sm font-extrabold text-slate-600 mb-2">Categories</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <label key={cat.slug} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input type="checkbox" name="categories" value={cat.slug} defaultChecked={linkedCategorySlugs.includes(cat.slug)} className="rounded border-slate-300 text-retail focus:ring-retail h-4 w-4" />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Material
                <input className="store-input" type="text" name="material" defaultValue={product.material ?? ""} placeholder="e.g. Metal Alloy / Acetate" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Colour
                <input className="store-input" type="text" name="colour" defaultValue={product.colour ?? ""} placeholder="e.g. Gunmetal / Black" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Shape
                <input className="store-input" type="text" name="shape" defaultValue={product.shape ?? ""} placeholder="e.g. Aviator / Round / Square" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Rim Type
                <input className="store-input" type="text" name="rimType" defaultValue={product.rimType ?? ""} placeholder="e.g. Full Rim / Half Rim / Rimless" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Size
                <input className="store-input" type="text" name="size" defaultValue={product.size ?? ""} placeholder="e.g. 55-16-145" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Measurements
                <input className="store-input" type="text" name="measurements" defaultValue={product.measurements ?? ""} placeholder="e.g. 55-16-145" />
              </label>
            </div>
          </section>

          {/* Product Media (Images) */}
          <section className="vv-card p-6">
            <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">Product Media</h2>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Primary Image URL (Front View)
                  <input className="store-input" type="text" name="imageUrl1" defaultValue={image1?.url ?? ""} placeholder="e.g. /assets/inventory/suphous-pink-96409/front.png" />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Primary Image Alt Text
                  <input className="store-input" type="text" name="imageAlt1" defaultValue={image1?.alt ?? ""} placeholder="e.g. Front view of classic aviator frame" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Secondary Image URL (Angle/Side View)
                  <input className="store-input" type="text" name="imageUrl2" defaultValue={image2?.url ?? ""} placeholder="e.g. /assets/inventory/suphous-pink-96409/left45.png" />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Secondary Image Alt Text
                  <input className="store-input" type="text" name="imageAlt2" defaultValue={image2?.alt ?? ""} placeholder="e.g. Left angle view of classic aviator frame" />
                </label>
              </div>
            </div>
          </section>

          {/* Custom specifications lists */}
          <section className="vv-card p-6">
            <h2 className="text-xl font-extrabold mb-4 border-b border-slate-100 pb-2">Highlights &amp; Policy</h2>
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Highlights (one per line)
                <textarea className="store-input min-h-20 py-2" name="highlights" defaultValue={highlightsText} placeholder="Double bridge aviator&#10;Silicone nose pads&#10;Corrosion-resistant alloy" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Face Shapes (comma separated)
                <input className="store-input" type="text" name="faceShapes" defaultValue={faceShapesText} placeholder="Oval, Square, Rectangle, Heart" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Lens Compatibility (one per line)
                <textarea className="store-input min-h-20 py-2" name="lensCompatibility" defaultValue={lensCompatibilityText} placeholder="Single vision prescription lenses&#10;Anti-reflective coating&#10;Photochromic lenses" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Care Instructions
                  <textarea className="store-input min-h-16 py-2" name="careInstructions" defaultValue={product.careInstructions ?? ""} placeholder="e.g. Clean with microfiber cloth..." />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Warranty Terms
                  <textarea className="store-input min-h-16 py-2" name="warranty" defaultValue={product.warranty ?? ""} placeholder="e.g. 1-year manufacturer warranty..." />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Return Policy
                  <textarea className="store-input min-h-16 py-2" name="returnPolicy" defaultValue={product.returnPolicy ?? ""} placeholder="e.g. 7-day easy return on frame-only..." />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Delivery Estimate
                  <textarea className="store-input min-h-16 py-2" name="deliveryEstimate" defaultValue={product.deliveryEstimate ?? ""} placeholder="e.g. 3–5 business days..." />
                </label>
              </div>
            </div>
          </section>

          {/* Status & Save */}
          <section className="vv-card p-6 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
            <label className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
              Publish Status
              <select className="store-input min-w-36" name="status" defaultValue={product.status}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active (Live in Store)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <button className="vv-button-retail inline-flex items-center gap-2" type="submit">
              <Save className="h-4 w-4" />
              Update Product
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}

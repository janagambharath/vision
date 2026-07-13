import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getCategories, getBrands } from "@/lib/store-data";
import { invalidateProductCache } from "@/lib/inventory-actions";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit Product | Admin" };

const errorMessages: Record<string, string> = {
  "missing-fields": "Name, brand, and SKU are required.",
  "invalid-slug": "Slug must use lowercase letters, numbers, and hyphens only.",
  "duplicate-slug": "Another product already uses that slug.",
  "duplicate-sku": "Another product already uses that SKU.",
  "try-on-ar-required": "Virtual try-on requires a transparent AR overlay URL."
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readImages(formData: FormData, productId: string, brand: string, name: string, arImageUrl: string) {
  const imageCount = Number(formData.get("image_count") ?? 0);
  const images: Array<{ productId: string; url: string; alt: string; role: string; sortOrder: number }> = [];

  for (let i = 0; i < imageCount; i += 1) {
    const url = String(formData.get(`image_url_${i}`) ?? "").trim();
    const alt = String(formData.get(`image_alt_${i}`) ?? "").trim();
    const role = String(formData.get(`image_role_${i}`) ?? "gallery");
    const sortOrder = Number(formData.get(`image_sort_${i}`) ?? i);
    if (url) images.push({ productId, url, alt, role, sortOrder });
  }

  if (arImageUrl && !images.some((image) => image.role === "ar" && image.url === arImageUrl)) {
    images.push({
      productId,
      url: arImageUrl,
      alt: `${brand} ${name} AR overlay`,
      role: "ar",
      sortOrder: images.length
    });
  }

  return images;
}

export default async function EditProductPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { slug: currentSlug } = await params;
  const query = (await searchParams) ?? {};
  const errorMessage = query.error ? errorMessages[query.error] : null;
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);

  const product = await prisma.product.findUnique({
    where: { slug: currentSlug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      inventory: true,
      categories: true
    }
  });

  if (!product) notFound();

  const linkedCategorySlugs = product.categories.map(c => {
    const found = categories.find(cat => cat.id === c.categoryId);
    return found ? found.slug : "";
  }).filter(Boolean);

  async function updateProduct(formData: FormData) {
    "use server";
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    const barcode = String(formData.get("barcode") ?? "").trim() || null;
    const slug = slugify(String(formData.get("slug") ?? "").trim() || `${brand}-${name}`);
    const status = String(formData.get("status") ?? "DRAFT") as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const featured = formData.get("featured") === "on";
    const tryAtHomeEligible = formData.get("tryAtHomeEligible") === "on";
    const tryOnEligible = formData.get("tryOnEligible") === "on";
    const codAvailable = formData.get("codAvailable") === "on";
    const brandId = String(formData.get("brandId") ?? "").trim() || null;
    const arImageUrl = String(formData.get("arImageUrl") ?? "").trim();

    const pricePaise = formData.get("pricePaise") ? Math.round(Number(formData.get("pricePaise")) * 100) : null;
    const compareAtPaise = formData.get("compareAtPaise") ? Math.round(Number(formData.get("compareAtPaise")) * 100) : null;
    const costPricePaise = formData.get("costPricePaise") ? Math.round(Number(formData.get("costPricePaise")) * 100) : null;
    const taxPct = formData.get("taxPct") ? Number(formData.get("taxPct")) : 18;
    const quantity = Number(formData.get("quantity") ?? 0);

    const description = String(formData.get("description") ?? "").trim();
    const shortDescription = String(formData.get("shortDescription") ?? "").trim() || null;
    const gender = String(formData.get("gender") ?? "").trim() || null;
    const ageGroup = String(formData.get("ageGroup") ?? "").trim() || null;
    const material = String(formData.get("material") ?? "").trim() || null;
    const colour = String(formData.get("colour") ?? "").trim() || null;
    const finish = String(formData.get("finish") ?? "").trim() || null;
    const shape = String(formData.get("shape") ?? "").trim() || null;
    const rimType = String(formData.get("rimType") ?? "").trim() || null;
    const size = String(formData.get("size") ?? "").trim() || null;
    const measurements = String(formData.get("measurements") ?? "").trim() || null;
    const weightGrams = formData.get("weightGrams") ? Number(formData.get("weightGrams")) : null;
    const frameWidth = formData.get("frameWidth") ? Number(formData.get("frameWidth")) : null;
    const lensWidth = formData.get("lensWidth") ? Number(formData.get("lensWidth")) : null;
    const bridgeWidth = formData.get("bridgeWidth") ? Number(formData.get("bridgeWidth")) : null;
    const templeLength = formData.get("templeLength") ? Number(formData.get("templeLength")) : null;
    const frameHeight = formData.get("frameHeight") ? Number(formData.get("frameHeight")) : null;
    const pdRange = String(formData.get("pdRange") ?? "").trim() || null;
    const springHinges = formData.get("springHinges") === "on";
    const blueLightCompatible = formData.get("blueLightCompatible") === "on";
    const prescriptionCompatible = formData.get("prescriptionCompatible") === "on";

    const careInstructions = String(formData.get("careInstructions") ?? "").trim() || null;
    const warranty = String(formData.get("warranty") ?? "").trim() || null;
    const returnPolicy = String(formData.get("returnPolicy") ?? "").trim() || null;
    const deliveryEstimate = String(formData.get("deliveryEstimate") ?? "").trim() || null;

    const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
    const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
    const seoKeywords = String(formData.get("seoKeywords") ?? "").split(",").map(k => k.trim()).filter(Boolean);

    const selectedCategories = formData.getAll("categories").map(String);
    const highlights = String(formData.get("highlights") ?? "").split("\n").map(h => h.trim()).filter(Boolean);
    const faceShapes = String(formData.get("faceShapes") ?? "").split(",").map(f => f.trim()).filter(Boolean);
    const lensCompatibility = String(formData.get("lensCompatibility") ?? "").split("\n").map(l => l.trim()).filter(Boolean);

    if (!name || !brand || !sku) redirect(`/admin/products/${currentSlug}/edit?error=missing-fields`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect(`/admin/products/${currentSlug}/edit?error=invalid-slug`);
    if (tryOnEligible && !arImageUrl) redirect(`/admin/products/${currentSlug}/edit?error=try-on-ar-required`);

    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: product!.id },
        OR: [{ slug }, { sku }]
      },
      select: { slug: true, sku: true }
    });
    if (duplicate?.slug === slug) redirect(`/admin/products/${currentSlug}/edit?error=duplicate-slug`);
    if (duplicate?.sku === sku) redirect(`/admin/products/${currentSlug}/edit?error=duplicate-sku`);

    await prisma.$transaction(async (tx) => {
      if (slug !== currentSlug) {
        await tx.slugRedirect.upsert({
          where: { oldSlug: currentSlug },
          update: { newSlug: slug },
          create: { oldSlug: currentSlug, newSlug: slug }
        });
      }

      await tx.product.update({
        where: { id: product!.id },
        data: {
          slug, sku, barcode, name, brand, brandId, status, featured, tryAtHomeEligible, tryOnEligible,
          arImageUrl: arImageUrl || null, codAvailable,
          pricePaise, compareAtPaise, costPricePaise, taxPct, description, shortDescription,
          gender, ageGroup, material, colour, finish, shape, rimType, size, measurements,
          weightGrams, frameWidth, lensWidth, bridgeWidth, templeLength, frameHeight, pdRange,
          springHinges, blueLightCompatible, prescriptionCompatible,
          highlights, faceShapes, lensCompatibility,
          careInstructions, warranty, returnPolicy, deliveryEstimate,
          seoTitle, seoDescription, seoKeywords,
          publishedAt: status === "ACTIVE" && !product!.publishedAt ? new Date() : product!.publishedAt,
          searchText: [sku, name, brand, material, colour, shape, rimType, gender, selectedCategories.join(" ")].filter(Boolean).join(" ")
        }
      });

      await tx.inventory.upsert({
        where: { productId: product!.id },
        update: {
          quantity,
          status: pricePaise ? (quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "PRICE_REQUIRED",
          warehouse: String(formData.get("warehouse") ?? "").trim() || undefined,
          supplier: String(formData.get("supplier") ?? "").trim() || undefined
        },
        create: {
          productId: product!.id,
          quantity,
          status: pricePaise ? (quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "PRICE_REQUIRED",
          warehouse: String(formData.get("warehouse") ?? "").trim() || "Vision Vistara clinic inventory",
          location: String(formData.get("warehouse") ?? "").trim() || "Vision Vistara clinic inventory"
        }
      });

      await tx.productImage.deleteMany({ where: { productId: product!.id } });
      const images = readImages(formData, product!.id, brand, name, arImageUrl);
      if (images.length) await tx.productImage.createMany({ data: images });

      await tx.productCategory.deleteMany({ where: { productId: product!.id } });
      if (selectedCategories.length) {
        const categoryRows = await tx.category.findMany({
          where: { slug: { in: selectedCategories } },
          select: { id: true }
        });
        if (categoryRows.length) {
          await tx.productCategory.createMany({
            data: categoryRows.map((category) => ({ productId: product!.id, categoryId: category.id }))
          });
        }
      }

      await tx.activityLog.create({
        data: { action: "PRODUCT_UPDATED", entityType: "product", entityId: product!.id, metadata: { slug, name, brand, tryOnEligible } }
      });
    });

    await invalidateProductCache();
    redirect("/admin/products");
  }

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container max-w-5xl">
        <Link href="/admin/products" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <div className="mb-8">
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-4xl font-extrabold">Edit: {product.brand} {product.name}</h1>
          <p className="mt-2 text-slate-600">Update all product details. Changing the slug will create a 301 redirect from the old URL.</p>
        </div>
        {errorMessage ? (
          <div className="mb-6 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            {errorMessage}
          </div>
        ) : null}
        <ProductForm
          product={{
            ...product,
            quantity: product.inventory?.quantity ?? 0,
            linkedCategorySlugs,
            arImageUrl: product.arImageUrl ?? product.images.find(img => img.role === "ar")?.url ?? "",
            images: product.images.map(img => ({ url: img.url, alt: img.alt, role: img.role, sortOrder: img.sortOrder }))
          }}
          categories={categories}
          brands={brands}
          action={updateProduct}
          submitLabel="Update Product"
        />
      </div>
    </main>
  );
}

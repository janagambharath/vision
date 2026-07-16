import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { requireManager } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getCategories, getBrands } from "@/lib/store-data";
import { invalidateProductCache } from "@/lib/inventory-actions";
import { ProductForm } from "@/components/admin/product-form";
import { getPublishBlockersForDraft } from "@/lib/product-publishing";
import { isTrustedProductImageUrl } from "@/lib/product-ai";
import { readVerifiedProductAnalysis } from "@/lib/product-ai-analysis";

export const metadata = { title: "Edit Product | Admin" };

const errorMessages: Record<string, string> = {
  "missing-fields": "Name and brand are required.",
  "invalid-slug": "Slug must use lowercase letters, numbers, and hyphens only.",
  "invalid-values": "Check prices, inventory, and AI-derived values. Values must be valid non-negative numbers.",
  "duplicate-slug": "Another product already uses that slug.",
  "reserved-stock": "Stock cannot be set below units currently reserved by open checkouts.",
  "publish-incomplete": "This product cannot go live until all publish checklist items are completed. Save it as a draft or complete the missing essentials."
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readImages(formData: FormData, productId: string, brand: string, name: string, arImageUrl: string) {
  const requestedImageCount = Number(formData.get("image_count") ?? 0);
  const imageCount = Number.isInteger(requestedImageCount) && requestedImageCount >= 0 ? Math.min(requestedImageCount, 24) : 0;
  const images: Array<{ productId: string; url: string; alt: string; role: string; sortOrder: number }> = [];

  for (let i = 0; i < imageCount; i += 1) {
    const url = String(formData.get(`image_url_${i}`) ?? "").trim();
    const alt = String(formData.get(`image_alt_${i}`) ?? "").trim();
    const role = String(formData.get(`image_role_${i}`) ?? "gallery");
    const sortOrder = Number(formData.get(`image_sort_${i}`) ?? i);
    if (url && isTrustedProductImageUrl(url)) images.push({ productId, url, alt, role, sortOrder });
  }

  if (arImageUrl && isTrustedProductImageUrl(arImageUrl) && !images.some((image) => image.role === "ar" && image.url === arImageUrl)) {
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
  await requireManager();
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
    const admin = await requireManager();

    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    // SKU is a server-issued catalog identifier and is intentionally not editable.
    const sku = product!.sku;
    const barcode = String(formData.get("barcode") ?? "").trim() || null;
    const slug = slugify(String(formData.get("slug") ?? "").trim() || `${brand}-${name}`);
    const statusValue = String(formData.get("status") ?? "DRAFT");
    if (!["ACTIVE", "DRAFT", "ARCHIVED"].includes(statusValue)) redirect(`/admin/products/${currentSlug}/edit?error=invalid-values`);
    const status = statusValue as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const featured = formData.get("featured") === "on";
    const tryAtHomeEligible = formData.get("tryAtHomeEligible") === "on";
    const codAvailable = formData.get("codAvailable") === "on";
    const brandId = String(formData.get("brandId") ?? "").trim() || null;
    const arImageUrl = product!.arImageUrl ?? "";

    const pricePaise = formData.get("pricePaise") ? Math.round(Number(formData.get("pricePaise")) * 100) : null;
    const compareAtPaise = formData.get("compareAtPaise") ? Math.round(Number(formData.get("compareAtPaise")) * 100) : null;
    const costPricePaise = formData.get("costPricePaise") ? Math.round(Number(formData.get("costPricePaise")) * 100) : null;
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
    if (
      [pricePaise, compareAtPaise, costPricePaise]
        .some((value) => value !== null && (!Number.isFinite(value) || value < 0)) ||
      !Number.isInteger(quantity) || quantity < 0
    ) redirect(`/admin/products/${currentSlug}/edit?error=invalid-values`);

    const duplicate = await prisma.product.findFirst({
      where: { id: { not: product!.id }, slug },
      select: { slug: true }
    });
    if (duplicate) redirect(`/admin/products/${currentSlug}/edit?error=duplicate-slug`);

    const candidateImages = readImages(formData, product!.id, brand, name, arImageUrl);
    const imageRoles = candidateImages.map((image) => image.role);
    const tryOnEligible = candidateImages.some((image) => image.role !== "ar");
    const analysis = readVerifiedProductAnalysis(
      String(formData.get("aiAnalysisToken") ?? ""),
      candidateImages.map((image) => image.url)
    );
    const size = analysis?.size || product!.size;
    const measurements = analysis?.measurements || product!.measurements;
    const weightGrams = analysis?.weightGrams ?? product!.weightGrams;
    const frameWidth = analysis?.frameWidth ?? product!.frameWidth;
    const lensWidth = analysis?.lensWidth ?? product!.lensWidth;
    const bridgeWidth = analysis?.bridgeWidth ?? product!.bridgeWidth;
    const templeLength = analysis?.templeLength ?? product!.templeLength;
    const frameHeight = analysis?.frameHeight ?? product!.frameHeight;
    const pdRange = analysis?.pdRange || product!.pdRange;
    const categoryCount = selectedCategories.length
      ? await prisma.category.count({ where: { slug: { in: selectedCategories } } })
      : 0;
    if (status === "ACTIVE" && getPublishBlockersForDraft({
      name, brand, sku, description, pricePaise, compareAtPaise, quantity, imageRoles, categoryCount, tryOnEligible, arImageUrl: arImageUrl || null
    }).length) redirect(`/admin/products/${currentSlug}/edit?error=publish-incomplete`);

    try {
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
          pricePaise, compareAtPaise, costPricePaise, description, shortDescription,
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

      const inventoryStatus = pricePaise ? (quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "PRICE_REQUIRED";
      if (product!.inventory) {
        const inventoryUpdate = await tx.inventory.updateMany({
          where: { id: product!.inventory.id, reservedStock: { lte: quantity } },
          data: {
            quantity,
            status: inventoryStatus,
            warehouse: String(formData.get("warehouse") ?? "").trim() || undefined,
            supplier: String(formData.get("supplier") ?? "").trim() || undefined
          }
        });
        if (inventoryUpdate.count !== 1) throw new Error("RESERVED_INVENTORY");
      } else {
        await tx.inventory.create({
          data: {
            productId: product!.id,
            quantity,
            status: inventoryStatus,
            warehouse: String(formData.get("warehouse") ?? "").trim() || "Vision Vistara clinic inventory",
            location: String(formData.get("warehouse") ?? "").trim() || "Vision Vistara clinic inventory"
          }
        });
      }

      await tx.productImage.deleteMany({ where: { productId: product!.id } });
      const images = candidateImages;
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
        data: { adminUserId: admin.user?.id, action: "PRODUCT_UPDATED", entityType: "product", entityId: product!.id, metadata: { slug, name, brand, tryOnEligible } }
      });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "RESERVED_INVENTORY") {
        redirect(`/admin/products/${currentSlug}/edit?error=reserved-stock`);
      }
      throw error;
    }

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
          <h1 className="text-3xl font-extrabold sm:text-4xl">Edit: {product.brand} {product.name}</h1>
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

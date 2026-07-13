import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getCategories, getBrands } from "@/lib/store-data";
import { invalidateProductCache } from "@/lib/inventory-actions";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New Product | Admin" };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);

  async function createProduct(formData: FormData) {
    "use server";
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    const barcode = String(formData.get("barcode") ?? "").trim() || null;
    const slug = String(formData.get("slug") ?? "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const status = String(formData.get("status") ?? "DRAFT") as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const featured = formData.get("featured") === "on";
    const tryAtHomeEligible = formData.get("tryAtHomeEligible") === "on";
    const codAvailable = formData.get("codAvailable") === "on";
    const brandId = String(formData.get("brandId") ?? "").trim() || null;

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

    if (!name || !brand || !sku) {
      redirect("/admin/products/new?error=missing-fields");
    }

    const product = await prisma.product.create({
      data: {
        slug, sku, barcode, name, brand, brandId, status, featured, tryAtHomeEligible, codAvailable,
        pricePaise, compareAtPaise, costPricePaise, taxPct, description, shortDescription,
        gender, ageGroup, material, colour, finish, shape, rimType, size, measurements,
        weightGrams, frameWidth, lensWidth, bridgeWidth, templeLength, frameHeight, pdRange,
        springHinges, blueLightCompatible, prescriptionCompatible,
        highlights, faceShapes, lensCompatibility,
        careInstructions, warranty, returnPolicy, deliveryEstimate,
        seoTitle, seoDescription, seoKeywords,
        publishedAt: status === "ACTIVE" ? new Date() : null,
        searchText: [sku, name, brand, material, colour, shape, rimType, gender, selectedCategories.join(" ")].filter(Boolean).join(" ")
      }
    });

    // Inventory
    await prisma.inventory.create({
      data: {
        productId: product.id, quantity,
        status: pricePaise ? (quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK") : "PRICE_REQUIRED",
        warehouse: String(formData.get("warehouse") ?? "").trim() || "Vision Vistara clinic inventory",
        supplier: String(formData.get("supplier") ?? "").trim() || null,
        location: String(formData.get("warehouse") ?? "").trim() || "Vision Vistara clinic inventory"
      }
    });

    // Images from uploader
    const imageCount = Number(formData.get("image_count") ?? 0);
    for (let i = 0; i < imageCount; i++) {
      const url = String(formData.get(`image_url_${i}`) ?? "").trim();
      const alt = String(formData.get(`image_alt_${i}`) ?? "").trim();
      const role = String(formData.get(`image_role_${i}`) ?? "gallery");
      const sortOrder = Number(formData.get(`image_sort_${i}`) ?? i);
      if (url) {
        await prisma.productImage.create({
          data: { productId: product.id, url, alt, role, sortOrder }
        });
      }
    }

    // Categories
    for (const catSlug of selectedCategories) {
      const category = await prisma.category.findUnique({ where: { slug: catSlug } });
      if (category) {
        await prisma.productCategory.create({
          data: { productId: product.id, categoryId: category.id }
        });
      }
    }

    // Activity log
    await prisma.activityLog.create({
      data: { action: "PRODUCT_CREATED", entityType: "product", entityId: product.id, metadata: { slug, name, brand } }
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
          <h1 className="text-4xl font-extrabold">Add New Product</h1>
          <p className="mt-2 text-slate-600">Fill in all product details across tabs, upload images, and publish.</p>
        </div>
        <ProductForm
          categories={categories}
          brands={brands}
          action={createProduct}
          submitLabel="Create Product"
        />
      </div>
    </main>
  );
}

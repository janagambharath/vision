"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateProductCache } from "@/lib/inventory-actions";
import { getProductPublishBlockers } from "@/lib/product-publishing";

// ─── SINGLE PRODUCT ACTIONS ───

export async function deleteProduct(slug: string) {
  await requireAdmin();

  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) throw new Error("Product not found");

  // Soft delete
  await prisma.product.update({
    where: { slug },
    data: { deletedAt: new Date(), status: "ARCHIVED" }
  });

  await prisma.activityLog.create({
    data: {
      action: "PRODUCT_DELETED",
      entityType: "product",
      entityId: product.id,
      metadata: { slug, name: product.name, brand: product.brand }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
}

export async function archiveProduct(slug: string) {
  await requireAdmin();

  await prisma.product.update({
    where: { slug },
    data: { status: "ARCHIVED" }
  });

  await prisma.activityLog.create({
    data: {
      action: "PRODUCT_ARCHIVED",
      entityType: "product",
      entityId: slug,
      metadata: { slug }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
}

export async function publishProduct(slug: string) {
  await requireAdmin();

  const blockers = await getProductPublishBlockers(slug);
  if (blockers.length) return { published: false as const, blockers };

  await prisma.product.update({
    where: { slug },
    data: { status: "ACTIVE", publishedAt: new Date() }
  });

  await prisma.activityLog.create({
    data: {
      action: "PRODUCT_PUBLISHED",
      entityType: "product",
      entityId: slug,
      metadata: { slug }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
  return { published: true as const, blockers: [] };
}

export async function unpublishProduct(slug: string) {
  await requireAdmin();

  await prisma.product.update({
    where: { slug },
    data: { status: "DRAFT" }
  });

  await prisma.activityLog.create({
    data: {
      action: "PRODUCT_UNPUBLISHED",
      entityType: "product",
      entityId: slug,
      metadata: { slug }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
}

export async function duplicateProduct(slug: string) {
  await requireAdmin();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: true,
      categories: true,
      inventory: true
    }
  });

  if (!product) throw new Error("Product not found");

  const newSlug = `${product.slug}-copy-${Date.now()}`;
  const newSku = `${product.sku}-COPY`;

  const duplicate = await prisma.product.create({
    data: {
      slug: newSlug,
      sku: newSku,
      barcode: null,
      name: `${product.name} (Copy)`,
      brand: product.brand,
      brandId: product.brandId,
      status: "DRAFT",
      featured: false,
      pricePaise: product.pricePaise,
      compareAtPaise: product.compareAtPaise,
      costPricePaise: product.costPricePaise,
      taxPct: product.taxPct,
      currency: product.currency,
      codAvailable: product.codAvailable,
      shortDescription: product.shortDescription,
      description: product.description,
      gender: product.gender,
      ageGroup: product.ageGroup,
      material: product.material,
      colour: product.colour,
      finish: product.finish,
      shape: product.shape,
      rimType: product.rimType,
      size: product.size,
      measurements: product.measurements,
      weightGrams: product.weightGrams,
      frameWidth: product.frameWidth,
      lensWidth: product.lensWidth,
      bridgeWidth: product.bridgeWidth,
      templeLength: product.templeLength,
      frameHeight: product.frameHeight,
      pdRange: product.pdRange,
      springHinges: product.springHinges,
      blueLightCompatible: product.blueLightCompatible,
      prescriptionCompatible: product.prescriptionCompatible,
      lensCompatibility: product.lensCompatibility,
      faceShapes: product.faceShapes,
      highlights: product.highlights,
      careInstructions: product.careInstructions,
      warranty: product.warranty,
      returnPolicy: product.returnPolicy,
      deliveryEstimate: product.deliveryEstimate,
      tryAtHomeEligible: product.tryAtHomeEligible,
      whatsappEnabled: product.whatsappEnabled,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      seoKeywords: product.seoKeywords,
      searchText: product.searchText
    }
  });

  // Duplicate images
  for (const image of product.images) {
    await prisma.productImage.create({
      data: {
        productId: duplicate.id,
        url: image.url,
        alt: image.alt,
        role: image.role,
        sortOrder: image.sortOrder
      }
    });
  }

  // Duplicate categories
  for (const cat of product.categories) {
    await prisma.productCategory.create({
      data: {
        productId: duplicate.id,
        categoryId: cat.categoryId
      }
    });
  }

  // Create inventory
  if (product.inventory) {
    await prisma.inventory.create({
      data: {
        productId: duplicate.id,
        quantity: 0,
        status: "PRICE_REQUIRED",
        supplier: product.inventory.supplier,
        warehouse: product.inventory.warehouse,
        location: product.inventory.location
      }
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "PRODUCT_DUPLICATED",
      entityType: "product",
      entityId: duplicate.id,
      metadata: { originalSlug: slug, newSlug, newSku }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");

  return newSlug;
}

// ─── BULK ACTIONS ───

export async function bulkUpdateStatus(slugs: string[], status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  await requireAdmin();

  const updateData: Record<string, unknown> = { status };
  if (status === "ACTIVE") updateData.publishedAt = new Date();

  await prisma.product.updateMany({
    where: { slug: { in: slugs } },
    data: updateData
  });

  await prisma.activityLog.create({
    data: {
      action: "BULK_STATUS_UPDATE",
      entityType: "product",
      metadata: { slugs, status, count: slugs.length }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
}

export async function bulkDelete(slugs: string[]) {
  await requireAdmin();

  await prisma.product.updateMany({
    where: { slug: { in: slugs } },
    data: { deletedAt: new Date(), status: "ARCHIVED" }
  });

  await prisma.activityLog.create({
    data: {
      action: "BULK_DELETE",
      entityType: "product",
      metadata: { slugs, count: slugs.length }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
}

export async function bulkCategoryChange(slugs: string[], categoryIds: string[]) {
  await requireAdmin();

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true }
  });

  for (const product of products) {
    // Remove existing categories
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });

    // Add new categories
    for (const categoryId of categoryIds) {
      await prisma.productCategory.create({
        data: { productId: product.id, categoryId }
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      action: "BULK_CATEGORY_CHANGE",
      entityType: "product",
      metadata: { slugs, categoryIds, count: slugs.length }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
}

export async function bulkPriceUpdate(
  slugs: string[],
  adjustmentType: "percentage" | "fixed",
  value: number
) {
  await requireAdmin();

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, pricePaise: { not: null } },
    select: { id: true, slug: true, pricePaise: true }
  });

  for (const product of products) {
    if (!product.pricePaise) continue;

    let newPrice: number;
    if (adjustmentType === "percentage") {
      newPrice = Math.round(product.pricePaise * (1 + value / 100));
    } else {
      newPrice = product.pricePaise + Math.round(value * 100);
    }

    if (newPrice < 0) newPrice = 0;

    await prisma.product.update({
      where: { id: product.id },
      data: { pricePaise: newPrice }
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "BULK_PRICE_UPDATE",
      entityType: "product",
      metadata: { slugs, adjustmentType, value, count: products.length }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
}

export async function bulkInventoryUpdate(
  slugs: string[],
  quantity: number
) {
  await requireAdmin();

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, pricePaise: true },
    
  });

  for (const product of products) {
    const status = quantity === 0 ? "OUT_OF_STOCK" : product.pricePaise ? "IN_STOCK" : "PRICE_REQUIRED";

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantity, status },
      create: { productId: product.id, quantity, status }
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "BULK_INVENTORY_UPDATE",
      entityType: "product",
      metadata: { slugs, quantity, count: products.length }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
}

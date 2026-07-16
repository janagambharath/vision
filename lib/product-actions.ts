"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/admin-auth";
import { invalidateProductCache } from "@/lib/inventory-actions";
import { getProductPublishBlockers } from "@/lib/product-publishing";

class ReservedInventoryError extends Error {
  constructor(readonly slugs: string[]) {
    super("Stock cannot be set below units reserved by open checkouts.");
    this.name = "ReservedInventoryError";
  }
}

// ─── SINGLE PRODUCT ACTIONS ───

export async function deleteProduct(slug: string) {
  const admin = await requireManager();

  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) throw new Error("Product not found");

  // Soft delete
  await prisma.product.update({
    where: { slug },
    data: { deletedAt: new Date(), status: "ARCHIVED" }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();

  await prisma.product.update({
    where: { slug },
    data: { status: "ARCHIVED" }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();

  const blockers = await getProductPublishBlockers(slug);
  if (blockers.length) return { published: false as const, blockers };

  await prisma.product.update({
    where: { slug },
    data: { status: "ACTIVE", publishedAt: new Date() }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();

  await prisma.product.update({
    where: { slug },
    data: { status: "DRAFT" }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();

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
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  if (!uniqueSlugs.length) return { updated: 0, blockers: {} as Record<string, string[]> };

  if (status === "ACTIVE") {
    const checks = await Promise.all(
      uniqueSlugs.map(async (slug) => [slug, await getProductPublishBlockers(slug)] as const)
    );
    const blockers = Object.fromEntries(checks.filter(([, reasons]) => reasons.length));
    if (Object.keys(blockers).length) {
      return { updated: 0, blockers };
    }

    const published = await prisma.product.updateMany({
      where: { slug: { in: uniqueSlugs }, deletedAt: null },
      data: { status: "ACTIVE", publishedAt: new Date() }
    });
    await prisma.activityLog.create({
      data: {
        adminUserId: admin.user?.id,
        action: "BULK_STATUS_UPDATE",
        entityType: "product",
        metadata: { slugs: uniqueSlugs, status, count: published.count }
      }
    });
    await invalidateProductCache();
    revalidatePath("/admin/products");
    revalidatePath("/frames");
    return { updated: published.count, blockers: {} as Record<string, string[]> };
  }

  const updated = await prisma.product.updateMany({
    where: { slug: { in: uniqueSlugs } },
    data: { status }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
      action: "BULK_STATUS_UPDATE",
      entityType: "product",
      metadata: { slugs: uniqueSlugs, status, count: updated.count }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/frames");
  return { updated: updated.count, blockers: {} as Record<string, string[]> };
}

export async function bulkDelete(slugs: string[]) {
  const admin = await requireManager();

  await prisma.product.updateMany({
    where: { slug: { in: slugs } },
    data: { deletedAt: new Date(), status: "ARCHIVED" }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();

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
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();

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
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1_000_000 || !uniqueSlugs.length) {
    return { updated: 0, blockedSlugs: [] as string[] };
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: uniqueSlugs } },
    select: { id: true, slug: true, pricePaise: true, inventory: { select: { id: true, reservedStock: true, lowStockThreshold: true } } }
  });
  const blockedSlugs = products
    .filter((product) => quantity < (product.inventory?.reservedStock ?? 0))
    .map((product) => product.slug);
  if (blockedSlugs.length) return { updated: 0, blockedSlugs };

  try {
    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const status = quantity === 0
          ? "OUT_OF_STOCK"
          : !product.pricePaise
            ? "PRICE_REQUIRED"
            : quantity <= (product.inventory?.lowStockThreshold ?? 2)
              ? "LOW_STOCK"
              : "IN_STOCK";
        if (product.inventory) {
          const updated = await tx.inventory.updateMany({
            where: { id: product.inventory.id, reservedStock: { lte: quantity } },
            data: { quantity, status }
          });
          if (updated.count !== 1) throw new ReservedInventoryError([product.slug]);
        } else {
          await tx.inventory.create({ data: { productId: product.id, quantity, status } });
        }
      }
    });
  } catch (error) {
    if (error instanceof ReservedInventoryError) {
      return { updated: 0, blockedSlugs: error.slugs };
    }
    throw error;
  }

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
      action: "BULK_INVENTORY_UPDATE",
      entityType: "product",
      metadata: { slugs: uniqueSlugs, quantity, count: products.length }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  return { updated: products.length, blockedSlugs: [] as string[] };
}

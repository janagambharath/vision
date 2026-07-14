"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteCacheByPrefix } from "@/lib/redis";
import type { InventoryStatus } from "@prisma/client";

export async function invalidateProductCache() {
  await deleteCacheByPrefix("store:products:");
  revalidatePath("/frames", "layout");
}

export async function updateInventoryAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug"));
  const quantity = Number(formData.get("quantity"));
  
  const product = await prisma.product.findUnique({ 
    where: { slug }, 
    include: { inventory: true } 
  });
  if (!product) return;

  const status: InventoryStatus =
    quantity === 0 ? "OUT_OF_STOCK" :
    quantity <= (product.inventory?.lowStockThreshold ?? 2) ? "LOW_STOCK" :
    product.pricePaise ? "IN_STOCK" : "PRICE_REQUIRED";

  await prisma.inventory.upsert({
    where: { productId: product.id },
    update: { quantity, status },
    create: { productId: product.id, quantity, status }
  });

  await prisma.activityLog.create({
    data: {
      action: "INVENTORY_UPDATED",
      entityType: "product",
      entityId: product.id,
      metadata: { slug, quantity, status }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/inventory");
}

export async function receiveStockAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug"));
  const addQty = Number(formData.get("addQuantity"));
  if (Number.isNaN(addQty) || addQty <= 0) return;

  const product = await prisma.product.findUnique({ 
    where: { slug }, 
    include: { inventory: true } 
  });
  if (!product) return;

  const currentQty = product.inventory?.quantity ?? 0;
  const quantity = currentQty + addQty;

  const status: InventoryStatus =
    quantity === 0 ? "OUT_OF_STOCK" :
    quantity <= (product.inventory?.lowStockThreshold ?? 2) ? "LOW_STOCK" :
    product.pricePaise ? "IN_STOCK" : "PRICE_REQUIRED";

  await prisma.inventory.upsert({
    where: { productId: product.id },
    update: { quantity, status },
    create: { productId: product.id, quantity, status }
  });

  await prisma.activityLog.create({
    data: {
      action: "INVENTORY_RECEIVED",
      entityType: "product",
      entityId: product.id,
      metadata: { slug, receivedQuantity: addQty, finalQuantity: quantity, status }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/inventory");
}

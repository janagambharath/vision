"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/admin-auth";
import { deleteCacheByPrefix } from "@/lib/redis";
import type { InventoryStatus } from "@prisma/client";

const MAX_INVENTORY_QUANTITY = 1_000_000;

export async function invalidateProductCache() {
  await deleteCacheByPrefix("store:products:");
  revalidatePath("/frames", "layout");
}

export async function updateInventoryAction(formData: FormData) {
  const admin = await requireManager();
  const slug = String(formData.get("slug"));
  const quantity = Number(formData.get("quantity"));
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > MAX_INVENTORY_QUANTITY) return;
  
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
      adminUserId: admin.user?.id,
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
  const admin = await requireManager();
  const slug = String(formData.get("slug"));
  const addQty = Number(formData.get("addQuantity"));
  if (!Number.isSafeInteger(addQty) || addQty <= 0 || addQty > MAX_INVENTORY_QUANTITY) return;

  const product = await prisma.product.findUnique({ 
    where: { slug }, 
    include: { inventory: true } 
  });
  if (!product) return;

  const currentQty = product.inventory?.quantity ?? 0;
  const quantity = currentQty + addQty;
  if (quantity > MAX_INVENTORY_QUANTITY) return;

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
      adminUserId: admin.user?.id,
      action: "INVENTORY_RECEIVED",
      entityType: "product",
      entityId: product.id,
      metadata: { slug, receivedQuantity: addQty, finalQuantity: quantity, status }
    }
  });

  await invalidateProductCache();
  revalidatePath("/admin/inventory");
}

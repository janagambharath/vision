import { NextResponse } from "next/server";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { invalidateProductCache } from "@/lib/inventory-actions";
import { assertSameOrigin } from "@/lib/request-security";

async function requireCatalogManager() {
  const access = await getAdminAccess();
  if (!access) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!isManagerOrOwner(access.role)) {
    return { error: NextResponse.json({ error: "Manager access is required" }, { status: 403 }) };
  }
  return { access };
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const authorization = await requireCatalogManager();
  if (authorization.error) return authorization.error;

  const formData = await request.formData();
  const method = String(formData.get("_method") ?? "POST").toUpperCase();

  if (method === "PATCH") {
    const slug = String(formData.get("slug") ?? "").trim();
    const pricePaiseRaw = String(formData.get("pricePaise") ?? "").trim();
    const quantityRaw = String(formData.get("quantity") ?? "").trim();
    const hasPrice = pricePaiseRaw.length > 0;
    const hasQuantity = quantityRaw.length > 0;
    const pricePaise = hasPrice ? Number(pricePaiseRaw) : undefined;
    const quantity = hasQuantity ? Number(quantityRaw) : undefined;

    if (!slug || (!hasPrice && !hasQuantity)) {
      return NextResponse.json({ error: "A product slug and at least one field to update are required" }, { status: 400 });
    }
    if ((hasPrice && (!Number.isSafeInteger(pricePaise) || pricePaise! < 0)) ||
      (hasQuantity && (!Number.isSafeInteger(quantity) || quantity! < 0))) {
      return NextResponse.json({ error: "Price and quantity must be non-negative whole numbers" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { slug }, include: { inventory: true } });
      if (!product) return null;
      if (hasQuantity && quantity! < (product.inventory?.reservedStock ?? 0)) {
        return { kind: "RESERVED" as const, reservedStock: product.inventory?.reservedStock ?? 0 };
      }

      const nextPricePaise = hasPrice ? pricePaise! : product.pricePaise;
      const nextQuantity = hasQuantity ? quantity! : product.inventory?.quantity ?? 0;
      const inventoryStatus = nextPricePaise === null
        ? "PRICE_REQUIRED"
        : nextQuantity === 0
          ? "OUT_OF_STOCK"
          : "IN_STOCK";

      if (product.inventory) {
        const inventoryUpdate = await tx.inventory.updateMany({
          where: hasQuantity
            ? { id: product.inventory.id, reservedStock: { lte: nextQuantity } }
            : { id: product.inventory.id },
          data: {
            quantity: hasQuantity ? nextQuantity : undefined,
            status: inventoryStatus
          }
        });
        if (inventoryUpdate.count !== 1) {
          return { kind: "RESERVED" as const, reservedStock: product.inventory.reservedStock };
        }
      } else {
        await tx.inventory.create({
          data: { productId: product.id, quantity: nextQuantity, status: inventoryStatus }
        });
      }
      const savedProduct = await tx.product.update({
        where: { id: product.id },
        data: { pricePaise: hasPrice ? pricePaise : undefined }
      });
      await tx.activityLog.create({
        data: {
          adminUserId: authorization.access.session.user?.id,
          action: "PRODUCT_QUICK_UPDATED",
          entityType: "product",
          entityId: product.id,
          metadata: { slug, pricePaise: hasPrice ? pricePaise : undefined, quantity: hasQuantity ? quantity : undefined }
        }
      });
      return { kind: "UPDATED" as const, product: savedProduct };
    });

    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (updated.kind === "RESERVED") {
      return NextResponse.json(
        { error: `Stock cannot be set below ${updated.reservedStock} unit(s) reserved by open checkouts.` },
        { status: 409 }
      );
    }
    await invalidateProductCache();
    return NextResponse.json({ product: { id: updated.product.id, slug: updated.product.slug } });
  }

  if (method === "DELETE") {
    const slug = String(formData.get("slug") ?? "").trim();
    if (!slug) return NextResponse.json({ error: "A product slug is required" }, { status: 400 });

    const archived = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { slug }, select: { id: true, slug: true } });
      if (!product) return null;
      await tx.product.update({
        where: { id: product.id },
        data: { deletedAt: new Date(), status: "ARCHIVED" }
      });
      await tx.activityLog.create({
        data: {
          adminUserId: authorization.access.session.user?.id,
          action: "PRODUCT_DELETED",
          entityType: "product",
          entityId: product.id,
          metadata: { slug: product.slug }
        }
      });
      return product;
    });

    if (!archived) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await invalidateProductCache();
    return NextResponse.json({ product: archived });
  }

  if (method !== "POST") {
    return NextResponse.json({ error: "Unsupported product operation" }, { status: 405 });
  }
  return NextResponse.json(
    { error: "Incomplete product creation is disabled. Use /admin/products/new and complete the required catalog fields." },
    { status: 405 }
  );
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const method = String(formData.get("_method") ?? "POST").toUpperCase();

  if (method === "PATCH") {
    const slug = String(formData.get("slug") ?? "");
    const pricePaiseRaw = String(formData.get("pricePaise") ?? "").trim();
    const quantityRaw = String(formData.get("quantity") ?? "").trim();
    const pricePaise = pricePaiseRaw ? Number(pricePaiseRaw) : undefined;
    const quantity = quantityRaw ? Number(quantityRaw) : undefined;

    const product = await prisma.product.findUnique({ where: { slug }, include: { inventory: true } });
    if (product) {
      await prisma.product.update({
        where: { slug },
        data: {
          pricePaise: Number.isFinite(pricePaise) ? pricePaise : undefined
        }
      });
      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: {
          quantity: Number.isFinite(quantity) ? quantity : undefined,
          status: Number.isFinite(pricePaise) ? "IN_STOCK" : undefined
        },
        create: {
          productId: product.id,
          quantity: Number.isFinite(quantity) ? quantity! : 0,
          status: Number.isFinite(pricePaise) ? "IN_STOCK" : "PRICE_REQUIRED"
        }
      });
    }
  } else {
    const slug = `draft-frame-${Date.now()}`;
    await prisma.product.create({
      data: {
        slug,
        sku: slug.toUpperCase(),
        name: "New Draft Frame",
        brand: "Vision Vistara",
        status: "DRAFT",
        description: "Draft product. Add verified supplier information before publishing.",
        lensCompatibility: [],
        faceShapes: [],
        highlights: [],
        searchText: slug
      }
    });
  }

  return NextResponse.redirect(new URL("/admin/products", request.url), 303);
}

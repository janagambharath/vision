import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const slug = String(formData.get("slug") ?? "");
  const product = await prisma.product.findUnique({ where: { slug } }).catch(() => null);

  if (product) {
    await prisma.lead.create({
      data: {
        name: "Wishlist visitor",
        phone: "not-captured",
        source: "wishlist",
        intent: "Wishlist frame",
        payload: { productId: product.id, slug }
      }
    }).catch(() => null);
  }

  return NextResponse.redirect(new URL(`/frames/${slug}`, request.url), 303);
}

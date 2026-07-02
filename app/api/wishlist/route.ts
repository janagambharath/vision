import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WISHLIST_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (await isRateLimited(request, { keyPrefix: "wishlist", limit: 20, windowSeconds: 60 })) {
    return NextResponse.redirect(new URL("/frames?error=rate-limited", request.url), 303);
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") ?? "");
  const method = String(formData.get("_method") ?? "POST").toUpperCase();
  const product = await prisma.product.findFirst({ where: { slug, status: "ACTIVE" } });
  if (!product) return NextResponse.redirect(new URL("/frames?error=wishlist-unavailable", request.url), 303);

  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(WISHLIST_COOKIE)?.value;
  const sessionId = existingSessionId || crypto.randomUUID();
  const response = NextResponse.redirect(
    new URL(method === "DELETE" ? "/frames/wishlist?removed=1" : "/frames/wishlist?added=1", request.url),
    303
  );

  if (!existingSessionId) {
    response.cookies.set(WISHLIST_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90
    });
  }

  if (method === "DELETE") {
    await prisma.wishlistItem.deleteMany({ where: { sessionId, productId: product.id } });
    return response;
  }

  await prisma.wishlistItem.upsert({
    where: { sessionId_productId: { sessionId, productId: product.id } },
    update: {},
    create: { sessionId, productId: product.id }
  });

  await prisma.analyticsEvent.create({
    data: {
      event: "wishlist.add",
      sessionId,
      source: "wishlist",
      path: `/frames/${slug}`,
      metadata: { productId: product.id, slug }
    }
  });

  return response;
}

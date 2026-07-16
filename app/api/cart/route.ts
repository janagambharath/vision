import { NextResponse } from "next/server";
import { calculateCartTotals, getCartOrNull, toPublicCart } from "@/lib/cart";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (await isRateLimited(request, { keyPrefix: "cart-api", limit: 60, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many cart requests" }, { status: 429 });
  }

  const cart = await getCartOrNull();
  return NextResponse.json({
    cart: toPublicCart(cart),
    totals: calculateCartTotals(cart)
  });
}

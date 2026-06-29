import { NextResponse } from "next/server";
import { calculateCartTotals, getCartOrNull } from "@/lib/cart";

export async function GET() {
  const cart = await getCartOrNull();
  return NextResponse.json({
    cart,
    totals: calculateCartTotals(cart)
  });
}

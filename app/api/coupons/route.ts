import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return NextResponse.redirect(new URL("/frames/cart?error=coupon-admin-required", request.url), 303);
}

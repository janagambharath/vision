import { NextResponse } from "next/server";

/**
 * Razorpay is intentionally disabled for the local COD launch. Returning
 * Gone prevents a retired webhook from changing any new order state.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Online payments are unavailable. Vision Vistara currently accepts cash on delivery only." },
    { status: 410 }
  );
}

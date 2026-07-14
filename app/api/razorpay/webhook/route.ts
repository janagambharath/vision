import { NextResponse } from "next/server";

// Retired to prevent two fulfillment authorities. Configure Razorpay to call
// /api/payments/razorpay/webhook and remove this legacy endpoint from its dashboard.
export async function POST() {
  return NextResponse.json({ error: "This webhook endpoint is retired. Use /api/payments/razorpay/webhook." }, { status: 410 });
}

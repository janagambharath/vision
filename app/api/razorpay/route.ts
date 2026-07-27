import { NextResponse } from "next/server";

/**
 * The public store is cash-on-delivery only. Keep this retired URL explicit so
 * stale browser sessions cannot accidentally restart an online payment.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Online payments are unavailable. Vision Vistara currently accepts cash on delivery only." },
    { status: 410 }
  );
}

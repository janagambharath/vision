import { NextResponse } from "next/server";

/** Retired with the COD-only customer checkout. */
export async function POST() {
  return NextResponse.json(
    { error: "Online payments are unavailable. Vision Vistara currently accepts cash on delivery only." },
    { status: 410 }
  );
}

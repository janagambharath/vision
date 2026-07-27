import { NextResponse } from "next/server";

// Online payments are retired for the COD-only launch.
export async function POST() {
  return NextResponse.json({ error: "Online payments are unavailable. Vision Vistara currently accepts cash on delivery only." }, { status: 410 });
}

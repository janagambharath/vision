import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  return NextResponse.redirect(new URL(`/frames/orders/${id || "demo"}`, request.url), 303);
}

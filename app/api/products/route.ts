import { NextResponse } from "next/server";
import { getStoreProducts } from "@/lib/store-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const products = await getStoreProducts({
    query: url.searchParams.get("q") ?? "",
    category: url.searchParams.get("category") ?? "",
    includeDrafts: url.searchParams.get("includeDrafts") === "true"
  });

  return NextResponse.json({ products });
}

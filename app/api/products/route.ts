import { NextResponse } from "next/server";
import { getStoreProducts } from "@/lib/store-data";
import { toPublicStoreProduct } from "@/lib/inventory";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (await isRateLimited(request, { keyPrefix: "products-api", limit: 60, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many catalogue requests" }, { status: 429 });
  }
  const url = new URL(request.url);
  const products = await getStoreProducts({
    query: url.searchParams.get("q") ?? "",
    category: url.searchParams.get("category") ?? "",
    includeDrafts: false
  });

  return NextResponse.json({ products: products.map(toPublicStoreProduct) }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300" }
  });
}

import { NextResponse } from "next/server";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { generateCsvTemplate } from "@/lib/product-import";

export async function GET() {
  const access = await getAdminAccess();
  if (!access || !isManagerOrOwner(access.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csv = generateCsvTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vision-vistara-product-import-template.csv"'
    }
  });
}

import { NextResponse } from "next/server";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { assertSameOrigin } from "@/lib/request-security";
import { parseCsv, validateImportRows, importProducts } from "@/lib/product-import";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const access = await getAdminAccess();
  if (!access || !isManagerOrOwner(access.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const csvText = typeof body.csv === "string" ? body.csv : "";
    if (!csvText.trim()) {
      return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
    }

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or missing headers" }, { status: 400 });
    }

    const validationResults = await validateImportRows(rows);
    const result = await importProducts(rows, validationResults);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

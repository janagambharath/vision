
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/admin-auth";
import { invalidateProductCache } from "@/lib/inventory-actions";

export type CsvRow = Record<string, string>;

export type ImportValidationResult = {
  rowIndex: number;
  row: CsvRow;
  errors: string[];
  slug: string;
};

export type ImportResult = {
  created: number;
  errors: { row: number; message: string }[];
};

function slugify(brand: string, name: string, colour: string) {
  return [brand, name, colour]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSearchText(row: CsvRow) {
  return [row.name, row.brand, row.category, row.material, row.colour, row.shape, row.gender, row.sku]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function parseNum(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

function parseIntStrict(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = parseInt(value.trim(), 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseArray(value: string | undefined): string[] {
  if (!value) return [];
  return value.split("|").map((s) => s.trim()).filter(Boolean);
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: CsvRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

export async function validateImportRows(rows: CsvRow[]): Promise<ImportValidationResult[]> {
  // Fetch existing slugs and SKUs
  const existingProducts = await prisma.product.findMany({
    select: { slug: true, sku: true },
    where: { deletedAt: null }
  });
  const existingSlugs = new Set(existingProducts.map((p) => p.slug));
  const existingSkus = new Set(existingProducts.map((p) => p.sku));

  // Track slugs/SKUs within this import batch
  const batchSlugs = new Set<string>();
  const batchSkus = new Set<string>();

  return rows.map((row, rowIndex) => {
    const errors: string[] = [];
    const name = row.name?.trim() ?? "";
    const brand = row.brand?.trim() ?? "";
    const sku = row.sku?.trim() ?? "";
    const colour = row.colour?.trim() ?? "";

    if (!name) errors.push("Name is required");
    if (!brand) errors.push("Brand is required");
    if (!sku) errors.push("SKU is required");

    const pricePaise = parseIntStrict(row.pricePaise);
    const costPricePaise = parseIntStrict(row.costPricePaise);
    if (pricePaise === null || pricePaise <= 0) errors.push("Selling price (pricePaise) must be a positive integer");
    if (costPricePaise === null || costPricePaise <= 0) errors.push("Cost price (costPricePaise) must be a positive integer");
    if (pricePaise && costPricePaise && costPricePaise >= pricePaise) errors.push("Selling price must exceed cost price");

    const stock = parseIntStrict(row.stock);
    if (stock === null) errors.push("Stock must be a non-negative integer");

    if (!row.description?.trim()) errors.push("Description is required");

    let slug = slugify(brand, name, colour);
    if (!slug) {
      slug = `product-${rowIndex}`;
      errors.push("Cannot generate a valid slug from brand/name/colour");
    }

    // Deduplicate slug within batch
    let slugCandidate = slug;
    let attempt = 2;
    while (existingSlugs.has(slugCandidate) || batchSlugs.has(slugCandidate)) {
      slugCandidate = `${slug}-${attempt}`;
      attempt++;
    }
    slug = slugCandidate;

    if (existingSkus.has(sku) || batchSkus.has(sku)) {
      errors.push(`SKU "${sku}" already exists`);
    }

    batchSlugs.add(slug);
    if (sku) batchSkus.add(sku);

    return { rowIndex, row, errors, slug };
  });
}

export async function importProducts(rows: CsvRow[], validationResults: ImportValidationResult[]): Promise<ImportResult> {
  const admin = await requireManager();

  const validRows = validationResults.filter((r) => r.errors.length === 0);
  const errors: ImportResult["errors"] = [];
  let created = 0;

  // Process in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    try {
      await prisma.$transaction(async (tx) => {
        for (const { row, slug } of batch) {
          const name = row.name?.trim() ?? "";
          const brand = row.brand?.trim() ?? "";
          const sku = row.sku?.trim() ?? "";
          const pricePaise = parseIntStrict(row.pricePaise) ?? 0;
          const compareAtPaise = parseIntStrict(row.compareAtPaise);
          const costPricePaise = parseIntStrict(row.costPricePaise) ?? 0;
          const stock = parseIntStrict(row.stock) ?? 0;

          await tx.product.create({
            data: {
              slug,
              sku,
              barcode: row.barcode?.trim() || null,
              name,
              brand,
              status: "DRAFT",
              pricePaise,
              compareAtPaise,
              costPricePaise,
              description: row.description?.trim() ?? "",
              shortDescription: row.shortDescription?.trim() || null,
              gender: row.gender?.trim() || null,
              ageGroup: row.ageGroup?.trim() || null,
              material: row.material?.trim() || null,
              colour: row.colour?.trim() || null,
              finish: row.finish?.trim() || null,
              shape: row.shape?.trim() || null,
              rimType: row.rimType?.trim() || null,
              size: row.size?.trim() || null,
              weightGrams: parseIntStrict(row.weightGrams),
              frameWidth: parseIntStrict(row.frameWidth),
              lensWidth: parseIntStrict(row.lensWidth),
              bridgeWidth: parseIntStrict(row.bridgeWidth),
              templeLength: parseIntStrict(row.templeLength),
              frameHeight: parseIntStrict(row.frameHeight),
              warranty: row.warranty?.trim() || null,
              returnPolicy: row.returnPolicy?.trim() || null,
              deliveryEstimate: row.deliveryEstimate?.trim() || "3–5 business days",
              seoTitle: row.seoTitle?.trim() || null,
              seoDescription: row.seoDescription?.trim() || null,
              highlights: parseArray(row.highlights),
              faceShapes: parseArray(row.faceShapes),
              lensCompatibility: parseArray(row.lensCompatibility),
              prescriptionCompatible: row.prescriptionCompatible ? parseBool(row.prescriptionCompatible) : true,
              blueLightCompatible: parseBool(row.blueLightCompatible),
              springHinges: parseBool(row.springHinges),
              tryAtHomeEligible: parseBool(row.tryAtHomeEligible),
              tryOnEligible: true,
              codAvailable: true,
              searchText: generateSearchText(row),
              inventory: {
                create: {
                  quantity: stock,
                  reservedStock: 0,
                  lowStockThreshold: 2,
                  reorderLevel: 5,
                  status: stock > 0 ? (pricePaise > 0 ? "IN_STOCK" : "PRICE_REQUIRED") : "OUT_OF_STOCK",
                  supplier: row.supplier?.trim() || null,
                  supplierSku: row.supplierSku?.trim() || null,
                }
              }
            }
          });
          created++;
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      batch.forEach((_, idx) => {
        errors.push({ row: i + idx + 2, message }); // +2 for header + 0-index
      });
    }
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
      action: "PRODUCTS_IMPORTED",
      entityType: "product",
      entityId: "bulk-import",
      metadata: { created, errors: errors.length, total: validRows.length }
    }
  });

  await invalidateProductCache();
  return { created, errors };
}

export function generateCsvTemplate(): string {
  const headers = [
    "name", "brand", "sku", "category", "gender", "ageGroup",
    "material", "colour", "finish", "shape", "rimType",
    "pricePaise", "compareAtPaise", "costPricePaise", "stock",
    "lensWidth", "bridgeWidth", "templeLength", "frameWidth", "frameHeight", "weightGrams",
    "description", "shortDescription", "warranty", "returnPolicy", "deliveryEstimate",
    "seoTitle", "seoDescription",
    "prescriptionCompatible", "blueLightCompatible", "springHinges", "tryAtHomeEligible",
    "faceShapes", "lensCompatibility", "highlights",
    "supplier", "supplierSku", "barcode"
  ];

  const exampleRow = [
    "Classic Aviator", "Ray-Ban", "RB-3025-GOLD", "men", "Men", "Adult",
    "Metal", "Gold", "Polished", "Aviator", "Full Rim",
    "149900", "199900", "60000", "10",
    "58", "14", "140", "138", "50", "28",
    "Classic aviator sunglasses with premium metal frame", "Iconic aviator design", "1 Year", "15 days return", "3–5 business days",
    "Ray-Ban Classic Aviator Gold | Vision Vistara", "Shop Ray-Ban Classic Aviator in Gold at Vision Vistara",
    "true", "false", "false", "true",
    "Oval|Heart|Square", "clear|anti-glare|blue-light", "UV Protection|Lightweight",
    "", "", ""
  ];

  return [headers.join(","), exampleRow.join(",")].join("\n");
}

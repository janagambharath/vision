// ─── TYPES ───
// All product data is now database-driven via Prisma.
// This file contains only shared types and pure utility functions.

export type StoreProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type StoreImage = {
  url: string;
  alt: string;
  role: "front" | "angle" | "ar" | "gallery" | "left-side" | "right-side" | "top" | "bottom" | "folded" | "lifestyle" | "transparent" | "thumbnail" | "hover" | "zoom";
  sortOrder: number;
};

export type StoreProduct = {
  id: string;
  slug: string;
  sku: string;
  barcode?: string | null;
  name: string;
  brand: string;
  brandId?: string | null;
  status: StoreProductStatus;
  featured: boolean;
  pricePaise: number | null;
  compareAtPaise?: number | null;
  costPricePaise?: number | null;
  taxPct?: number | null;
  currency: "INR";
  codAvailable: boolean;
  primaryCategory: string;
  categories: string[];
  gender?: string | null;
  ageGroup?: string | null;
  material: string;
  colour: string;
  finish?: string | null;
  shape: string;
  rimType: string;
  size: string;
  measurements: string;
  weightGrams?: number | null;
  // Frame specifications
  frameWidth?: number | null;
  lensWidth?: number | null;
  bridgeWidth?: number | null;
  templeLength?: number | null;
  frameHeight?: number | null;
  pdRange?: string | null;
  springHinges: boolean;
  blueLightCompatible: boolean;
  prescriptionCompatible: boolean;
  // Inventory
  inventoryQuantity: number;
  inventoryStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PRICE_REQUIRED";
  tryAtHomeEligible: boolean;
  // Content
  shortDescription?: string | null;
  description: string;
  highlights: string[];
  lensCompatibility: string[];
  faceShapes: string[];
  careInstructions: string;
  warranty: string;
  returnPolicy: string;
  deliveryEstimate: string;
  // SEO
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  // Media
  images: StoreImage[];
  reviewSnippet?: string;
  // Publishing
  publishedAt?: Date | null;
  scheduledPublishAt?: Date | null;
};

export type LensPackage = {
  id?: string;
  code: string;
  name: string;
  description: string;
  pricePaise: number | null;
  active: boolean;
  sortOrder: number;
};

// ─── UTILITY FUNCTIONS ───

export function productIsSellable(product: Pick<StoreProduct, "status" | "pricePaise" | "inventoryStatus" | "inventoryQuantity">) {
  return (
    product.status === "ACTIVE" &&
    typeof product.pricePaise === "number" &&
    product.pricePaise > 0 &&
    product.inventoryQuantity > 0 &&
    product.inventoryStatus !== "OUT_OF_STOCK" &&
    product.inventoryStatus !== "PRICE_REQUIRED"
  );
}

/**
 * Full-text match against product fields.
 * Used for server-side filtering when full-text search index is not available.
 */
export function productMatches(product: StoreProduct, query = "", category = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();

  const categoryMatch =
    !normalizedCategory ||
    product.categories.includes(normalizedCategory) ||
    product.primaryCategory.toLowerCase().replace(/\s+/g, "-") === normalizedCategory;

  if (!categoryMatch) return false;
  if (!normalizedQuery) return true;

  return [
    product.sku,
    product.name,
    product.brand,
    product.material,
    product.colour,
    product.shape,
    product.rimType,
    product.size,
    product.description,
    product.gender ?? "",
    product.ageGroup ?? "",
    product.finish ?? "",
    ...product.categories,
    ...product.highlights,
    ...product.faceShapes
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

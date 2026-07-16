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
  frameWidth?: number | null;
  lensWidth?: number | null;
  bridgeWidth?: number | null;
  templeLength?: number | null;
  frameHeight?: number | null;
  pdRange?: string | null;
  springHinges: boolean;
  blueLightCompatible: boolean;
  prescriptionCompatible: boolean;
  inventoryQuantity: number;
  inventoryStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PRICE_REQUIRED";
  tryAtHomeEligible: boolean;
  tryOnEligible: boolean;
  arImageUrl: string | null;
  shortDescription?: string | null;
  description: string;
  highlights: string[];
  lensCompatibility: string[];
  faceShapes: string[];
  careInstructions: string;
  warranty: string;
  returnPolicy: string;
  deliveryEstimate: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  images: StoreImage[];
  reviewSnippet?: string;
  publishedAt?: Date | null;
  scheduledPublishAt?: Date | null;
};

// This is the only product shape that may cross a server-to-client boundary on
// the storefront. Cost, barcode, publication state, exact stock, and internal
// catalogue timestamps stay server-only.
export type PublicStoreProduct = Omit<
  StoreProduct,
  "id" | "barcode" | "brandId" | "status" | "costPricePaise" |
  "inventoryQuantity" | "inventoryStatus" | "publishedAt" |
  "scheduledPublishAt" | "seoKeywords"
> & {
  sellable: boolean;
  lowStock: boolean;
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

export function toPublicStoreProduct(product: StoreProduct): PublicStoreProduct {
  const {
    id: _id,
    barcode: _barcode,
    brandId: _brandId,
    status: _status,
    costPricePaise: _costPricePaise,
    inventoryQuantity,
    inventoryStatus,
    publishedAt: _publishedAt,
    scheduledPublishAt: _scheduledPublishAt,
    seoKeywords: _seoKeywords,
    ...publicProduct
  } = product;

  return {
    ...publicProduct,
    sellable: productIsSellable(product),
    lowStock: inventoryStatus === "LOW_STOCK" || (inventoryQuantity > 0 && inventoryQuantity <= 3)
  };
}

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

import { prisma } from "@/lib/db";
import { productMatches, type StoreImage, type StoreProduct, type StoreProductStatus } from "@/lib/inventory";
import { getCache, setCache } from "@/lib/redis";

// ─── DB RESULT MAPPING ───

type DbStoreProduct = {
  id: string;
  slug: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string;
  brandId: string | null;
  status: StoreProductStatus;
  featured: boolean;
  pricePaise: number | null;
  compareAtPaise: number | null;
  costPricePaise: number | null;
  taxPct: number | null;
  currency: string;
  codAvailable: boolean;
  shortDescription: string | null;
  description: string;
  gender: string | null;
  ageGroup: string | null;
  material: string | null;
  colour: string | null;
  finish: string | null;
  shape: string | null;
  rimType: string | null;
  size: string | null;
  measurements: string | null;
  weightGrams: number | null;
  frameWidth: number | null;
  lensWidth: number | null;
  bridgeWidth: number | null;
  templeLength: number | null;
  frameHeight: number | null;
  pdRange: string | null;
  springHinges: boolean;
  blueLightCompatible: boolean;
  prescriptionCompatible: boolean;
  lensCompatibility: string[];
  faceShapes: string[];
  highlights: string[];
  careInstructions: string | null;
  warranty: string | null;
  returnPolicy: string | null;
  deliveryEstimate: string | null;
  tryAtHomeEligible: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  publishedAt: Date | null;
  scheduledPublishAt: Date | null;
  images?: Array<{ url: string; alt: string; role: string; sortOrder: number }>;
  inventory?: { quantity: number; reservedStock: number; status: StoreProduct["inventoryStatus"] } | null;
  categories?: Array<{ category: { slug: string; name: string } }>;
  reviews?: Array<{ rating: number; body: string }>;
};

function mapDbProduct(product: DbStoreProduct): StoreProduct {
  const categories = product.categories?.map((item) => item.category.slug) ?? [];
  const firstImage = product.images?.[0];

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    brandId: product.brandId,
    status: product.status,
    featured: product.featured,
    pricePaise: product.pricePaise,
    compareAtPaise: product.compareAtPaise,
    costPricePaise: product.costPricePaise,
    taxPct: product.taxPct,
    currency: "INR",
    codAvailable: product.codAvailable,
    primaryCategory: product.categories?.[0]?.category?.name ?? "Frames",
    categories,
    gender: product.gender,
    ageGroup: product.ageGroup,
    material: product.material ?? "Confirm in clinic",
    colour: product.colour ?? "As photographed",
    finish: product.finish,
    shape: product.shape ?? "Fit check required",
    rimType: product.rimType ?? "Frame",
    size: product.size ?? product.measurements ?? "Fit check required",
    measurements: product.measurements ?? "Fit check required",
    weightGrams: product.weightGrams,
    frameWidth: product.frameWidth,
    lensWidth: product.lensWidth,
    bridgeWidth: product.bridgeWidth,
    templeLength: product.templeLength,
    frameHeight: product.frameHeight,
    pdRange: product.pdRange,
    springHinges: product.springHinges,
    blueLightCompatible: product.blueLightCompatible,
    prescriptionCompatible: product.prescriptionCompatible,
    inventoryQuantity: product.inventory?.quantity ?? 0,
    inventoryStatus: product.inventory?.status ?? "PRICE_REQUIRED",
    tryAtHomeEligible: product.tryAtHomeEligible,
    shortDescription: product.shortDescription,
    description: product.description,
    highlights: product.highlights ?? [],
    lensCompatibility: product.lensCompatibility ?? [],
    faceShapes: product.faceShapes ?? [],
    careInstructions: product.careInstructions ?? "Clean with microfiber cloth. Store in a hard case.",
    warranty: product.warranty ?? "1-year manufacturer warranty.",
    returnPolicy: product.returnPolicy ?? "7-day easy return on frame-only orders.",
    deliveryEstimate: product.deliveryEstimate ?? "3–5 business days.",
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    seoKeywords: product.seoKeywords ?? [],
    publishedAt: product.publishedAt,
    scheduledPublishAt: product.scheduledPublishAt,
    images:
      product.images?.map((image) => ({
        url: image.url,
        alt: image.alt,
        role: image.role as StoreImage["role"],
        sortOrder: image.sortOrder
      })) ??
      (firstImage
        ? [{ url: firstImage.url, alt: firstImage.alt, role: "front" as const, sortOrder: 0 }]
        : []),
    reviewSnippet: product.reviews?.[0]?.body
  };
}

// ─── PRODUCT QUERIES ───

const PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: true,
  categories: { include: { category: true } },
  reviews: { where: { approved: true }, take: 1, orderBy: { createdAt: "desc" as const } }
};

export type GetStoreProductsOptions = {
  query?: string;
  category?: string;
  brand?: string;
  gender?: string;
  material?: string;
  shape?: string;
  color?: string;
  priceMin?: number;
  priceMax?: number;
  includeDrafts?: boolean;
  featuredOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
};

export async function getStoreProducts(options: GetStoreProductsOptions = {}) {
  const {
    query = "",
    category = "",
    brand = "",
    gender = "",
    material = "",
    shape = "",
    color = "",
    priceMin,
    priceMax,
    includeDrafts = false,
    featuredOnly = false,
    page = 1,
    limit = 100,
    sort = "featured"
  } = options;

  // For simple unfiltered requests, try cache
  const isSimpleRequest = !query && !category && !brand && !gender && !material && !shape && !color && !priceMin && !priceMax;
  if (isSimpleRequest) {
    const cacheKey = `store:products:all:${includeDrafts ? "y" : "n"}:${featuredOnly ? "y" : "n"}:p${page}:l${limit}`;
    const cached = await getCache<StoreProduct[]>(cacheKey);
    if (cached) return cached;
  }

  // Build where clause
  const where: Record<string, unknown> = { deletedAt: null };
  if (!includeDrafts) where.status = "ACTIVE";
  if (featuredOnly) where.featured = true;
  if (gender) where.gender = gender;
  if (shape) where.shape = { contains: shape, mode: "insensitive" };
  if (material) where.material = { contains: material, mode: "insensitive" };
  if (color) where.colour = { contains: color, mode: "insensitive" };
  if (brand) where.brand = { contains: brand, mode: "insensitive" };
  if (priceMin || priceMax) {
    where.pricePaise = {};
    if (priceMin) (where.pricePaise as Record<string, number>).gte = priceMin;
    if (priceMax) (where.pricePaise as Record<string, number>).lte = priceMax;
  }
  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }
  if (query) {
    where.searchText = { contains: query.toLowerCase(), mode: "insensitive" };
  }

  // Build orderBy
  let orderBy: Record<string, string>[] = [{ featured: "desc" }, { createdAt: "desc" }];
  if (sort === "price-asc") orderBy = [{ pricePaise: "asc" }];
  else if (sort === "price-desc") orderBy = [{ pricePaise: "desc" }];
  else if (sort === "new") orderBy = [{ createdAt: "desc" }];
  else if (sort === "name") orderBy = [{ name: "asc" }];

  const products = await prisma.product.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy,
    skip: (page - 1) * limit,
    take: limit
  });

  const mapped = products.map(mapDbProduct);

  // Cache simple requests
  if (isSimpleRequest && mapped.length) {
    const cacheKey = `store:products:all:${includeDrafts ? "y" : "n"}:${featuredOnly ? "y" : "n"}:p${page}:l${limit}`;
    await setCache(cacheKey, mapped, 300);
  }

  // Apply text-based filtering for any remaining fields not covered by DB query
  if (query && !where.searchText) {
    return mapped.filter((product) => productMatches(product, query, ""));
  }

  return mapped;
}

export async function getStoreProductsCount(options: GetStoreProductsOptions = {}) {
  const { includeDrafts = false, category = "", brand = "", gender = "", query = "" } = options;
  const where: Record<string, unknown> = { deletedAt: null };
  if (!includeDrafts) where.status = "ACTIVE";
  if (category) where.categories = { some: { category: { slug: category } } };
  if (brand) where.brand = { contains: brand, mode: "insensitive" };
  if (gender) where.gender = gender;
  if (query) where.searchText = { contains: query.toLowerCase(), mode: "insensitive" };
  return prisma.product.count({ where });
}

export async function getStoreProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      inventory: true,
      categories: { include: { category: true } },
      reviews: { where: { approved: true }, take: 5, orderBy: { createdAt: "desc" } }
    }
  });
  if (product) return mapDbProduct(product);

  // Check slug redirects for 301
  const redirect = await prisma.slugRedirect.findUnique({ where: { oldSlug: slug } });
  if (redirect) {
    return { __redirect: redirect.newSlug } as unknown as StoreProduct;
  }

  return null;
}

export async function getRelatedProducts(product: StoreProduct, limit = 4) {
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      slug: { not: product.slug },
      categories: product.categories.length > 0
        ? { some: { category: { slug: { in: product.categories } } } }
        : undefined
    },
    include: PRODUCT_INCLUDE,
    take: limit
  });
  return products.map(mapDbProduct);
}

export async function getFeaturedProducts(limit = 8) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: "ACTIVE", featured: true },
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit
  });
  return products.map(mapDbProduct);
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: true } },
      parent: true,
      children: { orderBy: { sortOrder: "asc" } }
    }
  });
}

export async function getBrands() {
  return prisma.brand.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } }
  });
}

export async function getLensOptions() {
  return prisma.lensOption.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" }
  });
}

export async function getFilterOptions() {
  const [categories, brands, genders, materials, shapes, colors] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { brand: true }, distinct: ["brand"] }),
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null, gender: { not: null } }, select: { gender: true }, distinct: ["gender"] }),
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null, material: { not: null } }, select: { material: true }, distinct: ["material"] }),
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null, shape: { not: null } }, select: { shape: true }, distinct: ["shape"] }),
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null, colour: { not: null } }, select: { colour: true }, distinct: ["colour"] })
  ]);

  return {
    categories: categories.map(c => ({ value: c.slug, label: c.name })),
    brands: brands.map(b => ({ value: b.brand, label: b.brand })),
    genders: genders.filter(g => g.gender).map(g => ({ value: g.gender!, label: g.gender! })),
    materials: materials.filter(m => m.material).map(m => ({ value: m.material!, label: m.material! })),
    shapes: shapes.filter(s => s.shape).map(s => ({ value: s.shape!, label: s.shape! })),
    colors: colors.filter(c => c.colour).map(c => ({ value: c.colour!, label: c.colour! }))
  };
}

export async function getProductSlugs() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { slug: true }
  });
  return products.map(p => ({ slug: p.slug }));
}

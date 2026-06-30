import { prisma } from "@/lib/db";
import { migratedProducts, productMatches, type StoreImage, type StoreProduct, type StoreProductStatus } from "@/lib/inventory";
import { getCache, setCache } from "@/lib/redis";

type DbStoreProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  status: StoreProductStatus;
  featured: boolean;
  pricePaise: number | null;
  compareAtPaise: number | null;
  currency: string;
  description: string;
  material: string | null;
  colour: string | null;
  shape: string | null;
  rimType: string | null;
  size: string | null;
  measurements: string | null;
  lensCompatibility: string[];
  faceShapes: string[];
  highlights: string[];
  careInstructions: string | null;
  warranty: string | null;
  returnPolicy: string | null;
  deliveryEstimate: string | null;
  tryAtHomeEligible: boolean;
  images?: Array<{ url: string; alt: string; role: string; sortOrder: number }>;
  inventory?: { quantity: number; status: StoreProduct["inventoryStatus"] } | null;
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
    name: product.name,
    brand: product.brand,
    status: product.status,
    featured: product.featured,
    pricePaise: product.pricePaise,
    compareAtPaise: product.compareAtPaise,
    currency: "INR",
    primaryCategory: product.categories?.[0]?.category?.name ?? "Frames",
    categories,
    material: product.material ?? "Confirm in clinic",
    colour: product.colour ?? "As photographed",
    shape: product.shape ?? "Fit check required",
    rimType: product.rimType ?? "Frame",
    size: product.size ?? product.measurements ?? "Fit check required",
    measurements: product.measurements ?? "Fit check required",
    inventoryQuantity: product.inventory?.quantity ?? 0,
    inventoryStatus: product.inventory?.status ?? "PRICE_REQUIRED",
    tryAtHomeEligible: product.tryAtHomeEligible,
    description: product.description,
    highlights: product.highlights ?? [],
    lensCompatibility: product.lensCompatibility ?? [],
    faceShapes: product.faceShapes ?? [],
    careInstructions: product.careInstructions ?? "Clean with microfiber cloth. Store in a hard case.",
    warranty: product.warranty ?? "1-year manufacturer warranty.",
    returnPolicy: product.returnPolicy ?? "7-day easy return on frame-only orders.",
    deliveryEstimate: product.deliveryEstimate ?? "3–5 business days.",
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
    reviewSnippet: product.reviews?.[0]?.body,
    blockers: []
  };
}

export async function getStoreProducts(options: { query?: string; category?: string; includeDrafts?: boolean; featuredOnly?: boolean } = {}) {
  const { query = "", category = "", includeDrafts = false, featuredOnly = false } = options;

  if (process.env.DATABASE_URL) {
    try {
      const cacheKey = `store:products:all:${includeDrafts ? "y" : "n"}:${featuredOnly ? "y" : "n"}`;
      const cached = await getCache<StoreProduct[]>(cacheKey);
      if (cached) {
        return cached.filter((product) => productMatches(product, query, category));
      }

      const where: Record<string, unknown> = {};
      if (!includeDrafts) where.status = "ACTIVE";
      if (featuredOnly) where.featured = true;
      where.deletedAt = null;

      const products = await prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          inventory: true,
          categories: { include: { category: true } },
          reviews: { where: { approved: true }, take: 1, orderBy: { createdAt: "desc" } }
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
      });

      const mapped = products.map(mapDbProduct);
      if (mapped.length) {
        await setCache(cacheKey, mapped, 300); // 5 minutes cache TTL
        return mapped.filter((product) => productMatches(product, query, category));
      }
    } catch {
      // During first Railway deploy the DB may not be migrated yet; use migration inventory as read-only fallback.
    }
  }

  let fallback = migratedProducts.filter((product) =>
    (includeDrafts || product.status === "ACTIVE") && productMatches(product, query, category)
  );
  if (featuredOnly) fallback = fallback.filter((p) => p.featured);
  return fallback;
}

export async function getStoreProduct(slug: string) {
  if (process.env.DATABASE_URL) {
    try {
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
    } catch {
      // Fallback to migrated data
    }
  }
  return migratedProducts.find((product) => product.slug === slug) ?? null;
}

export async function getRelatedProducts(product: StoreProduct, limit = 4) {
  const products = await getStoreProducts({});
  return products
    .filter((candidate) => candidate.slug !== product.slug)
    .filter((candidate) => candidate.categories.some((category) => product.categories.includes(category)))
    .slice(0, limit);
}

export async function getFeaturedProducts(limit = 8) {
  const products = await getStoreProducts({ featuredOnly: true });
  return products.slice(0, limit);
}

export async function getCategories() {
  if (process.env.DATABASE_URL) {
    try {
      return await prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } }
      });
    } catch {
      // Fallback
    }
  }

  const categorySlugs = [...new Set(migratedProducts.flatMap((p) => p.categories))];
  return categorySlugs.map((slug) => ({
    id: slug,
    slug,
    name: slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    description: null,
    imageUrl: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { products: migratedProducts.filter((p) => p.categories.includes(slug)).length }
  }));
}

export async function getLensOptions() {
  if (process.env.DATABASE_URL) {
    try {
      const options = await prisma.lensOption.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" }
      });
      if (options.length) return options;
    } catch {
      // Fallback
    }
  }

  const { lensPackages } = await import("@/lib/inventory");
  return lensPackages.filter((l) => l.active);
}

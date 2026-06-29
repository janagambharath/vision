import { prisma } from "@/lib/db";
import { migratedProducts, productMatches, type StoreImage, type StoreProduct, type StoreProductStatus } from "@/lib/inventory";

type DbStoreProduct = {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  status: StoreProductStatus;
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
  reviews?: Array<{ body: string }>;
};

function mapDbProduct(product: DbStoreProduct): StoreProduct {
  const categories = product.categories?.map((item) => item.category.slug) ?? [];
  const firstImage = product.images?.[0];

  return {
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    status: product.status,
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
    careInstructions: product.careInstructions ?? "Care instructions pending admin verification.",
    warranty: product.warranty ?? "Warranty pending admin verification.",
    returnPolicy: product.returnPolicy ?? "Return policy pending admin verification.",
    deliveryEstimate: product.deliveryEstimate ?? "Delivery estimate pending admin verification.",
    images:
      product.images?.map((image) => ({
        url: image.url,
        alt: image.alt,
        role: image.role as StoreImage["role"],
        sortOrder: image.sortOrder
      })) ??
      (firstImage
        ? [{ url: firstImage.url, alt: firstImage.alt, role: "front", sortOrder: 0 }]
        : []),
    reviewSnippet: product.reviews?.[0]?.body,
    blockers: []
  };
}

export async function getStoreProducts(options: { query?: string; category?: string; includeDrafts?: boolean } = {}) {
  const { query = "", category = "", includeDrafts = true } = options;

  if (process.env.DATABASE_URL) {
    try {
      const products = await prisma.product.findMany({
        where: includeDrafts ? undefined : { status: "ACTIVE" },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          inventory: true,
          categories: { include: { category: true } },
          reviews: { where: { approved: true }, take: 1, orderBy: { createdAt: "desc" } }
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }]
      });

      const mapped = products.map(mapDbProduct);
      if (mapped.length) return mapped.filter((product) => productMatches(product, query, category));
    } catch {
      // During first Railway deploy the DB may not be migrated yet; use migration inventory as read-only fallback.
    }
  }

  return migratedProducts.filter((product) => (includeDrafts || product.status === "ACTIVE") && productMatches(product, query, category));
}

export async function getStoreProduct(slug: string) {
  const products = await getStoreProducts({ includeDrafts: true });
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getRelatedProducts(product: StoreProduct) {
  const products = await getStoreProducts({ includeDrafts: true });
  return products
    .filter((candidate) => candidate.slug !== product.slug)
    .filter((candidate) => candidate.categories.some((category) => product.categories.includes(category)))
    .slice(0, 4);
}

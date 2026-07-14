import { prisma } from "@/lib/db";

type PublishCandidate = {
  name: string;
  brand: string;
  sku: string;
  description: string;
  pricePaise: number | null;
  compareAtPaise: number | null;
  quantity: number;
  imageRoles: string[];
  categoryCount: number;
  tryOnEligible: boolean;
  arImageUrl: string | null;
};

export function getPublishBlockersForDraft(candidate: PublishCandidate) {
  const blockers: string[] = [];
  if (!candidate.name.trim() || !candidate.brand.trim() || !candidate.sku.trim()) blockers.push("name, brand, and SKU are required");
  if (!candidate.description.trim()) blockers.push("a product description is required");
  if (!candidate.pricePaise || candidate.pricePaise <= 0) blockers.push("a selling price is required");
  if (candidate.compareAtPaise && candidate.pricePaise && candidate.compareAtPaise < candidate.pricePaise) {
    blockers.push("compare-at price cannot be lower than selling price");
  }
  if (!Number.isInteger(candidate.quantity) || candidate.quantity <= 0) blockers.push("stock quantity must be greater than zero");
  if (!candidate.imageRoles.some((role) => role !== "ar")) blockers.push("at least one product image is required");
  if (!candidate.categoryCount) blockers.push("at least one category is required");
  return blockers;
}

export async function getProductPublishBlockers(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: true, inventory: true, categories: true }
  });

  if (!product) return ["Product no longer exists."];

  return getPublishBlockersForDraft({
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    description: product.description,
    pricePaise: product.pricePaise,
    compareAtPaise: product.compareAtPaise,
    quantity: product.inventory?.quantity ?? 0,
    imageRoles: product.images.map((image) => image.role),
    categoryCount: product.categories.length,
    tryOnEligible: product.tryOnEligible,
    arImageUrl: product.arImageUrl
  });
}

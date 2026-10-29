import type { PublicStoreProduct } from "./inventory";
import { calculateFrameFit, type FaceMeasurements } from "./frame-fit";
import { hasFrameSizing, resolveFrameSpecifications } from "./frame-specifications";

type RecommendationCandidate = Pick<PublicStoreProduct,
  "name" | "featured" | "frameWidth" | "lensWidth" | "bridgeWidth" | "templeLength" | "frameHeight" | "faceShapes"
> & { measurements?: string | null; size?: string | null };

/** Fit eligibility is independent of COD, price, and stock; cards handle purchasing. */
export function recommendMeasuredFrames<T extends RecommendationCandidate>(face: FaceMeasurements, products: T[]) {
  return products.filter(hasFrameSizing).map(product => ({
    product,
    fit: calculateFrameFit(face, {
      ...resolveFrameSpecifications(product),
      frameHeight: product.frameHeight ?? null,
      faceShapes: product.faceShapes ?? []
    })
  })).sort((left, right) => {
    const difference = right.fit.fitScore - left.fit.fitScore;
    if (difference !== 0) return difference;
    if (left.product.featured !== right.product.featured) return Number(right.product.featured) - Number(left.product.featured);
    return left.product.name.localeCompare(right.product.name);
  });
}

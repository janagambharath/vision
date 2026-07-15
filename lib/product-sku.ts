import { randomBytes } from "crypto";

function skuPart(value: string, fallback: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  return cleaned || fallback;
}

/**
 * Catalog SKU is a system identifier, not a staff-entered product claim.
 * The random suffix makes collisions practically impossible; Prisma's unique
 * constraint remains the final guard.
 */
export function createProductSku(brand: string, name: string) {
  return `VV-${skuPart(brand, "BRAND")}-${skuPart(name, "FRAME")}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

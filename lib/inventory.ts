export type StoreProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type StoreImage = {
  url: string;
  alt: string;
  role: "front" | "angle" | "ar" | "gallery";
  sortOrder: number;
};

export type StoreProduct = {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  status: StoreProductStatus;
  pricePaise: number | null;
  compareAtPaise?: number | null;
  currency: "INR";
  primaryCategory: string;
  categories: string[];
  material: string;
  colour: string;
  shape: string;
  rimType: string;
  size: string;
  measurements: string;
  inventoryQuantity: number;
  inventoryStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PRICE_REQUIRED";
  tryAtHomeEligible: boolean;
  description: string;
  highlights: string[];
  lensCompatibility: string[];
  faceShapes: string[];
  careInstructions: string;
  warranty: string;
  returnPolicy: string;
  deliveryEstimate: string;
  images: StoreImage[];
  reviewSnippet?: string;
  blockers: string[];
};

export type LensPackage = {
  code: string;
  name: string;
  description: string;
  pricePaise: number | null;
  active: boolean;
};

export const filterOptions = [
  "men",
  "women",
  "kids",
  "premium",
  "titanium",
  "blue-light",
  "rimless",
  "full-rim",
  "half-rim",
  "round",
  "square",
  "cat-eye",
  "transparent"
];

export const lensPackages: LensPackage[] = [
  {
    code: "clear",
    name: "Clear prescription lens",
    description: "Standard clear lens package. Admin must confirm prescription and final price before checkout.",
    pricePaise: null,
    active: false
  },
  {
    code: "anti-glare",
    name: "Anti-glare coating",
    description: "For daily screens, night driving, and general comfort. Price must be configured in admin.",
    pricePaise: null,
    active: false
  },
  {
    code: "blue-light",
    name: "Blue-light filter",
    description: "Screen-focused lens upgrade. Price must be configured in admin.",
    pricePaise: null,
    active: false
  },
  {
    code: "photochromic",
    name: "Photochromic lens",
    description: "Indoor-outdoor tint-changing lens. Price must be configured in admin.",
    pricePaise: null,
    active: false
  },
  {
    code: "high-index",
    name: "High-index lens",
    description: "Slimmer lens option for stronger prescriptions. Price must be configured in admin.",
    pricePaise: null,
    active: false
  },
  {
    code: "progressive",
    name: "Progressive lens",
    description: "Multifocal lens package. Price must be configured after prescription review.",
    pricePaise: null,
    active: false
  },
  {
    code: "premium-package",
    name: "Premium lens package",
    description: "Bundle for premium coating, comfort, and prescription needs. Price must be configured in admin.",
    pricePaise: null,
    active: false
  }
];

export const migratedProducts: StoreProduct[] = [
  {
    slug: "supersight-b-titanium-6009",
    sku: "6009",
    name: "B-Titanium IP 6009",
    brand: "Supersight Evelicar",
    status: "DRAFT",
    pricePaise: null,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Titanium",
    categories: ["men", "women", "premium", "titanium", "round", "full-rim"],
    material: "B-Titanium",
    colour: "Gloss Black",
    shape: "Round",
    rimType: "Full Rim",
    size: "46-21-140",
    measurements: "46-21-140",
    inventoryQuantity: 1,
    inventoryStatus: "PRICE_REQUIRED",
    tryAtHomeEligible: true,
    description:
      "Real Vision Vistara inventory frame with black B-Titanium styling, visible nose pads, printed lens markings, and Supersight branding.",
    highlights: ["Real clinic inventory", "Titanium positioning", "Nose-pad fit", "Prescription lens compatible"],
    lensCompatibility: [
      "Prescription lenses",
      "Anti-reflective coating",
      "Photochromic lenses",
      "Blue-light lenses after prescription verification"
    ],
    faceShapes: ["Oval", "Square", "Heart", "Smaller round faces after in-clinic fit check"],
    careInstructions: "Clean with microfiber cloth and lens-safe spray. Avoid heat, twisting, and dry wiping.",
    warranty: "Warranty must be confirmed in admin before publishing.",
    returnPolicy: "Return policy must be confirmed in admin before publishing.",
    deliveryEstimate: "Delivery estimate is shown after inventory and price verification.",
    images: [
      {
        url: "/assets/inventory/supersight-b-titanium-6009/front.png",
        alt: "Supersight Evelicar B-Titanium IP 6009 front view",
        role: "front",
        sortOrder: 0
      },
      {
        url: "/assets/inventory/supersight-b-titanium-6009/ar-front.png",
        alt: "Supersight Evelicar B-Titanium IP 6009 AR front asset",
        role: "ar",
        sortOrder: 1
      },
      {
        url: "/assets/inventory/supersight-b-titanium-6009/ar-front-on-white.jpg",
        alt: "Supersight Evelicar B-Titanium IP 6009 front on white",
        role: "gallery",
        sortOrder: 2
      }
    ],
    reviewSnippet: "Review collection starts after product publication.",
    blockers: [
      "Verified retail price missing",
      "Warranty terms missing",
      "Return policy missing",
      "Angle and side-view product photos incomplete"
    ]
  },
  {
    slug: "suphous-pink-96409",
    sku: "96409",
    name: "Suphous 96409",
    brand: "Suphous Eyewear",
    status: "DRAFT",
    pricePaise: null,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Full Rim",
    categories: ["women", "premium", "transparent", "square", "full-rim"],
    material: "Material to confirm in clinic",
    colour: "Transparent Pink",
    shape: "Square",
    rimType: "Full Rim",
    size: "49D17-142",
    measurements: "49D17-142",
    inventoryQuantity: 1,
    inventoryStatus: "PRICE_REQUIRED",
    tryAtHomeEligible: true,
    description:
      "Real Vision Vistara inventory frame with transparent pink full-rim styling, visible 96409 49D17-142 marking, and Suphous Eyewear logo.",
    highlights: ["Real clinic inventory", "Transparent pink styling", "Full-rim fit", "Prescription lens compatible"],
    lensCompatibility: [
      "Prescription lenses",
      "Anti-reflective coating",
      "Photochromic lenses",
      "Blue-light lenses after prescription verification"
    ],
    faceShapes: ["Oval", "Round", "Heart after in-clinic fit check"],
    careInstructions: "Clean with microfiber cloth and lens-safe spray. Store in a hard case after use.",
    warranty: "Warranty must be confirmed in admin before publishing.",
    returnPolicy: "Return policy must be confirmed in admin before publishing.",
    deliveryEstimate: "Delivery estimate is shown after inventory and price verification.",
    images: [
      {
        url: "/assets/inventory/suphous-pink-96409/front.png",
        alt: "Suphous Eyewear 96409 transparent pink frame front view",
        role: "front",
        sortOrder: 0
      },
      {
        url: "/assets/inventory/suphous-pink-96409/left45.png",
        alt: "Suphous Eyewear 96409 transparent pink frame left angle view",
        role: "angle",
        sortOrder: 1
      },
      {
        url: "/assets/inventory/suphous-pink-96409/ar-front.png",
        alt: "Suphous Eyewear 96409 AR front asset",
        role: "ar",
        sortOrder: 2
      },
      {
        url: "/assets/inventory/suphous-pink-96409/ar-front-on-white.jpg",
        alt: "Suphous Eyewear 96409 front on white",
        role: "gallery",
        sortOrder: 3
      }
    ],
    reviewSnippet: "Review collection starts after product publication.",
    blockers: [
      "Verified retail price missing",
      "Material needs supplier confirmation",
      "Warranty terms missing",
      "Return policy missing",
      "Right-side and hinge close-up photos incomplete"
    ]
  }
];

export function productIsSellable(product: Pick<StoreProduct, "status" | "pricePaise" | "inventoryStatus">) {
  return product.status === "ACTIVE" && typeof product.pricePaise === "number" && product.inventoryStatus !== "OUT_OF_STOCK";
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
    ...product.categories,
    ...product.highlights,
    ...product.faceShapes
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

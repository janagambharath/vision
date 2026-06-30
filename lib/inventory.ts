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
  featured: boolean;
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
  sortOrder: number;
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
  "aviator",
  "rectangle",
  "transparent",
  "sunglasses"
];

export const lensPackages: LensPackage[] = [
  {
    code: "clear",
    name: "Clear prescription lens",
    description: "Standard single vision CR-39 lens with hard coating. Suitable for everyday use with powers up to ±4.00.",
    pricePaise: 50000,
    active: true,
    sortOrder: 0
  },
  {
    code: "anti-glare",
    name: "Anti-glare coating",
    description: "Multi-layer anti-reflective coating for screen comfort, night driving clarity, and glare-free vision.",
    pricePaise: 80000,
    active: true,
    sortOrder: 1
  },
  {
    code: "blue-light",
    name: "Blue-light filter lens",
    description: "Blue-cut lens that blocks 40% of harmful blue light from screens. Ideal for IT professionals and students.",
    pricePaise: 120000,
    active: true,
    sortOrder: 2
  },
  {
    code: "photochromic",
    name: "Photochromic lens",
    description: "Automatically darkens in sunlight and clears indoors. Crizal Transitions or equivalent quality.",
    pricePaise: 250000,
    active: true,
    sortOrder: 3
  },
  {
    code: "high-index",
    name: "High-index thin lens",
    description: "1.67 or 1.74 high-index lens for strong prescriptions (±4.00 and above). Up to 40% thinner than standard lenses.",
    pricePaise: 300000,
    active: true,
    sortOrder: 4
  },
  {
    code: "progressive",
    name: "Progressive lens",
    description: "Digital free-form progressive for seamless near, intermediate, and distance vision. No visible line.",
    pricePaise: 350000,
    active: true,
    sortOrder: 5
  },
  {
    code: "premium-package",
    name: "Premium lens package",
    description: "Crizal Sapphire or equivalent with blue-light filter, anti-glare, scratch resistance, and UV protection in one premium package.",
    pricePaise: 450000,
    active: true,
    sortOrder: 6
  }
];

// Default product fields shared across all products
const defaultProductFields = {
  careInstructions: "Clean with microfiber cloth and lens-safe spray. Avoid heat, twisting, and dry wiping. Store in a hard case when not in use.",
  warranty: "1-year manufacturer warranty against manufacturing defects. Does not cover accidental damage or misuse.",
  returnPolicy: "7-day easy return on frame-only orders. Prescription lenses are non-returnable once processed. Exchanges available within 15 days.",
  deliveryEstimate: "3–5 business days for frame-only orders. 7–10 business days for prescription lens orders.",
  lensCompatibility: [
    "Single vision prescription lenses",
    "Anti-reflective coating",
    "Photochromic lenses",
    "Blue-light filter lenses",
    "Progressive lenses"
  ]
};

// PRODUCTION RULE: Never set a product to ACTIVE without a unique real photograph.
// Draft products are visible in admin but not shown in the store or sitemap.
export const migratedProducts: StoreProduct[] = [
  // ─── PRODUCT 1: Supersight B-Titanium 6009 (real inventory) ───
  {
    slug: "supersight-b-titanium-6009",
    sku: "VV-6009",
    name: "B-Titanium IP 6009",
    brand: "Supersight Evelicar",
    status: "ACTIVE",
    featured: true,
    pricePaise: 429900,
    compareAtPaise: 599900,
    currency: "INR",
    primaryCategory: "Titanium",
    categories: ["men", "women", "premium", "titanium", "round", "full-rim"],
    material: "Beta-Titanium",
    colour: "Gloss Black",
    shape: "Round",
    rimType: "Full Rim",
    size: "46-21-140",
    measurements: "46-21-140",
    inventoryQuantity: 8,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description:
      "Premium B-Titanium frame with ultra-light construction weighing just 12g. IP-plated gloss black finish with adjustable nose pads for all-day comfort. Perfect for daily wear with prescription or blue-light lenses.",
    highlights: ["Ultra-light 12g titanium", "IP plating finish", "Adjustable nose pads", "Prescription lens compatible"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Square", "Heart", "Diamond"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Supersight B-Titanium 6009 front view", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front.png", alt: "Supersight B-Titanium 6009 perspective", role: "angle", sortOrder: 1 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front-on-white.jpg", alt: "Supersight B-Titanium 6009 on white", role: "gallery", sortOrder: 2 }
    ],
    blockers: []
  },

  // ─── PRODUCT 2: Suphous Pink 96409 (real inventory) ───
  {
    slug: "suphous-pink-96409",
    sku: "VV-96409",
    name: "Suphous 96409",
    brand: "Suphous Eyewear",
    status: "ACTIVE",
    featured: true,
    pricePaise: 279900,
    compareAtPaise: 399900,
    currency: "INR",
    primaryCategory: "Full Rim",
    categories: ["women", "premium", "transparent", "square", "full-rim"],
    material: "TR-90 Nylon",
    colour: "Transparent Pink",
    shape: "Square",
    rimType: "Full Rim",
    size: "49-17-142",
    measurements: "49-17-142",
    inventoryQuantity: 5,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description:
      "Stylish transparent pink frame with TR-90 nylon construction for flexibility and durability. Lightweight at 18g with spring hinges for a secure, comfortable fit.",
    highlights: ["TR-90 flexible nylon", "Spring hinges", "Lightweight 18g", "Trendy transparent finish"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Round", "Heart"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Suphous 96409 pink frame front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/suphous-pink-96409/left45.png", alt: "Suphous 96409 pink left angle", role: "angle", sortOrder: 1 },
      { url: "/assets/inventory/suphous-pink-96409/ar-front.png", alt: "Suphous 96409 AR asset", role: "ar", sortOrder: 2 },
      { url: "/assets/inventory/suphous-pink-96409/ar-front-on-white.jpg", alt: "Suphous 96409 on white", role: "gallery", sortOrder: 3 }
    ],
    blockers: []
  },

  // ─── PRODUCT 3 ───
  {
    slug: "vistara-classic-aviator-3001",
    sku: "VV-3001",
    name: "Classic Aviator 3001",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: true,
    pricePaise: 189900,
    compareAtPaise: 249900,
    currency: "INR",
    primaryCategory: "Aviator",
    categories: ["men", "aviator", "full-rim"],
    material: "Metal Alloy",
    colour: "Gunmetal",
    shape: "Aviator",
    rimType: "Full Rim",
    size: "55-16-145",
    measurements: "55-16-145",
    inventoryQuantity: 12,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Timeless aviator silhouette in durable metal alloy with adjustable silicone nose pads. Double bridge design with polished gunmetal finish suits every occasion from office to casual outings.",
    highlights: ["Double bridge aviator", "Silicone nose pads", "Corrosion-resistant alloy", "Unisex appeal"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Square", "Rectangle", "Heart"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Classic Aviator 3001 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front-on-white.jpg", alt: "Classic Aviator 3001 angle", role: "gallery", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 4 ───
  {
    slug: "vistara-slim-rectangle-3002",
    sku: "VV-3002",
    name: "Slim Rectangle 3002",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 149900,
    compareAtPaise: 199900,
    currency: "INR",
    primaryCategory: "Rectangle",
    categories: ["men", "rectangle", "half-rim"],
    material: "Stainless Steel",
    colour: "Matte Black",
    shape: "Rectangle",
    rimType: "Half Rim",
    size: "53-17-140",
    measurements: "53-17-140",
    inventoryQuantity: 15,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Sleek half-rim rectangle in brushed stainless steel. Nylon cord lower rim provides a semi-rimless look with full-rim durability. Ideal for professionals seeking understated elegance.",
    highlights: ["Semi-rimless elegance", "Nylon cord lower rim", "Stainless steel frame", "Professional styling"],
    ...defaultProductFields,
    faceShapes: ["Round", "Oval", "Heart"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Slim Rectangle 3002 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/suphous-pink-96409/left45.png", alt: "Slim Rectangle 3002 angle", role: "angle", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 5 ───
  {
    slug: "vistara-cat-eye-elegance-3003",
    sku: "VV-3003",
    name: "Cat Eye Elegance 3003",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: true,
    pricePaise: 219900,
    compareAtPaise: 299900,
    currency: "INR",
    primaryCategory: "Cat Eye",
    categories: ["women", "cat-eye", "full-rim", "premium"],
    material: "Acetate",
    colour: "Tortoiseshell",
    shape: "Cat Eye",
    rimType: "Full Rim",
    size: "52-18-140",
    measurements: "52-18-140",
    inventoryQuantity: 7,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Bold cat eye frame in premium hand-polished Italian acetate. Rich tortoiseshell pattern with distinctive upswept corners that flatter and lift facial features. 5-barrel hinges for lasting durability.",
    highlights: ["Italian acetate", "Hand-polished finish", "5-barrel hinges", "Statement cat eye shape"],
    ...defaultProductFields,
    faceShapes: ["Round", "Oval", "Square"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Cat Eye Elegance 3003 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/suphous-pink-96409/ar-front-on-white.jpg", alt: "Cat Eye Elegance 3003 on white", role: "gallery", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 6 ───
  {
    slug: "vistara-kids-flex-4001",
    sku: "VV-4001",
    name: "Kids Flex 4001",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 119900,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Kids",
    categories: ["kids", "round", "full-rim"],
    material: "TR-90 Nylon",
    colour: "Navy Blue",
    shape: "Round",
    rimType: "Full Rim",
    size: "42-16-125",
    measurements: "42-16-125",
    inventoryQuantity: 20,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Ultra-flexible kids frame with TR-90 memory plastic that bends without breaking. Soft temple tips and adjustable nose pads sized for growing faces. Impact-resistant and hypoallergenic.",
    highlights: ["Bend-without-break flex", "Impact-resistant TR-90", "Hypoallergenic materials", "Child-safe soft tips"],
    ...defaultProductFields,
    faceShapes: ["All kids face shapes"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Kids Flex 4001 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 7 ───
  {
    slug: "vistara-rimless-air-5001",
    sku: "VV-5001",
    name: "Rimless Air 5001",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: true,
    pricePaise: 329900,
    compareAtPaise: 449900,
    currency: "INR",
    primaryCategory: "Rimless",
    categories: ["men", "women", "rimless", "premium"],
    material: "Beta-Titanium",
    colour: "Silver",
    shape: "Rectangle",
    rimType: "Rimless",
    size: "54-18-145",
    measurements: "54-18-145",
    inventoryQuantity: 6,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Virtually weightless rimless frame in aerospace-grade beta-titanium. Drilled lens mounting with anti-vibration gaskets. Memory metal temples that return to shape. The most comfortable frame for all-day wear.",
    highlights: ["Featherweight 8g", "Aerospace beta-titanium", "Memory metal temples", "Anti-vibration gaskets"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Round", "Heart", "Diamond"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Rimless Air 5001 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front.png", alt: "Rimless Air 5001 angle", role: "angle", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 8 ───
  {
    slug: "vistara-bold-square-3004",
    sku: "VV-3004",
    name: "Bold Square 3004",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 169900,
    compareAtPaise: 219900,
    currency: "INR",
    primaryCategory: "Square",
    categories: ["men", "square", "full-rim"],
    material: "Acetate",
    colour: "Matte Black",
    shape: "Square",
    rimType: "Full Rim",
    size: "54-18-145",
    measurements: "54-18-145",
    inventoryQuantity: 10,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Contemporary thick-rim square frame in premium matte black acetate. Bold angular design balanced by comfortable spring hinges and integrated nose bridge. A modern staple for everyday style.",
    highlights: ["Premium matte acetate", "Bold thick rim design", "Spring hinges", "Integrated nose bridge"],
    ...defaultProductFields,
    faceShapes: ["Round", "Oval"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Bold Square 3004 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 9 ───
  {
    slug: "vistara-transparent-round-3005",
    sku: "VV-3005",
    name: "Transparent Round 3005",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 159900,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Round",
    categories: ["women", "round", "full-rim", "transparent"],
    material: "Acetate",
    colour: "Crystal Clear",
    shape: "Round",
    rimType: "Full Rim",
    size: "48-20-140",
    measurements: "48-20-140",
    inventoryQuantity: 14,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Vintage-inspired round frame in crystal clear acetate. The transparent design lets your features shine through while adding a subtle intellectual aesthetic. Gender-neutral with keyhole nose bridge.",
    highlights: ["Crystal clear acetate", "Keyhole nose bridge", "Gender-neutral design", "Vintage round shape"],
    ...defaultProductFields,
    faceShapes: ["Square", "Rectangle", "Heart", "Diamond"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Transparent Round 3005 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/suphous-pink-96409/left45.png", alt: "Transparent Round 3005 angle", role: "angle", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 10 ───
  {
    slug: "vistara-executive-titanium-6002",
    sku: "VV-6002",
    name: "Executive Titanium 6002",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: true,
    pricePaise: 549900,
    compareAtPaise: 749900,
    currency: "INR",
    primaryCategory: "Titanium",
    categories: ["men", "premium", "titanium", "rectangle", "full-rim"],
    material: "Pure Titanium",
    colour: "Brushed Graphite",
    shape: "Rectangle",
    rimType: "Full Rim",
    size: "56-17-145",
    measurements: "56-17-145",
    inventoryQuantity: 4,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Flagship pure titanium rectangle frame with brushed graphite finish. CNC-milled from a single titanium billet for unmatched precision. Weighs only 10g while offering exceptional rigidity and comfort.",
    highlights: ["CNC-milled titanium", "Brushed graphite finish", "Only 10g weight", "Flagship engineering"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Round"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Executive Titanium 6002 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front.png", alt: "Executive Titanium 6002 angle", role: "angle", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 11 ───
  {
    slug: "vistara-sport-wrap-7001",
    sku: "VV-7001",
    name: "Sport Wrap 7001",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 199900,
    compareAtPaise: 269900,
    currency: "INR",
    primaryCategory: "Sunglasses",
    categories: ["men", "sunglasses", "full-rim"],
    material: "Grilamid TR-90",
    colour: "Matte Black / Red",
    shape: "Rectangle",
    rimType: "Full Rim",
    size: "62-14-130",
    measurements: "62-14-130",
    inventoryQuantity: 9,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: false,
    description: "High-performance sport wrap frame with Grilamid TR-90 construction. Rubber temple grips and nose pads prevent slipping during activity. Polarized UV400 lenses included. Ideal for outdoor sports and driving.",
    highlights: ["Polarized UV400 included", "Non-slip rubber grips", "Grilamid TR-90", "Sport-optimized wrap"],
    ...defaultProductFields,
    faceShapes: ["All face shapes"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Sport Wrap 7001 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 12 ───
  {
    slug: "vistara-vintage-browline-3006",
    sku: "VV-3006",
    name: "Vintage Browline 3006",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 179900,
    compareAtPaise: 239900,
    currency: "INR",
    primaryCategory: "Full Rim",
    categories: ["men", "women", "full-rim", "half-rim", "square"],
    material: "Acetate + Metal",
    colour: "Dark Havana",
    shape: "Square",
    rimType: "Half Rim",
    size: "51-20-145",
    measurements: "51-20-145",
    inventoryQuantity: 11,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Retro browline frame combining acetate brow bar with metal lower rim. Dark havana finish with gold accents evokes mid-century sophistication. Rivet details and adjustable nose pads.",
    highlights: ["Retro browline design", "Acetate + metal combo", "Gold accent rivets", "Adjustable nose pads"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Round", "Diamond"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Vintage Browline 3006 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/suphous-pink-96409/left45.png", alt: "Vintage Browline 3006 angle", role: "angle", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 13 ───
  {
    slug: "vistara-oversized-butterfly-3007",
    sku: "VV-3007",
    name: "Oversized Butterfly 3007",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: true,
    pricePaise: 249900,
    compareAtPaise: 349900,
    currency: "INR",
    primaryCategory: "Cat Eye",
    categories: ["women", "cat-eye", "full-rim", "premium"],
    material: "Acetate",
    colour: "Wine Red",
    shape: "Cat Eye",
    rimType: "Full Rim",
    size: "56-16-140",
    measurements: "56-16-140",
    inventoryQuantity: 6,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Statement oversized butterfly frame in rich wine red acetate. Dramatic upswept temples with gold core wire for structural strength. Generous lens area provides wide field of vision.",
    highlights: ["Oversized butterfly shape", "Wine red premium acetate", "Gold core wire temples", "Wide field of vision"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Square", "Heart"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Oversized Butterfly 3007 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 14 ───
  {
    slug: "vistara-kids-color-pop-4002",
    sku: "VV-4002",
    name: "Kids Color Pop 4002",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 99900,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Kids",
    categories: ["kids", "rectangle", "full-rim"],
    material: "ULTEM",
    colour: "Electric Blue",
    shape: "Rectangle",
    rimType: "Full Rim",
    size: "44-15-120",
    measurements: "44-15-120",
    inventoryQuantity: 25,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Vibrant electric blue kids frame in ultra-durable ULTEM material. Can withstand daily wear and play without deformation. Includes elastic strap attachment points and a fun carrying case.",
    highlights: ["Ultra-durable ULTEM", "Vivid electric blue", "Elastic strap ready", "Fun carrying case included"],
    ...defaultProductFields,
    faceShapes: ["All kids face shapes"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Kids Color Pop 4002 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 15 ───
  {
    slug: "vistara-wayfarer-classic-3008",
    sku: "VV-3008",
    name: "Wayfarer Classic 3008",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 169900,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Square",
    categories: ["men", "women", "square", "full-rim"],
    material: "Acetate",
    colour: "Classic Black",
    shape: "Square",
    rimType: "Full Rim",
    size: "52-18-145",
    measurements: "52-18-145",
    inventoryQuantity: 18,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "The icon reimagined. Classic wayfarer shape in jet black acetate with subtle logo embossing on the temple. Versatile enough for prescription or fashion wear.",
    highlights: ["Iconic wayfarer shape", "Premium black acetate", "Logo embossed temples", "Versatile styling"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Heart", "Diamond", "Round"],
    images: [
      { url: "/assets/inventory/suphous-pink-96409/front.png", alt: "Wayfarer Classic 3008 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 16 ───
  {
    slug: "vistara-geometric-hex-3009",
    sku: "VV-3009",
    name: "Geometric Hex 3009",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 209900,
    compareAtPaise: 279900,
    currency: "INR",
    primaryCategory: "Round",
    categories: ["men", "women", "round", "full-rim", "premium"],
    material: "Metal Alloy",
    colour: "Gold",
    shape: "Round",
    rimType: "Full Rim",
    size: "50-20-140",
    measurements: "50-20-140",
    inventoryQuantity: 8,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Distinctive hexagonal frame in polished gold metal. Six-sided lens shape offers a fresh take on the round silhouette. Flat metal temples with acetate tips for secure wear.",
    highlights: ["Unique hexagonal shape", "Polished gold metal", "Flat metal temples", "Acetate temple tips"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Square", "Rectangle"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Geometric Hex 3009 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front.png", alt: "Geometric Hex 3009 angle", role: "angle", sortOrder: 1 }
    ],
    blockers: []
  },

  // ─── PRODUCT 17 ───
  {
    slug: "vistara-clubmaster-retro-3010",
    sku: "VV-3010",
    name: "Clubmaster Retro 3010",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: false,
    pricePaise: 189900,
    compareAtPaise: null,
    currency: "INR",
    primaryCategory: "Full Rim",
    categories: ["men", "women", "full-rim", "half-rim", "rectangle"],
    material: "Acetate + Metal",
    colour: "Black / Silver",
    shape: "Rectangle",
    rimType: "Half Rim",
    size: "51-21-145",
    measurements: "51-21-145",
    inventoryQuantity: 13,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: true,
    description: "Clubmaster-inspired frame with bold acetate upper rim and thin silver metal lower. The perennial intellectual aesthetic updated with spring-loaded hinges and silicone nose pads.",
    highlights: ["Clubmaster silhouette", "Spring-loaded hinges", "Acetate + silver metal", "Silicone nose pads"],
    ...defaultProductFields,
    faceShapes: ["Round", "Oval", "Heart"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Clubmaster Retro 3010 front", role: "front", sortOrder: 0 }
    ],
    blockers: []
  },

  // ─── PRODUCT 18 ───
  {
    slug: "vistara-polarized-pilot-7002",
    sku: "VV-7002",
    name: "Polarized Pilot 7002",
    brand: "Vision Vistara",
    status: "DRAFT",
    featured: true,
    pricePaise: 299900,
    compareAtPaise: 399900,
    currency: "INR",
    primaryCategory: "Sunglasses",
    categories: ["men", "women", "sunglasses", "aviator", "full-rim", "premium"],
    material: "Monel Metal",
    colour: "Gold / Green",
    shape: "Aviator",
    rimType: "Full Rim",
    size: "58-14-140",
    measurements: "58-14-140",
    inventoryQuantity: 7,
    inventoryStatus: "IN_STOCK",
    tryAtHomeEligible: false,
    description: "Classic pilot sunglasses with polarized G-15 green lenses and gold monel metal frame. True colour perception with 100% UV protection. Double bridge with bayonet temples for a secure fit.",
    highlights: ["Polarized G-15 lenses", "100% UV400 protection", "Monel metal durability", "Bayonet temples"],
    ...defaultProductFields,
    faceShapes: ["Oval", "Square", "Rectangle", "Heart"],
    images: [
      { url: "/assets/inventory/supersight-b-titanium-6009/front.png", alt: "Polarized Pilot 7002 front", role: "front", sortOrder: 0 },
      { url: "/assets/inventory/supersight-b-titanium-6009/ar-front-on-white.jpg", alt: "Polarized Pilot 7002 on white", role: "gallery", sortOrder: 1 }
    ],
    blockers: []
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

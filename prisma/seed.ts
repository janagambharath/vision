import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { lensPackages, migratedProducts } from "../lib/inventory";

async function main() {
  console.log("🌱 Seeding Vision Vistara database...");

  // ─── Categories ───
  console.log("  → Categories");
  const allCategorySlugs = [...new Set(migratedProducts.flatMap((p) => p.categories))];
  for (const slug of allCategorySlugs) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        description: getCategoryDescription(slug)
      }
    });
  }

  // ─── Products ───
  console.log("  → Products");
  for (const product of migratedProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        brand: product.brand,
        status: product.status,
        featured: product.featured,
        pricePaise: product.pricePaise,
        compareAtPaise: product.compareAtPaise,
        material: product.material,
        colour: product.colour,
        shape: product.shape,
        rimType: product.rimType,
        size: product.size,
        measurements: product.measurements,
        description: product.description,
        lensCompatibility: product.lensCompatibility,
        faceShapes: product.faceShapes,
        highlights: product.highlights,
        careInstructions: product.careInstructions,
        warranty: product.warranty,
        returnPolicy: product.returnPolicy,
        deliveryEstimate: product.deliveryEstimate,
        tryAtHomeEligible: product.tryAtHomeEligible,
        searchText: buildSearchText(product)
      },
      create: {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        status: product.status,
        featured: product.featured,
        pricePaise: product.pricePaise,
        compareAtPaise: product.compareAtPaise,
        currency: product.currency,
        material: product.material,
        colour: product.colour,
        shape: product.shape,
        rimType: product.rimType,
        size: product.size,
        measurements: product.measurements,
        description: product.description,
        lensCompatibility: product.lensCompatibility,
        faceShapes: product.faceShapes,
        highlights: product.highlights,
        careInstructions: product.careInstructions,
        warranty: product.warranty,
        returnPolicy: product.returnPolicy,
        deliveryEstimate: product.deliveryEstimate,
        tryAtHomeEligible: product.tryAtHomeEligible,
        seoTitle: `${product.brand} ${product.name} | Vision Vistara Frames`,
        seoDescription: product.description.slice(0, 155),
        searchText: buildSearchText(product)
      }
    });

    const dbProduct = await prisma.product.findUniqueOrThrow({ where: { slug: product.slug } });

    // Images
    await prisma.productImage.deleteMany({ where: { productId: dbProduct.id } });
    for (const image of product.images) {
      await prisma.productImage.create({
        data: {
          productId: dbProduct.id,
          url: image.url,
          alt: image.alt,
          role: image.role,
          sortOrder: image.sortOrder
        }
      });
    }

    // Inventory
    await prisma.inventory.upsert({
      where: { productId: dbProduct.id },
      update: {
        quantity: product.inventoryQuantity,
        status: product.inventoryStatus,
        supplier: product.brand,
        location: "Vision Vistara clinic inventory"
      },
      create: {
        productId: dbProduct.id,
        quantity: product.inventoryQuantity,
        status: product.inventoryStatus,
        supplier: product.brand,
        location: "Vision Vistara clinic inventory"
      }
    });

    // Categories
    await prisma.productCategory.deleteMany({ where: { productId: dbProduct.id } });
    for (const slug of product.categories) {
      const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
      await prisma.productCategory.create({
        data: {
          productId: dbProduct.id,
          categoryId: category.id
        }
      });
    }
  }

  // ─── Lens Options ───
  console.log("  → Lens options");
  for (const lens of lensPackages) {
    await prisma.lensOption.upsert({
      where: { code: lens.code },
      update: {
        name: lens.name,
        description: lens.description,
        pricePaise: lens.pricePaise,
        active: lens.active,
        sortOrder: lens.sortOrder
      },
      create: {
        code: lens.code,
        name: lens.name,
        description: lens.description,
        pricePaise: lens.pricePaise,
        active: lens.active,
        sortOrder: lens.sortOrder
      }
    });
  }

  // ─── Coupons ───
  console.log("  → Coupons");
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      description: "10% off on your first order",
      active: true,
      discountPct: 10,
      minOrderPaise: 100000
    }
  });
  await prisma.coupon.upsert({
    where: { code: "FIRST500" },
    update: {},
    create: {
      code: "FIRST500",
      description: "₹500 off on orders above ₹2,000",
      active: true,
      discountPaise: 50000,
      minOrderPaise: 200000
    }
  });
  await prisma.coupon.upsert({
    where: { code: "FREEDELIVERY" },
    update: {},
    create: {
      code: "FREEDELIVERY",
      description: "Free delivery on any order",
      active: true,
      discountPaise: 9900,
      minOrderPaise: 0
    }
  });

  // ─── Homepage Sections ───
  console.log("  → Homepage sections");
  const sections = [
    { key: "hero", title: "Trusted eye care before every optical decision.", sortOrder: 0 },
    { key: "trust-strip", title: "Trust indicators", sortOrder: 1 },
    { key: "about", title: "Medical credibility first, optical choice second.", sortOrder: 2 },
    { key: "services", title: "Complete eye care with practical optical support.", sortOrder: 3 },
    { key: "store-cta", title: "Shop eyewear inside the dedicated Vision Vistara frames store.", sortOrder: 4 },
    { key: "diagnostics", title: "Advanced testing support for confident treatment planning.", sortOrder: 5 },
    { key: "testimonials", title: "Calm guidance, clear explanations, and useful follow-up.", sortOrder: 6 },
    { key: "faq", title: "Common questions before a clinic visit.", sortOrder: 7 }
  ];
  for (const section of sections) {
    await prisma.homepageSection.upsert({
      where: { key: section.key },
      update: { title: section.title, sortOrder: section.sortOrder },
      create: section
    });
  }

  // ─── Banners ───
  console.log("  → Banners");
  await prisma.banner.upsert({
    where: { id: "banner-welcome" },
    update: {},
    create: {
      id: "banner-welcome",
      title: "New arrivals: Premium titanium collection",
      subtitle: "Lightweight frames from ₹1,499",
      href: "/frames/category/premium",
      active: true,
      sortOrder: 0
    }
  });
  await prisma.banner.upsert({
    where: { id: "banner-try-at-home" },
    update: {},
    create: {
      id: "banner-try-at-home",
      title: "Try at home — select up to 5 frames",
      subtitle: "Free home trial service starting at ₹199",
      href: "/frames/try-at-home",
      active: true,
      sortOrder: 1
    }
  });

  // ─── Admin User ───
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
    console.log("  → Admin user");
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: "Vision Vistara Admin",
        role: "OWNER",
        passwordHash: await bcrypt.hash(adminPassword, 12)
      }
    });
  }

  console.log("✅ Seed complete!");
}

function buildSearchText(product: { sku: string; name: string; brand: string; material: string; colour: string; shape: string; rimType: string; categories: string[] }) {
  return [product.sku, product.name, product.brand, product.material, product.colour, product.shape, product.rimType, product.categories.join(" ")].join(" ");
}

function getCategoryDescription(slug: string): string {
  const descriptions: Record<string, string> = {
    men: "Eyewear designed for men — from classic rectangle to modern geometric shapes.",
    women: "Stylish frames for women — cat eye, butterfly, round, and designer collections.",
    kids: "Durable, flexible, and fun eyewear sized for growing faces.",
    premium: "Handcrafted premium frames in titanium, Italian acetate, and luxury materials.",
    titanium: "Ultra-lightweight titanium frames for all-day comfort.",
    "blue-light": "Blue-light filter frames for screen protection.",
    rimless: "Virtually invisible rimless frames for a minimalist look.",
    "full-rim": "Full rim frames offering maximum durability and style variety.",
    "half-rim": "Semi-rimless frames balancing lightness with structure.",
    round: "Classic round frames with retro appeal.",
    square: "Angular square frames for a bold, modern look.",
    "cat-eye": "Feminine cat eye frames with dramatic upswept corners.",
    aviator: "Iconic aviator shape in prescription-ready designs.",
    rectangle: "Clean rectangle frames for a professional appearance.",
    transparent: "Transparent and crystal-clear frame options.",
    sunglasses: "Prescription-compatible sunglasses with UV protection."
  };
  return descriptions[slug] ?? `${slug.replace(/-/g, " ")} frames from Vision Vistara.`;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

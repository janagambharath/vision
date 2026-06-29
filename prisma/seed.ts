import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { lensPackages, migratedProducts } from "../lib/inventory";

async function main() {
  for (const product of migratedProducts) {
    for (const slug of product.categories) {
      await prisma.category.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          name: slug
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        }
      });
    }

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        brand: product.brand,
        status: product.status,
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
        searchText: [
          product.sku,
          product.name,
          product.brand,
          product.material,
          product.colour,
          product.shape,
          product.rimType,
          product.categories.join(" ")
        ].join(" ")
      },
      create: {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        status: product.status,
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
        searchText: [
          product.sku,
          product.name,
          product.brand,
          product.material,
          product.colour,
          product.shape,
          product.rimType,
          product.categories.join(" ")
        ].join(" ")
      }
    });

    const dbProduct = await prisma.product.findUniqueOrThrow({ where: { slug: product.slug } });

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

  for (const lens of lensPackages) {
    await prisma.lensOption.upsert({
      where: { code: lens.code },
      update: {
        name: lens.name,
        description: lens.description,
        pricePaise: lens.pricePaise,
        active: lens.active
      },
      create: {
        code: lens.code,
        name: lens.name,
        description: lens.description,
        pricePaise: lens.pricePaise,
        active: lens.active
      }
    });
  }

  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (adminEmail && adminPassword) {
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

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getProductSlugs, getCategories } from "@/lib/store-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clinicRoutes = ["", "/about", "/services", "/diagnostics", "/contact", "/appointments", "/terms", "/privacy", "/return-policy"];

  const [productSlugs, categories] = await Promise.all([
    getProductSlugs(),
    getCategories()
  ]);

  // Do not claim every URL changed whenever this dynamic sitemap is requested.
  // That creates noisy, false freshness signals for search engines. Static
  // editorial pages intentionally omit `lastModified`; catalog URLs use the
  // actual row update timestamp.
  const editorialEntries: MetadataRoute.Sitemap = clinicRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7
  }));
  const storeEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/frames`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/frames/try-at-home`, changeFrequency: "monthly", priority: 0.6 },
    ...categories.map((category) => ({
      url: `${SITE_URL}/frames/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...productSlugs.map((product) => ({
      url: `${SITE_URL}/frames/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7
    }))
  ];

  // Internal search is a query UI, not an indexable landing page. Omit it
  // from the sitemap so it cannot compete with canonical category/product URLs.
  return [...editorialEntries, ...storeEntries];
}

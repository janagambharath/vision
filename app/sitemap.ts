import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getProductSlugs, getCategories } from "@/lib/store-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const clinicRoutes = ["", "/about", "/services", "/diagnostics", "/contact", "/appointments"];

  const [productSlugs, categories] = await Promise.all([
    getProductSlugs(),
    getCategories()
  ]);

  const storeRoutes = [
    "/frames",
    "/frames/cart",
    "/frames/checkout",
    "/frames/try-at-home",
    "/frames/search",
    ...categories.map((category) => `/frames/category/${category.slug}`),
    ...productSlugs.map((p) => `/frames/${p.slug}`)
  ];

  return [...clinicRoutes, ...storeRoutes].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/frames") ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/frames" ? 0.9 : 0.7
  }));
}

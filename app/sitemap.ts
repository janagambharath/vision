import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { filterOptions, migratedProducts } from "@/lib/inventory";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const clinicRoutes = ["", "/about", "/services", "/diagnostics", "/contact", "/appointments"];
  const storeRoutes = [
    "/frames",
    "/frames/cart",
    "/frames/checkout",
    "/frames/try-at-home",
    "/frames/search",
    ...filterOptions.map((category) => `/frames/category/${category}`),
    ...migratedProducts
      .filter((product) => product.status === "ACTIVE")
      .map((product) => `/frames/${product.slug}`)
  ];

  return [...clinicRoutes, ...storeRoutes].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith("/frames") ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/frames" ? 0.9 : 0.7
  }));
}

"use server";

import { cookies } from "next/headers";

const RECENTLY_VIEWED_COOKIE = "vv_recently_viewed";

export async function getRecentlyViewed(): Promise<string[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RECENTLY_VIEWED_COOKIE)?.value;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addRecentlyViewed(slug: string) {
  const list = await getRecentlyViewed();
  const filtered = list.filter((s) => s !== slug);
  const updated = [slug, ...filtered].slice(0, 6); // Keep max 6

  const cookieStore = await cookies();
  cookieStore.set(RECENTLY_VIEWED_COOKIE, JSON.stringify(updated), {
    path: "/",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    secure: process.env.NODE_ENV === "production"
  });
}

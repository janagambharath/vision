"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const WISHLIST_COOKIE = "vv_wishlist";

export async function getWishlistSlugs(): Promise<string[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(WISHLIST_COOKIE)?.value;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addToWishlist(slug: string) {
  const list = await getWishlistSlugs();
  if (list.includes(slug)) return;
  list.push(slug);
  const updated = list.slice(-20); // max 20 items

  const cookieStore = await cookies();
  cookieStore.set(WISHLIST_COOKIE, JSON.stringify(updated), {
    path: "/",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    secure: process.env.NODE_ENV === "production"
  });

  revalidatePath("/frames/wishlist");
  revalidatePath(`/frames/${slug}`);
}

export async function removeFromWishlist(slug: string) {
  const list = await getWishlistSlugs();
  const updated = list.filter((s) => s !== slug);

  const cookieStore = await cookies();
  cookieStore.set(WISHLIST_COOKIE, JSON.stringify(updated), {
    path: "/",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production"
  });

  revalidatePath("/frames/wishlist");
  revalidatePath(`/frames/${slug}`);
}

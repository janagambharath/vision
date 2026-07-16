import Link from "next/link";
import { getWishlistSlugs, removeFromWishlist } from "@/lib/wishlist";
import { getStoreProducts } from "@/lib/store-data";
import { ProductCard } from "@/components/product-card";
import { ArrowLeft, Trash2, HeartCrack } from "lucide-react";
import { toPublicStoreProduct } from "@/lib/inventory";

export const metadata = {
  title: "My Wishlist | Vision Vistara",
  description: "Browse your saved favorite eyewear frames on Vision Vistara."
};

export default async function WishlistPage() {
  const slugs = await getWishlistSlugs();
  const allProducts = await getStoreProducts({ includeDrafts: false });
  const products = allProducts.filter((p) => slugs.includes(p.slug));

  async function handleRemove(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug") ?? "");
    if (slug) {
      await removeFromWishlist(slug);
    }
  }

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">Favorites</p>
          <h1 className="text-4xl font-extrabold text-slate-900">My Wishlist</h1>
          <p className="mt-2 text-slate-600">Your curated collection of premium optical frames.</p>
        </div>

        {products.length === 0 ? (
          <div className="vv-card p-16 text-center grid justify-items-center gap-4 bg-white border border-slate-100">
            <HeartCrack className="h-16 w-16 text-slate-300" />
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Your wishlist is empty</h2>
              <p className="text-slate-500 mt-1">Explore our store and tap the heart icon on any frame to save it here.</p>
            </div>
            <Link href="/frames" className="vv-button-retail mt-4 inline-block">
              Browse Frames
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.slug} className="relative group bg-white rounded-vv border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition">
                <ProductCard product={toPublicStoreProduct(product)} />
                
                <form action={handleRemove} className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition duration-200">
                  <input type="hidden" name="slug" value={product.slug} />
                  <button
                    type="submit"
                    className="h-8 w-8 rounded-full bg-white text-red-500 shadow border border-slate-100 grid place-items-center hover:bg-red-50 hover:text-red-700"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

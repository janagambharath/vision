"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Eye, Home, MessageCircle, ShoppingBag, Star, Heart } from "lucide-react";
import { addToCart } from "@/lib/cart-actions";
import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { PublicStoreProduct } from "@/lib/inventory";
import { useCompare } from "@/components/compare-context";
import { addToWishlist, removeFromWishlist } from "@/lib/wishlist";

export function ProductCard({ product }: { product: PublicStoreProduct }) {
  const sellable = product.sellable;
  const frontImage = product.images.find((image) => image.role === "front") ?? product.images[0];
  const angleImage = product.images.find((image) => image.role === "angle" || image.role === "gallery");
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I want details for ${product.brand} ${product.name} SKU ${product.sku}.`);
  const hasDiscount = product.compareAtPaise && product.pricePaise && product.compareAtPaise > product.pricePaise;
  const discountPct = hasDiscount ? Math.round(((product.compareAtPaise! - product.pricePaise!) / product.compareAtPaise!) * 100) : 0;
  // AI can use any uploaded catalog image. A transparent asset is helpful,
  // but it must never be a requirement for customers to start a try-on.
  const hasTryOnReference = product.images.some(
    (image) => image.role !== "ar" && image.url.startsWith("https://res.cloudinary.com/")
  ) || Boolean(product.arImageUrl?.startsWith("https://res.cloudinary.com/"));

  const { compareSlugs, addToCompare, removeFromCompare } = useCompare();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vv_wishlist_slugs");
    if (stored) {
      try {
        const list = JSON.parse(stored);
        setIsWishlisted(list.includes(product.slug));
      } catch {
        // Ignore
      }
    }
  }, [product.slug]);

  const toggleWishlist = async () => {
    const nextState = !isWishlisted;
    setIsWishlisted(nextState);

    const stored = localStorage.getItem("vv_wishlist_slugs");
    let list = stored ? JSON.parse(stored) : [];
    if (nextState) {
      if (!list.includes(product.slug)) list.push(product.slug);
      await addToWishlist(product.slug);
    } else {
      list = list.filter((s: string) => s !== product.slug);
      await removeFromWishlist(product.slug);
    }
    localStorage.setItem("vv_wishlist_slugs", JSON.stringify(list));
  };

  return (
    <article className="vv-card group relative min-w-0 overflow-hidden transition hover:shadow-strong">
      <Link href={`/frames/${product.slug}`} className="relative block bg-slate-50">
        <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/9]">
          {frontImage ? (
            <>
              <Image
                src={frontImage.url}
                alt={frontImage.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={`object-contain p-3 transition duration-500 sm:p-6 ${angleImage ? "group-hover:opacity-0" : ""}`}
              />
              {angleImage ? (
                <Image
                  src={angleImage.url}
                  alt={angleImage.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain p-3 opacity-0 transition duration-500 group-hover:opacity-100 sm:p-6"
                />
              ) : null}
            </>
          ) : null}
        </div>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-retail px-2.5 py-0.5 text-[10px] font-extrabold text-white">
              <Star className="h-2.5 w-2.5 fill-white" />
              Featured
            </span>
          ) : null}
          {hasDiscount ? (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
              {discountPct}% OFF
            </span>
          ) : null}
          {product.lowStock ? (
            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white animate-pulse">
              Low stock
            </span>
          ) : null}
          {product.tryAtHomeEligible ? (
            <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
              🏠 Home trial
            </span>
          ) : null}
          {hasTryOnReference ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
              <Camera className="h-2.5 w-2.5" />
              Try-on
            </span>
          ) : null}
        </div>
      </Link>

      {/* Wishlist Heart Button overlay */}
      <button
        onClick={toggleWishlist}
        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur shadow-sm border border-slate-100 flex items-center justify-center transition hover:bg-white z-10"
        title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={`h-4 w-4 transition-all ${isWishlisted ? "fill-red-500 text-red-500 scale-110" : "text-slate-400 hover:text-red-500"}`} />
      </button>

      <div className="grid min-w-0 gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 [&>p:last-child]:hidden">
            <p className="text-xs font-extrabold uppercase text-slate-500">{product.brand}</p>
            <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-lg font-extrabold leading-tight text-slate-950">
              <Link href={`/frames/${product.slug}`}>{product.name}</Link>
            </h3>
            <p className="mt-1 text-xs text-slate-400">SKU {product.sku} · {product.material}</p>
          </div>
          <div className="shrink-0 text-right">
            {sellable ? (
              <>
                <strong className="block text-lg text-retail">{formatMoney(product.pricePaise)}</strong>
                {hasDiscount ? (
                  <span className="text-xs text-slate-400 line-through">{formatMoney(product.compareAtPaise)}</span>
                ) : null}
              </>
            ) : (
              <span className="text-sm font-bold text-amber-700">{formatMoney(product.pricePaise)}</span>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {product.categories.slice(0, 3).map((category) => (
              <Link key={category} href={`/frames/category/${category}`} className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:border-retail hover:text-retail">
                {category.replace(/-/g, " ")}
              </Link>
            ))}
          </div>

          {/* Compare Checkbox */}
          <label className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compareSlugs.includes(product.slug)}
              onChange={(e) => {
                if (e.target.checked) {
                  addToCompare(product.slug);
                } else {
                  removeFromCompare(product.slug);
                }
              }}
              className="rounded border-slate-300 text-retail focus:ring-retail h-3.5 w-3.5"
            />
            Compare
          </label>
        </div>

        <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex gap-1">
            <Link href={`/frames/${product.slug}`} className="rounded-vv border border-slate-200 p-2 text-slate-500 transition hover:border-retail hover:text-retail" title="Quick view">
              <Eye className="h-4 w-4" />
            </Link>
            <Link href={`/frames/try-at-home?productIds=${product.slug}`} className="rounded-vv border border-slate-200 p-2 text-slate-500 transition hover:border-retail hover:text-retail" title="Try at home">
              <Home className="h-4 w-4" />
            </Link>
            <a href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noopener" className="rounded-vv border border-slate-200 p-2 text-slate-500 transition hover:border-emerald-500 hover:text-emerald-600" title="WhatsApp enquiry">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>

          <form action={addToCart} className="min-w-0">
            <input type="hidden" name="slug" value={product.slug} />
            <input type="hidden" name="quantity" value="1" />
            <button className="vv-button-retail w-full justify-center whitespace-nowrap text-sm" type="submit" disabled={!sellable}>
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

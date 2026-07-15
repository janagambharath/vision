"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, Home, MessageCircle, Heart, Ruler } from "lucide-react";
import { addToCart } from "@/lib/cart-actions";
import { addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import LensSelector from "@/components/lens-selector";
import SizeGuideModal from "@/components/size-guide-modal";

import type { LensOption } from "@prisma/client";

interface ProductCheckoutPanelProps {
  product: {
    slug: string;
    sku: string;
    name: string;
    brand: string;
    pricePaise: number | null;
    tryAtHomeEligible: boolean;
    inventoryStatus: string;
    measurements: string | null;
  };
  sellable: boolean;
  lensPackages: LensOption[];
}

export default function ProductCheckoutPanel({ product, sellable, lensPackages }: ProductCheckoutPanelProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    addRecentlyViewed(product.slug).catch(console.error);
  }, [product.slug]);

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

  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I want details for ${product.brand} ${product.name} SKU ${product.sku}.`);

  return (
    <div className="mt-6">
      {/* Measurements & Size Guide */}
      {product.measurements && (
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
          <span className="text-xs text-slate-500 font-bold">Size: {product.measurements}</span>
          <button
            type="button"
            onClick={() => setSizeGuideOpen(true)}
            className="text-xs font-bold text-retail hover:underline inline-flex items-center gap-1"
          >
            <Ruler className="h-3.5 w-3.5" />
            Size guide
          </button>
        </div>
      )}

      <form action={addToCart} className="grid gap-5 rounded-vv border border-slate-200 bg-slate-50 p-5">
        <input type="hidden" name="slug" value={product.slug} />

        <LensSelector packages={lensPackages} />

        <div className="grid gap-3 md:grid-cols-2 mt-2">
          <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
            Quantity
            <input
              className="store-input"
              type="number"
              name="quantity"
              min="1"
              max="5"
              defaultValue="1"
              disabled={!sellable}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
            Fulfillment method
            <select className="store-input" name="deliveryMethod" disabled={!sellable}>
              <option value="DELIVERY">Delivery</option>
              {product.tryAtHomeEligible && <option value="TRY_AT_HOME">Try at home</option>}
              <option value="STORE_PICKUP">Store pickup</option>
            </select>
          </label>
        </div>

        {/* Actions grid */}
        <div className="grid gap-3 mt-3 sm:grid-cols-[1fr_50px]">
          <div className="grid gap-2 grid-cols-2">
            <button className="vv-button-retail text-xs py-2.5 font-bold justify-center" type="submit" disabled={!sellable}>
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
            <Link className="vv-button-light text-xs py-2.5 font-bold justify-center" href={`/frames/try-at-home?productIds=${product.slug}`}>
              <Home className="h-4 w-4" />
              Try at home
            </Link>
          </div>

          {/* Quick Wishlist toggle */}
          <button
            type="button"
            onClick={toggleWishlist}
            className={`rounded-vv border flex items-center justify-center transition h-[42px] ${
              isWishlisted
                ? "border-red-200 bg-red-50 text-red-500"
                : "border-slate-200 hover:border-slate-300 bg-white text-slate-400"
            }`}
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-5 w-5 ${isWishlisted ? "fill-red-500 scale-105" : ""}`} />
          </button>
        </div>

        <a
          className="vv-button bg-emerald-500 hover:bg-emerald-600 text-ink text-xs font-bold py-2.5 justify-center mt-1 w-full"
          href={`https://wa.me/917842938316?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" />
          Enquire on WhatsApp
        </a>
      </form>

      {/* Size Guide Modal Overlay */}
      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Camera,
  Home,
  Trash2,
  ShoppingBag,
  Ruler,
  Palette,
  Box,
  Eye,
  ArrowRight,
} from "lucide-react";
import { removeCartItem } from "@/lib/cart-actions";
import { formatMoney } from "@/lib/money";

interface CartItemProduct {
  slug: string;
  sku: string;
  name: string;
  brand: string;
  pricePaise: number | null;
  material?: string | null;
  colour?: string | null;
  shape?: string | null;
  size?: string | null;
  measurements?: string | null;
  rimType?: string | null;
  description?: string;
  lensCompatibility?: string[];
  tryOnEligible?: boolean;
  tryAtHomeEligible?: boolean;
  categories?: Array<{ category: { slug: string; name: string } }>;
  images?: Array<{ url: string; alt: string; role: string; sortOrder: number }>;
}

interface CartItemDetailsProps {
  itemId: string;
  product: CartItemProduct;
  lensName: string | null;
  quantity: number;
}

export default function CartItemDetails({
  itemId,
  product,
  lensName,
  quantity,
}: CartItemDetailsProps) {
  const [open, setOpen] = useState(false);

  const images = product.images ?? [];
  const categories = product.categories ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-100 hover:border-teal-300"
      >
        <Eye className="h-3.5 w-3.5" />
        View Details
      </button>

      {/* Drawer Overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className="relative z-10 w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
            style={{ animation: "slideInRight 0.3s ease-out" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                Frame Details
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Images Gallery */}
            {images.length > 0 && (
              <div className="border-b border-slate-100">
                <div className="relative aspect-[16/9] bg-slate-50">
                  <Image
                    src={images[0].url}
                    alt={images[0].alt}
                    fill
                    className="object-contain p-6"
                    sizes="(max-width: 768px) 100vw, 512px"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3">
                    {images.slice(1, 5).map((img, i) => (
                      <div
                        key={i}
                        className="relative h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          className="object-contain p-1"
                          sizes="64px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product Info */}
            <div className="px-6 py-5 grid gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {product.brand}
                </p>
                <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {product.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400 font-bold">
                  SKU {product.sku}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <strong className="text-2xl font-extrabold text-teal-700">
                  {formatMoney(product.pricePaise)}
                </strong>
                <span className="text-sm text-slate-500">
                  × {quantity} = {formatMoney((product.pricePaise ?? 0) * quantity)}
                </span>
              </div>

              {/* Category chips */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <span
                      key={c.category.slug}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600"
                    >
                      {c.category.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Lens info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
                <span className="font-bold text-slate-600">Lens package: </span>
                <span className="font-extrabold text-slate-800">
                  {lensName ?? "Frame with standard power"}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                {product.material && (
                  <SpecItem icon={<Box className="h-4 w-4" />} label="Material" value={product.material} />
                )}
                {product.colour && (
                  <SpecItem icon={<Palette className="h-4 w-4" />} label="Colour" value={product.colour} />
                )}
                {product.shape && (
                  <SpecItem icon={<Eye className="h-4 w-4" />} label="Shape" value={product.shape} />
                )}
                {product.size && (
                  <SpecItem icon={<Ruler className="h-4 w-4" />} label="Size" value={product.size} />
                )}
                {product.rimType && (
                  <SpecItem icon={<Box className="h-4 w-4" />} label="Rim type" value={product.rimType} />
                )}
                {product.measurements && (
                  <SpecItem icon={<Ruler className="h-4 w-4" />} label="Measurements" value={product.measurements} />
                )}
              </div>

              {/* Lens compatibility */}
              {product.lensCompatibility && product.lensCompatibility.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                    Lens Compatibility
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.lensCompatibility.map((lens) => (
                      <span
                        key={lens}
                        className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700"
                      >
                        {lens}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid gap-2 pt-2 border-t border-slate-100">
                {product.tryOnEligible && (
                  <Link
                    href={`/frames/try-on?slug=${product.slug}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    <Camera className="h-4 w-4 text-teal-600" />
                    Virtual Try-On
                  </Link>
                )}
                {product.tryAtHomeEligible && (
                  <Link
                    href={`/frames/try-at-home?productIds=${product.slug}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    <Home className="h-4 w-4 text-teal-600" />
                    Try at Home
                  </Link>
                )}
                <form action={removeCartItem}>
                  <input type="hidden" name="id" value={itemId} />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from Cart
                  </button>
                </form>
                <Link
                  href="/frames/checkout"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg transition hover:shadow-xl"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Buy Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

function SpecItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white p-3">
      <span className="text-teal-600 shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
        <p className="text-xs font-extrabold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

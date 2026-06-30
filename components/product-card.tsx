import Image from "next/image";
import Link from "next/link";
import { Eye, Home, MessageCircle, ShoppingBag, Star } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { productIsSellable, type StoreProduct } from "@/lib/inventory";

export function ProductCard({ product }: { product: StoreProduct }) {
  const sellable = productIsSellable(product);
  const frontImage = product.images.find((image) => image.role === "front") ?? product.images[0];
  const angleImage = product.images.find((image) => image.role === "angle" || image.role === "gallery");
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I want details for ${product.brand} ${product.name} SKU ${product.sku}.`);
  const hasDiscount = product.compareAtPaise && product.pricePaise && product.compareAtPaise > product.pricePaise;
  const discountPct = hasDiscount ? Math.round(((product.compareAtPaise! - product.pricePaise!) / product.compareAtPaise!) * 100) : 0;

  return (
    <article className="vv-card group overflow-hidden transition hover:shadow-strong">
      <Link href={`/frames/${product.slug}`} className="relative block bg-slate-50">
        <div className="relative aspect-[16/9] overflow-hidden">
          {frontImage ? (
            <>
              <Image
                src={frontImage.url}
                alt={frontImage.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className={`object-contain p-6 transition duration-500 ${angleImage ? "group-hover:opacity-0" : ""}`}
              />
              {angleImage ? (
                <Image
                  src={angleImage.url}
                  alt={angleImage.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain p-6 opacity-0 transition duration-500 group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : null}
        </div>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-retail px-3 py-1 text-xs font-extrabold text-white">
              <Star className="h-3 w-3" />
              Featured
            </span>
          ) : null}
          {hasDiscount ? (
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-extrabold text-white">
              {discountPct}% OFF
            </span>
          ) : null}
          {product.inventoryStatus === "LOW_STOCK" ? (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white">
              Low stock
            </span>
          ) : null}
        </div>
      </Link>

      <div className="grid gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase text-slate-500">{product.brand}</p>
            <h3 className="mt-1 truncate text-lg font-extrabold leading-tight text-slate-950">
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

        <div className="flex flex-wrap gap-1">
          {product.categories.slice(0, 4).map((category) => (
            <Link key={category} href={`/frames/category/${category}`} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-500 hover:border-retail hover:text-retail">
              {category.replace(/-/g, " ")}
            </Link>
          ))}
        </div>

        <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
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

          <form action={addToCart}>
            <input type="hidden" name="slug" value={product.slug} />
            <input type="hidden" name="quantity" value="1" />
            <button className="vv-button-retail text-sm" type="submit" disabled={!sellable}>
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

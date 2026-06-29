import Image from "next/image";
import Link from "next/link";
import { Bookmark, Eye, GitCompare, Home, MessageCircle, ShoppingBag } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { productIsSellable, type StoreProduct } from "@/lib/inventory";

export function ProductCard({ product }: { product: StoreProduct }) {
  const sellable = productIsSellable(product);
  const frontImage = product.images.find((image) => image.role === "front") ?? product.images[0];
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I want details for ${product.brand} ${product.name} SKU ${product.sku}.`);

  return (
    <article className="vv-card overflow-hidden">
      <Link href={`/frames/${product.slug}`} className="block bg-slate-50">
        <div className="relative aspect-[16/9]">
          {frontImage ? (
            <Image src={frontImage.url} alt={frontImage.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-contain p-6" />
          ) : null}
        </div>
      </Link>
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-slate-500">{product.brand}</p>
            <h3 className="mt-1 text-lg font-extrabold leading-tight text-slate-950">
              <Link href={`/frames/${product.slug}`}>{product.name}</Link>
            </h3>
            <p className="mt-1 text-sm text-slate-500">SKU {product.sku}</p>
          </div>
          <div className="text-right">
            <strong className={sellable ? "block text-lg text-retail" : "block text-sm text-amber-700"}>{formatMoney(product.pricePaise)}</strong>
            <span className="text-xs font-bold text-slate-500">{product.inventoryStatus.replace(/_/g, " ")}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {product.categories.slice(0, 5).map((category) => (
            <Link key={category} href={`/frames/category/${category}`} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
              {category.replace(/-/g, " ")}
            </Link>
          ))}
        </div>

        <p className="line-clamp-3 text-sm text-slate-600">{product.description}</p>

        {!sellable ? (
          <div className="rounded-vv border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong className="block">Draft inventory</strong>
            <span>Admin must add verified pricing and missing terms before this frame can be sold online.</span>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Link className="vv-button-light" href={`/frames/${product.slug}`}>
            <Eye className="h-4 w-4" />
            Quick view
          </Link>
          <form action={addToCart}>
            <input type="hidden" name="slug" value={product.slug} />
            <input type="hidden" name="quantity" value="1" />
            <button className="vv-button-retail w-full" type="submit" disabled={!sellable}>
              <ShoppingBag className="h-4 w-4" />
              Add to cart
            </button>
          </form>
          <Link className="vv-button-light" href={`/frames/try-at-home?productIds=${product.slug}`}>
            <Home className="h-4 w-4" />
            Try at home
          </Link>
          <a className="vv-button-light" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noopener">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <form action="/api/wishlist" method="post">
            <input type="hidden" name="slug" value={product.slug} />
            <button className="vv-button-light w-full" type="submit">
              <Bookmark className="h-4 w-4" />
              Wishlist
            </button>
          </form>
          <Link className="vv-button-light" href={`/frames?compare=${product.slug}`}>
            <GitCompare className="h-4 w-4" />
            Compare
          </Link>
        </div>
      </div>
    </article>
  );
}

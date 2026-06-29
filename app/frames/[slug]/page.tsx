import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Home, MessageCircle, Ruler, ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { addToCart } from "@/lib/cart";
import { CLINIC_WHATSAPP_NUMBER, SITE_URL } from "@/lib/constants";
import { lensPackages, migratedProducts, productIsSellable } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { getRelatedProducts, getStoreProduct } from "@/lib/store-data";

export async function generateStaticParams() {
  return migratedProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);

  if (!product) {
    return {
      title: "Frame not found"
    };
  }

  return {
    title: `${product.brand} ${product.name}`,
    description: product.description,
    alternates: { canonical: `${SITE_URL}/frames/${product.slug}` },
    openGraph: {
      title: `${product.brand} ${product.name}`,
      description: product.description,
      url: `${SITE_URL}/frames/${product.slug}`,
      images: product.images[0] ? [product.images[0].url] : undefined,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.brand} ${product.name}`,
      description: product.description
    }
  };
}

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ blocked?: string }>;
}) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  const query = (await searchParams) ?? {};

  if (!product) {
    return (
      <main className="vv-section">
        <div className="vv-container">
          <h1 className="text-3xl font-extrabold">Frame not found</h1>
          <Link className="vv-button-retail mt-5" href="/frames">Back to frames</Link>
        </div>
      </main>
    );
  }

  const sellable = productIsSellable(product);
  const related = await getRelatedProducts(product);
  const whatsappText = encodeURIComponent(`Hello Vision Vistara, I want details for ${product.brand} ${product.name} SKU ${product.sku}.`);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.brand} ${product.name}`,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((image) => `${SITE_URL}${image.url}`),
    description: product.description,
    category: product.primaryCategory,
    offers: sellable
      ? {
          "@type": "Offer",
          priceCurrency: "INR",
          price: (product.pricePaise ?? 0) / 100,
          availability: product.inventoryStatus === "OUT_OF_STOCK" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          url: `${SITE_URL}/frames/${product.slug}`
        }
      : undefined
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <section className="vv-section bg-white">
        <div className="vv-container grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <ProductGallery product={product} />

          <div>
            <nav className="mb-4 text-sm font-bold text-slate-500" aria-label="Breadcrumb">
              <Link href="/frames">Frames</Link> / <Link href={`/frames/category/${product.categories[0]}`}>{product.primaryCategory}</Link> / {product.name}
            </nav>
            <p className="vv-kicker text-retail">{product.brand}</p>
            <h1 className="text-4xl font-extrabold leading-tight">{product.name}</h1>
            <p className="mt-2 text-slate-500">SKU {product.sku}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <strong className={sellable ? "text-3xl text-retail" : "rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-800"}>{formatMoney(product.pricePaise)}</strong>
              <span className="rounded-full border border-slate-200 px-3 py-2 text-xs font-extrabold uppercase text-slate-600">{product.inventoryStatus.replace(/_/g, " ")}</span>
            </div>

            {query.blocked ? (
              <div className="mt-5 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Checkout is blocked for this frame until pricing, lens pricing, or stock is verified.
              </div>
            ) : null}

            {!sellable ? (
              <div className="mt-5 rounded-vv border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <strong className="block">Draft product: not published for sale</strong>
                    <p className="mt-1 text-sm">This page preserves migrated real inventory data, but checkout is disabled until admin completes every blocker.</p>
                    <ul className="mt-3 grid gap-1 text-sm">
                      {product.blockers.map((blocker) => (
                        <li key={blocker}>- {blocker}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            <p className="mt-6 text-slate-700">{product.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {product.highlights.map((highlight) => (
                <div key={highlight} className="flex items-center gap-2 rounded-vv border border-slate-200 p-3 text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4 text-retail" />
                  {highlight}
                </div>
              ))}
            </div>

            <form action={addToCart} className="mt-8 grid gap-4 rounded-vv border border-slate-200 bg-slate-50 p-5">
              <input type="hidden" name="slug" value={product.slug} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                  Lens package
                  <select className="store-input" name="lensCode" disabled={!sellable}>
                    <option value="">Frame only</option>
                    {lensPackages.map((lens) => (
                      <option key={lens.code} value={lens.code} disabled={!lens.active}>
                        {lens.name} {lens.pricePaise === null ? "(admin pricing required)" : `- ${formatMoney(lens.pricePaise)}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                  Fulfilment
                  <select className="store-input" name="deliveryMethod" disabled={!sellable}>
                    <option value="DELIVERY">Delivery</option>
                    <option value="TRY_AT_HOME">Try at home</option>
                    <option value="STORE_PICKUP">Store pickup</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Quantity
                <input className="store-input" type="number" name="quantity" min="1" max="5" defaultValue="1" disabled={!sellable} />
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <button className="vv-button-retail" type="submit" disabled={!sellable}>
                  <ShoppingBag className="h-4 w-4" />
                  Add to cart
                </button>
                <Link className="vv-button-light" href={`/frames/try-at-home?productIds=${product.slug}`}>
                  <Home className="h-4 w-4" />
                  Try at home
                </Link>
                <a className="vv-button-light" href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noopener">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="vv-section bg-paper">
        <div className="vv-container grid gap-6 lg:grid-cols-3">
          <Spec title="Measurements" icon={<Ruler className="h-5 w-5" />} lines={[product.measurements, product.size, product.rimType]} />
          <Spec title="Lens support" icon={<Sparkles className="h-5 w-5" />} lines={product.lensCompatibility} />
          <Spec title="Delivery and policy" icon={<Truck className="h-5 w-5" />} lines={[product.deliveryEstimate, product.returnPolicy, product.warranty]} />
        </div>
      </section>

      <section className="vv-section bg-white">
        <div className="vv-container grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="vv-kicker text-retail">Product specifications</p>
            <h2 className="text-3xl font-extrabold">Fit, material, care, and face-shape guidance.</h2>
          </div>
          <dl className="vv-card grid gap-4 p-6 md:grid-cols-2">
            {[
              ["Brand", product.brand],
              ["Material", product.material],
              ["Colour", product.colour],
              ["Shape", product.shape],
              ["Rim", product.rimType],
              ["Recommended face shapes", product.faceShapes.join(", ")],
              ["Care", product.careInstructions],
              ["Reviews", product.reviewSnippet ?? "Reviews open after product publication."]
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-extrabold uppercase text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {related.length ? (
        <section className="vv-section bg-paper">
          <div className="vv-container">
            <div className="mb-8 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-retail" />
              <h2 className="text-3xl font-extrabold">Related frames</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Spec({ title, icon, lines }: { title: string; icon: React.ReactNode; lines: string[] }) {
  return (
    <article className="vv-card p-6">
      <div className="flex items-center gap-2 text-retail">
        {icon}
        <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
      </div>
      <ul className="mt-4 grid gap-2 text-sm text-slate-600">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}

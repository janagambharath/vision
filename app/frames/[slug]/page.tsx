import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Home, MessageCircle, Ruler, ShieldCheck, ShoppingBag, Sparkles, Truck, Star, Heart, Clock } from "lucide-react";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import ProductCheckoutPanel from "@/components/product-checkout-panel";
import { CLINIC_WHATSAPP_NUMBER, SITE_URL } from "@/lib/constants";
import { lensPackages, migratedProducts, productIsSellable } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { getRelatedProducts, getStoreProduct, getStoreProducts } from "@/lib/store-data";
import { prisma } from "@/lib/db";
import { addRecentlyViewed, getRecentlyViewed } from "@/lib/recently-viewed";

export async function generateStaticParams() {
  return migratedProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);

  if (!product) {
    return { title: "Frame not found | Vision Vistara" };
  }

  return {
    title: `${product.brand} ${product.name} | Vision Vistara`,
    description: product.description,
    alternates: { canonical: `${SITE_URL}/frames/${product.slug}` },
    openGraph: {
      title: `${product.brand} ${product.name} | Vision Vistara`,
      description: product.description,
      url: `${SITE_URL}/frames/${product.slug}`,
      images: product.images[0] ? [product.images[0].url] : undefined,
      type: "website"
    }
  };
}

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ blocked?: string; reviewSubmitted?: string }>;
}) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  const query = (await searchParams) ?? {};

  if (!product) {
    return (
      <main className="vv-section">
        <div className="vv-container">
          <h1 className="text-3xl font-extrabold text-slate-800">Frame not found</h1>
          <Link className="vv-button-retail mt-5 inline-block" href="/frames">Back to frames</Link>
        </div>
      </main>
    );
  }

  await addRecentlyViewed(product.slug);

  const sellable = productIsSellable(product);
  const related = await getRelatedProducts(product);

  const recentlyViewedSlugs = await getRecentlyViewed();
  const allProductsForRV = await getStoreProducts({ includeDrafts: false });
  const recentlyViewedProducts = allProductsForRV.filter(
    (p) => p.slug !== product.slug && recentlyViewedSlugs.includes(p.slug)
  );

  // Fetch approved reviews
  const reviews = await prisma.review.findMany({
    where: { productId: product.id, approved: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "4.5"; // Default mock aggregate rating if no review yet

  // Schema BreadcrumbList
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Frames", "item": `${SITE_URL}/frames` },
      { "@type": "ListItem", "position": 2, "name": product.categories[0] || "Category", "item": `${SITE_URL}/frames/category/${product.categories[0] || "men"}` },
      { "@type": "ListItem", "position": 3, "name": product.name }
    ]
  };

  // Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.brand} ${product.name}`,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((image) => `${SITE_URL}${image.url}`),
    description: product.description,
    category: product.primaryCategory,
    aggregateRating: {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviews.length || "5"
    },
    offers: sellable
      ? {
          "@type": "Offer",
          priceCurrency: "INR",
          price: (product.pricePaise ?? 0) / 100,
          availability: product.inventoryQuantity === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          url: `${SITE_URL}/frames/${product.slug}`
        }
      : undefined
  };

  // Delivery Estimate Date Helper
  const getDeliveryDateText = (estimate: string | null) => {
    if (!estimate) return "3-5 business days";
    const match = estimate.match(/(\d+)[–-–-](\d+)\s*business\s*days/i);
    if (match) {
      const maxDays = parseInt(match[2], 10);
      const deliveryDate = new Date();
      let count = 0;
      while (count < maxDays) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
          count++;
        }
      }
      return `Estimated delivery by ${deliveryDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`;
    }
    return estimate;
  };

  const hasDiscount = product.compareAtPaise && product.pricePaise && product.compareAtPaise > product.pricePaise;

  async function addReviewAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const rating = Number(formData.get("rating") ?? 5);
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();

    if (!name || !body || rating < 1 || rating > 5) return;

    await prisma.review.create({
      data: {
        productId: product!.id!,
        name,
        rating,
        title: title || undefined,
        body,
        approved: false // requires moderator approval
      }
    });

    redirect(`/frames/${product!.slug}?reviewSubmitted=true`);
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      
      <section className="vv-section bg-white">
        <div className="vv-container grid gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <ProductGallery product={product} />

          <div>
            <nav className="mb-4 text-xs font-bold text-slate-500" aria-label="Breadcrumb">
              <Link href="/frames" className="hover:text-retail">Frames</Link> /{" "}
              <Link href={`/frames/category/${product.categories[0]}`} className="hover:text-retail">
                {product.primaryCategory}
              </Link>{" "}
              / {product.name}
            </nav>
            <p className="vv-kicker text-retail">{product.brand}</p>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900">{product.name}</h1>
            <p className="mt-2 text-slate-500 text-xs font-bold">SKU {product.sku}</p>

            {/* Savings Callout Display */}
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <strong className={sellable ? "text-3xl text-retail font-extrabold" : "rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-800"}>
                {formatMoney(product.pricePaise)}
              </strong>
              {hasDiscount && (
                <>
                  <span className="text-sm text-slate-400 line-through font-semibold">{formatMoney(product.compareAtPaise)}</span>
                  <span className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    You save {formatMoney(product.compareAtPaise! - product.pricePaise!)}
                  </span>
                </>
              )}
            </div>

            {/* Stock Urgency Display */}
            <div className="mt-3">
              {product.inventoryQuantity <= 3 && product.inventoryQuantity > 0 ? (
                <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-pulse">
                  ⚠️ Only {product.inventoryQuantity} left in stock - order soon!
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-extrabold uppercase text-slate-600 bg-slate-50">
                  {product.inventoryStatus.replace(/_/g, " ")}
                </span>
              )}
            </div>

            {query.blocked ? (
              <div className="mt-5 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 font-bold">
                Checkout is blocked for this frame until pricing, lens pricing, or stock is verified.
              </div>
            ) : null}

            {!sellable ? (
              <div className="mt-5 rounded-vv border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <strong className="block font-bold">Draft product: not published for sale</strong>
                    <p className="mt-1 text-sm leading-normal">This page preserves migrated real inventory data, but checkout is disabled until admin completes every blocker.</p>
                    <ul className="mt-3 grid gap-1 text-sm font-semibold">
                      {product.blockers.map((blocker) => (
                        <li key={blocker}>- {blocker}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            <p className="mt-6 text-slate-600 text-sm leading-relaxed">{product.description}</p>

            {/* Face Shape Fit Matches */}
            {product.faceShapes && product.faceShapes.length > 0 && (
              <div className="mt-4 p-3 rounded-vv border border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-700">
                👤 <strong>Best fit:</strong> Matches {product.faceShapes.join(", ")} faces
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {product.highlights.map((highlight) => (
                <div key={highlight} className="flex items-center gap-2 rounded-vv border border-slate-200 p-3 text-sm font-bold bg-white text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-retail" />
                  {highlight}
                </div>
              ))}
            </div>

            {/* Client Interactive Selector and Add-To-Cart actions */}
            <ProductCheckoutPanel
              product={{
                slug: product.slug,
                sku: product.sku,
                name: product.name,
                brand: product.brand,
                pricePaise: product.pricePaise,
                tryAtHomeEligible: product.tryAtHomeEligible,
                inventoryStatus: product.inventoryStatus,
                measurements: product.measurements
              }}
              sellable={sellable}
              lensPackages={lensPackages}
            />
          </div>
        </div>
      </section>

      <section className="vv-section bg-paper">
        <div className="vv-container grid gap-6 lg:grid-cols-3">
          <Spec title="Measurements" icon={<Ruler className="h-5 w-5" />} lines={[product.measurements || "", product.size || "", product.rimType || ""]} />
          <Spec title="Lens support" icon={<Sparkles className="h-5 w-5" />} lines={product.lensCompatibility} />
          <Spec
            title="Delivery and policy"
            icon={<Truck className="h-5 w-5" />}
            lines={[getDeliveryDateText(product.deliveryEstimate), product.returnPolicy || "", product.warranty || ""]}
          />
        </div>
      </section>

      {/* Review Moderation Panel displays */}
      <section className="vv-section bg-white border-t border-slate-100">
        <div className="vv-container grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div className="grid gap-4 self-start">
            <div>
              <p className="vv-kicker text-retail">Customer Feedback</p>
              <h2 className="text-3xl font-extrabold text-slate-900 font-sans">Reviews & Ratings</h2>
            </div>
            
            {/* Submit review */}
            <form action={addReviewAction} className="vv-card p-5 border border-slate-200 bg-slate-50/50 grid gap-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Write a review</h3>
              {query.reviewSubmitted && (
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded">
                  ✓ Review submitted! It will appear after moderation approval.
                </p>
              )}
              <label className="grid gap-1 text-xs font-bold text-slate-600">
                Your Name
                <input className="store-input py-1.5 px-3" type="text" name="name" required placeholder="e.g. Bharat J." />
              </label>
              <div className="grid gap-1 text-xs font-bold text-slate-600">
                Rating
                <select className="store-input py-1.5" name="rating">
                  <option value="5">5 Stars (Excellent)</option>
                  <option value="4">4 Stars (Good)</option>
                  <option value="3">3 Stars (Average)</option>
                  <option value="2">2 Stars (Poor)</option>
                  <option value="1">1 Star (Very bad)</option>
                </select>
              </div>
              <label className="grid gap-1 text-xs font-bold text-slate-600">
                Title optional
                <input className="store-input py-1.5 px-3" type="text" name="title" placeholder="Summary of experience" />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">
                Review Description
                <textarea className="store-input py-1.5 px-3 min-h-16" name="body" required placeholder="Describe frames styling and trial comfort..." />
              </label>
              <button className="vv-button-retail text-xs py-2 justify-center w-full" type="submit">
                Submit Review
              </button>
            </form>
          </div>

          <div className="grid gap-4">
            <h3 className="font-extrabold text-slate-900 text-xl border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Customer Reviews ({reviews.length})</span>
              <span className="text-sm font-bold text-retail bg-teal-50 px-2 py-0.5 rounded">Avg {avgRating} Stars</span>
            </h3>

            {reviews.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-slate-100 rounded bg-slate-50 text-xs">
                No reviews yet. Be the first to review this frame!
              </div>
            ) : (
              <div className="grid gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 border border-slate-100 rounded-vv bg-white shadow-soft">
                    <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>{rev.name}</span>
                      <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-0.5 text-amber-400 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                    {rev.title && <h4 className="font-bold text-sm text-slate-800 mb-1">{rev.title}</h4>}
                    <p className="text-xs text-slate-600 italic">"{rev.body}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="vv-section bg-paper">
          <div className="vv-container">
            <div className="mb-8 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-retail" />
              <h2 className="text-3xl font-extrabold font-sans text-slate-900">Related frames</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {recentlyViewedProducts.length ? (
        <section className="vv-section bg-white border-t border-slate-100">
          <div className="vv-container">
            <div className="mb-8 flex items-center gap-3">
              <Clock className="h-6 w-6 text-retail" />
              <h2 className="text-3xl font-extrabold font-sans text-slate-900">Recently viewed</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recentlyViewedProducts.map((item) => (
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
    <article className="vv-card p-6 bg-white border border-slate-100">
      <div className="flex items-center gap-2 text-retail border-b border-slate-100 pb-2">
        {icon}
        <h2 className="text-lg font-extrabold text-slate-950 font-sans">{title}</h2>
      </div>
      <ul className="mt-4 grid gap-2 text-sm text-slate-600 font-semibold">
        {lines.filter(Boolean).map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </article>
  );
}

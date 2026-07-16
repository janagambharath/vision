import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect, redirect } from "next/navigation";
import { headers } from "next/headers";
import { AlertTriangle, Camera, CheckCircle2, Ruler, ShieldCheck, Sparkles, Truck, Star, Clock } from "lucide-react";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/fade-in";
import ProductCheckoutPanel from "@/components/product-checkout-panel";
import { SITE_URL } from "@/lib/constants";
import { productIsSellable } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { getRelatedProducts, getStoreProduct, getProductsBySlugs, getLensOptions } from "@/lib/store-data";
import { prisma } from "@/lib/db";
import type { Review } from "@prisma/client";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { serializeJsonLd } from "@/lib/json-ld";
import { getCustomerUser } from "@/lib/customer-auth";
import { toPublicStoreProduct } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);

  if (!product) {
    return { title: "Frame not found | Vision Vistara" };
  }

  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription || product.description.slice(0, 160),
    robots: product.status === "ACTIVE" ? { index: true, follow: true } : { index: false, follow: false },
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
  searchParams?: Promise<{ blocked?: string; reviewSubmitted?: string; error?: string }>;
}) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  const query = (await searchParams) ?? {};

  // Handle slug redirects (301)
  if (product && '__redirect' in (product as Record<string, unknown>)) {
    const newSlug = (product as unknown as { __redirect: string }).__redirect;
    permanentRedirect(`/frames/${newSlug}`);
  }

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

  const sellable = productIsSellable(product);
  // AI uses the uploaded catalog photo automatically. Transparent assets are
  // preferred by the renderer, but are never required for a customer to try on a frame.
  const hasTryOnReference = (
    product.images.some((image) => image.role !== "ar" && image.url.startsWith("https://res.cloudinary.com/")) ||
    Boolean(product.arImageUrl?.startsWith("https://res.cloudinary.com/"))
  );
  const related = await getRelatedProducts(product);
  const lensPackages = await getLensOptions();

  const recentlyViewedSlugs = await getRecentlyViewed();
  const recentlyViewedProducts = await getProductsBySlugs(
    recentlyViewedSlugs.filter(s => s !== product.slug)
  );

  // Fetch approved reviews safely
  let reviews: Review[] = [];
  try {
    if (product.id) {
      reviews = await prisma.review.findMany({
        // Legacy guest reviews remain in the audit trail but are never shown
        // publicly: storefront ratings are reserved for verified buyers.
        where: { productId: product.id, approved: true, verified: true },
        orderBy: { createdAt: "desc" },
        take: 10
      });
    }
  } catch (err) {
    console.warn("⚠️ Database connection error while fetching reviews:", err);
  }

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r: Review) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const reviewCustomer = await getCustomerUser().catch(() => null);
  const canSubmitVerifiedReview = reviewCustomer ? await prisma.orderItem.findFirst({
    where: {
      productId: product.id,
      order: {
        status: "DELIVERED",
        OR: [
          { userId: reviewCustomer.id },
          ...(reviewCustomer.phone ? [{ phone: reviewCustomer.phone }] : [])
        ]
      }
    },
    select: { id: true }
  }).then(Boolean).catch(() => false) : false;

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
    image: product.images.map((image) => image.url.startsWith("http") ? image.url : `${SITE_URL}${image.url}`),
    description: product.description,
    category: product.primaryCategory,
    ...(avgRating && reviews.length > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        "ratingValue": avgRating,
        "reviewCount": reviews.length
      }
    } : {}),
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
    
    // Anti-spam honeypot
    if (formData.get("website")) return;
    
    // Rate limit: max 3 reviews per hour per IP
    const headersList = await headers();
    const ip = getClientIp(headersList);
    const { allowed } = await rateLimit(`review:${ip}`, 3, 3600);
    
    if (!allowed) {
      redirect(`/frames/${product!.slug}?error=rate-limit`);
    }

    const reviewer = await getCustomerUser();
    if (!reviewer) redirect(`/frames/${product!.slug}?error=sign-in-to-review`);
    const deliveredPurchase = await prisma.orderItem.findFirst({
      where: {
        productId: product!.id!,
        order: {
          status: "DELIVERED",
          OR: [
            { userId: reviewer.id },
            ...(reviewer.phone ? [{ phone: reviewer.phone }] : [])
          ]
        }
      },
      select: { id: true }
    });
    if (!deliveredPurchase) redirect(`/frames/${product!.slug}?error=verified-purchase-required`);

    const rating = Number(formData.get("rating") ?? 5);
    const title = String(formData.get("title") ?? "").trim().slice(0, 120);
    const body = String(formData.get("body") ?? "").trim();

    if (!body || body.length > 1_500 || !Number.isInteger(rating) || rating < 1 || rating > 5) return;

    await prisma.review.upsert({
      where: { userId_productId: { userId: reviewer.id, productId: product!.id! } },
      update: {
        name: reviewer.name?.trim() || "Verified customer",
        rating,
        title: title || null,
        body,
        verified: true,
        approved: false
      },
      create: {
        productId: product!.id!,
        userId: reviewer.id,
        name: reviewer.name?.trim() || "Verified customer",
        rating,
        title: title || undefined,
        body,
        verified: true,
        approved: false // requires moderator approval
      }
    });

    redirect(`/frames/${product!.slug}?reviewSubmitted=true`);
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }} />
      
      <section className="bg-white/40 py-8 sm:py-20 md:py-32">
        <FadeIn className="vv-container grid gap-6 sm:gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <ProductGallery images={product.images} />

          <div>
            <nav className="mb-4 text-xs font-bold leading-relaxed text-slate-500" aria-label="Breadcrumb">
              <Link href="/frames" className="hover:text-retail">Frames</Link> /{" "}
              <Link href={`/frames/category/${product.categories[0]}`} className="hover:text-retail">
                {product.primaryCategory}
              </Link>{" "}
              / {product.name}
            </nav>
            <p className="vv-kicker text-retail">{product.brand}</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">{product.name}</h1>
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
                  Low stock — order soon!
                </span>
              ) : (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-extrabold uppercase text-slate-600 bg-slate-50">
                  {sellable ? "Available" : "Unavailable"}
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
                    <strong className="block font-bold">This frame is currently unavailable</strong>
                    <p className="mt-1 text-sm leading-normal">Please choose another frame or contact us for availability.</p>
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

            {/* Virtual Try-On CTA */}
            {hasTryOnReference ? (
              <Link
                href={`/frames/try-on?slug=${product.slug}`}
                className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 p-4 transition-all hover:border-teal-400 hover:bg-teal-50 group"
              >
                <Camera className="h-8 w-8 text-teal-600 shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <strong className="text-sm font-extrabold text-teal-800">Try this frame on your face</strong>
                  <p className="text-xs text-teal-600 mt-0.5">Take a selfie and generate a realistic AI preview using this product's own frame image.</p>
                </div>
              </Link>
            ) : (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Camera className="h-8 w-8 text-slate-400 shrink-0" />
                <div>
                  <strong className="text-sm font-extrabold text-slate-700">Add a product photo to enable try-on</strong>
                  <p className="text-xs text-slate-500 mt-0.5">AI uses the uploaded catalog image automatically. A transparent asset is optional.</p>
                </div>
              </div>
            )}

            {/* Client Interactive Selector and Add-To-Cart actions */}
            <ProductCheckoutPanel
              product={{
                slug: product.slug,
                sku: product.sku,
                name: product.name,
                brand: product.brand,
                tryAtHomeEligible: product.tryAtHomeEligible,
                measurements: product.measurements
              }}
              sellable={sellable}
              lensPackages={lensPackages}
            />

            {/* Premium Accordions for Product Data */}
            <div className="mt-8 grid gap-0.5 border-t border-slate-100 pt-4">
              {product.careInstructions && (
                <details className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between py-4 text-sm font-extrabold text-slate-800 hover:text-retail transition-colors">
                    Care Instructions
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="16" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-sm text-slate-600 font-medium leading-relaxed animate-in fade-in slide-in-from-top-2">{product.careInstructions}</p>
                </details>
              )}
              {product.warranty && (
                <details className="group border-t border-slate-100 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between py-4 text-sm font-extrabold text-slate-800 hover:text-retail transition-colors">
                    Warranty
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="16" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-sm text-slate-600 font-medium leading-relaxed animate-in fade-in slide-in-from-top-2">{product.warranty}</p>
                </details>
              )}
              {product.returnPolicy && (
                <details className="group border-t border-slate-100 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between py-4 text-sm font-extrabold text-slate-800 hover:text-retail transition-colors">
                    Return Policy
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="16" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <p className="pb-4 text-sm text-slate-600 font-medium leading-relaxed animate-in fade-in slide-in-from-top-2">{product.returnPolicy}</p>
                </details>
              )}
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="vv-section bg-paper">
        <StaggerContainer className="vv-container grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><Spec title="Measurements" icon={<Ruler className="h-5 w-5" />} lines={[product.measurements || "", product.size || ""]} /></StaggerItem>
          <StaggerItem><Spec title="Specifications" icon={<Sparkles className="h-5 w-5" />} lines={[product.material ? `Material: ${product.material}` : "", product.colour ? `Colour: ${product.colour}` : "", product.shape ? `Shape: ${product.shape}` : "", product.rimType ? `Rim: ${product.rimType}` : ""]} /></StaggerItem>
          <StaggerItem><Spec title="Lens support" icon={<Sparkles className="h-5 w-5" />} lines={product.lensCompatibility} /></StaggerItem>
          <StaggerItem><Spec
            title="Delivery"
            icon={<Truck className="h-5 w-5" />}
            lines={[getDeliveryDateText(product.deliveryEstimate)]}
          /></StaggerItem>
        </StaggerContainer>
      </section>

      {/* Review Moderation Panel displays */}
      <section className="vv-section bg-white/70 border-t border-slate-100">
        <FadeIn className="vv-container grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div className="grid gap-4 self-start">
            <div>
              <p className="vv-kicker text-retail">Customer Feedback</p>
              <h2 className="text-3xl font-extrabold text-slate-900 font-sans">Reviews & Ratings</h2>
            </div>
            
            {/* Submit review */}
            {canSubmitVerifiedReview && (
              <form action={addReviewAction} className="vv-card p-5 border border-slate-200 bg-slate-50/50 grid gap-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Write a verified-purchase review</h3>
              {query.reviewSubmitted && (
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded">
                  ✓ Review submitted! It will appear after moderation approval.
                </p>
              )}
              {query.error === "rate-limit" && (
                <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                  You have submitted too many reviews recently. Please try again later.
                </p>
              )}
              {/* Honeypot field - visually hidden */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              
              <p className="rounded bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">Submitting as {reviewCustomer?.name?.trim() || "Verified customer"}.</p>
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
            )}
            {!canSubmitVerifiedReview && (
              <div className="vv-card grid gap-3 border border-slate-200 bg-slate-50/50 p-5">
                <h3 className="font-extrabold text-slate-800 text-sm">Reviews are for verified buyers</h3>
                <p className="text-xs leading-relaxed text-slate-600">Sign in with the phone number used for a delivered order to submit one review. This protects customers from fabricated ratings.</p>
                {query.error === "sign-in-to-review" ? <p className="rounded bg-amber-50 p-2 text-xs font-bold text-amber-800">Sign in to submit a review.</p> : null}
                {query.error === "verified-purchase-required" ? <p className="rounded bg-amber-50 p-2 text-xs font-bold text-amber-800">A delivered purchase of this frame is required before reviewing it.</p> : null}
                <Link href="/account/login" className="vv-button-light justify-center text-xs">Sign in to review</Link>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <h3 className="font-extrabold text-slate-900 text-xl border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Customer Reviews ({reviews.length})</span>
              {avgRating && <span className="text-sm font-bold text-retail bg-teal-50 px-2 py-0.5 rounded">Avg {avgRating} Stars</span>}
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
        </FadeIn>
      </section>

      {related.length ? (
        <section className="vv-section bg-paper">
          <FadeIn className="vv-container">
            <div className="mb-8 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-retail" />
              <h2 className="text-3xl font-extrabold font-sans text-slate-900">Related frames</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {related.map((item) => (
                <ProductCard key={item.slug} product={toPublicStoreProduct(item)} />
              ))}
            </div>
          </FadeIn>
        </section>
      ) : null}

      {recentlyViewedProducts.length ? (
        <section className="vv-section bg-white/70 border-t border-slate-100">
          <FadeIn className="vv-container">
            <div className="mb-8 flex items-center gap-3">
              <Clock className="h-6 w-6 text-retail" />
              <h2 className="text-3xl font-extrabold font-sans text-slate-900">Recently viewed</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recentlyViewedProducts.map((item) => (
                <ProductCard key={item.slug} product={toPublicStoreProduct(item)} />
              ))}
            </div>
          </FadeIn>
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

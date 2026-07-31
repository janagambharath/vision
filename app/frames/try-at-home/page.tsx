import { ArrowLeft, CalendarCheck, CheckCircle2, Home, Package, Truck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { tryAtHomeAction } from "@/lib/orders";
import { getStoreProducts } from "@/lib/store-data";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/fade-in";
import { TryAtHomeRequestForm } from "@/components/try-at-home-request-form";
import { MAX_HOME_TRIAL_FRAMES, SITE_URL } from "@/lib/constants";
import { getCustomerSession } from "@/lib/customer-auth";

export const metadata: Metadata = {
  title: "Try at Home",
  description: "Choose up to 5 eligible frames and request a Vision Vistara home trial from any Indian pincode. Review your selection before sending; we confirm the visit details before booking.",
  alternates: { canonical: `${SITE_URL}/frames/try-at-home` }
};

export default async function TryAtHomePage({
  searchParams
}: {
  searchParams?: Promise<{ productIds?: string; request?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [products, customerSession] = await Promise.all([getStoreProducts({}), getCustomerSession()]);
  const eligibleProducts = products.filter((product) => product.tryAtHomeEligible && product.status === "ACTIVE");
  const preselectedIds = params.productIds?.split(",").filter(Boolean) ?? [];
  const returnTo = preselectedIds.length > 0
    ? `/frames/try-at-home?productIds=${encodeURIComponent(preselectedIds.join(","))}`
    : "/frames/try-at-home";

  if (params.request) {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-2xl text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-retail" />
          <h1 className="mt-6 text-4xl font-extrabold">Home trial request received</h1>
          <p className="mt-4 text-lg text-slate-600">Your selected frames and request are saved in My Account. This is not a confirmed visit yet—we will verify route, stock, and team availability before confirming.</p>
          <p className="mt-2 text-sm text-slate-500">Request ID: {params.request}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="vv-button-retail" href="/account/orders">View My Requests</Link>
            <Link className="vv-button-light" href="/frames">Browse frames</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="vv-section bg-paper">
      <FadeIn className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to store</Link>

        <div className="mb-8">
          <p className="vv-kicker flex items-center gap-2 text-retail"><Home className="h-4 w-4" />Try at Home</p>
          <h1 className="text-4xl font-extrabold">Try frames at home before you buy.</h1>
          <p className="mt-3 max-w-3xl text-slate-600">Select up to {MAX_HOME_TRIAL_FRAMES} eligible frames, add your preferred date and time, then review every detail before sending your request. A visit is scheduled only after our team confirms the route, frame availability, and capacity.</p>
          <p className="mt-2 text-sm font-bold text-blue-800">You can request a home trial from any valid Indian pincode. We confirm the final visit details after your request.</p>
          <div className="mt-4 rounded-vv border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"><strong>Kids&apos; frames require a doctor&apos;s prescription.</strong><p className="mt-1 text-xs leading-relaxed text-blue-800">Please keep the prescription ready when requesting a home trial for a child.</p></div>
        </div>

        {params.error ? (
          <div className="mb-6 rounded-vv border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {params.error === "frames-unavailable" ? "One or more selected frames are no longer available. Please choose another frame." : params.error === "rate-limited" ? "You have reached the request limit for this phone number. Please contact us if you need help." : "Please fill in all required fields correctly."}
          </div>
        ) : null}

        <StaggerContainer className="mb-8 grid gap-4 md:grid-cols-3">
          <StaggerItem><InfoCard icon={<Package className="h-8 w-8" />} title="Select frames" body={`Choose 1–${MAX_HOME_TRIAL_FRAMES} eligible frames you would like to try.`} /></StaggerItem>
          <StaggerItem><InfoCard icon={<CalendarCheck className="h-8 w-8" />} title="Review your request" body="Preview your selected frames, address, and preferred time before sending." /></StaggerItem>
          <StaggerItem><InfoCard icon={<Truck className="h-8 w-8" />} title="We confirm first" body="We confirm route, frame availability, and team capacity before scheduling." /></StaggerItem>
        </StaggerContainer>

        <TryAtHomeRequestForm
          products={eligibleProducts.map((product) => ({
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            pricePaise: product.pricePaise,
            colour: product.colour,
            shape: product.shape,
            image: product.images[0] ? { url: product.images[0].url, alt: product.images[0].alt } : undefined
          }))}
          initialProductIds={preselectedIds}
          isSignedIn={Boolean(customerSession)}
          loginHref={`/account/login?callbackUrl=${encodeURIComponent(returnTo)}`}
          action={tryAtHomeAction}
        />
      </FadeIn>
    </main>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="vv-card p-5"><div className="text-retail">{icon}</div><h3 className="mt-3 font-extrabold">{title}</h3><p className="mt-1 text-sm text-slate-600">{body}</p></div>;
}

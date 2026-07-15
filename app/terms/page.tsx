import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_NAME, CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Vision Vistara Optics & Lasers Eye Care, covering orders, payments, delivery, and platform usage.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-white">
        <div className="vv-container max-w-3xl">
          <p className="vv-kicker">Legal</p>
          <h1 className="text-4xl font-extrabold text-slate-900">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: July 2026</p>

          <div className="mt-10 grid gap-8 text-slate-700 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-2">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>By accessing or using the Vision Vistara website, frames store, AI try-on feature, or any related services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
            </section>

            <section>
              <h2>2. About {CLINIC_NAME}</h2>
              <p>{CLINIC_NAME} is an optical clinic and eyewear retailer operating from Hyderabad, Telangana, India. Our platform provides clinic appointment booking, an online frames store with checkout, AI-powered virtual try-on, and try-at-home services.</p>
            </section>

            <section>
              <h2>3. Orders and Payments</h2>
              <p>All prices are displayed in Indian Rupees (INR) and include applicable GST unless stated otherwise. By placing an order, you authorise us to charge the selected payment method. Orders are confirmed only after successful payment verification via our payment partner, Razorpay. We reserve the right to cancel orders if pricing errors, stock issues, or payment verification failures occur.</p>
            </section>

            <section>
              <h2>4. Prescription Eyewear</h2>
              <p>Prescription lens orders require a valid, recent prescription. Prescriptions uploaded through our platform are reviewed by our optometry team. We are not responsible for orders placed with incorrect or outdated prescription information. Prescription lenses are custom-made and may not be eligible for return unless defective.</p>
            </section>

            <section>
              <h2>5. AI Virtual Try-On</h2>
              <p>Our AI try-on feature generates an appearance preview only. It does not guarantee exact fit, lens thickness, prescription suitability, or the final manufactured frame alignment. Customer photos are processed temporarily and automatically deleted within 30 days. AI try-on should not be used as a substitute for a professional fitting or medical assessment.</p>
            </section>

            <section>
              <h2>6. Try-at-Home Service</h2>
              <p>The try-at-home service allows you to try up to 5 frames at your location. A refundable deposit and service fee apply. Frames must be returned in their original condition within the agreed timeframe. Damaged or unreturned frames will be charged at full retail price.</p>
            </section>

            <section>
              <h2>7. Delivery</h2>
              <p>Delivery estimates are indicative and not guaranteed. We partner with third-party logistics providers and are not liable for delays beyond our control. Risk of loss transfers to you upon delivery confirmation.</p>
            </section>

            <section>
              <h2>8. Cancellations</h2>
              <p>Orders may be cancelled before they are packed and shipped. Once shipped, cancellation is not possible — you may initiate a return instead. Prescription lens orders cannot be cancelled once lens processing has begun.</p>
            </section>

            <section>
              <h2>9. Intellectual Property</h2>
              <p>All content on this platform — including text, images, logos, designs, and AI-generated previews — is the property of {CLINIC_NAME} or its licensors. You may not reproduce, distribute, or create derivative works without written permission.</p>
            </section>

            <section>
              <h2>10. Limitation of Liability</h2>
              <p>{CLINIC_NAME} is not liable for indirect, incidental, or consequential damages arising from use of the platform. Our total liability is limited to the amount paid for the specific order in question.</p>
            </section>

            <section>
              <h2>11. Governing Law</h2>
              <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana.</p>
            </section>

            <section>
              <h2>12. Contact</h2>
              <p>For questions about these terms, contact us at <a href={`tel:+91${CLINIC_PHONE}`} className="text-clinic font-bold hover:underline">+91 {CLINIC_PHONE}</a> or email <a href="mailto:contact@visionvistara.online" className="text-clinic font-bold hover:underline">contact@visionvistara.online</a>.</p>
            </section>
          </div>

          <div className="mt-12 flex gap-4 text-sm font-bold">
            <Link href="/privacy" className="text-clinic hover:underline">Privacy Policy</Link>
            <Link href="/return-policy" className="text-clinic hover:underline">Return Policy</Link>
          </div>
        </div>
      </main>
    </>
  );
}

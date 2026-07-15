import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description: "Return and refund policy for Vision Vistara, including details on frame returns, prescription lens exceptions, and try-at-home services.",
  alternates: { canonical: `${SITE_URL}/return-policy` },
};

export default function ReturnPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-white">
        <div className="vv-container max-w-3xl">
          <p className="vv-kicker">Legal</p>
          <h1 className="text-4xl font-extrabold text-slate-900">Return & Refund Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: July 2026</p>

          <div className="mt-10 grid gap-8 text-slate-700 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-2">
            <section>
              <h2>1. Returns (Frames Only)</h2>
              <p>We accept returns for <strong>frames without prescription lenses</strong> within <strong>7 days</strong> of delivery. To be eligible for a return, the frame must be unused, in the same condition that you received it, and in its original packaging with all accessories.</p>
            </section>

            <section>
              <h2>2. Prescription Eyewear (Non-Returnable)</h2>
              <p><strong>Custom-made prescription lenses are non-returnable and non-refundable.</strong> Since these lenses are tailored to your specific vision requirements, they cannot be resold. If you purchased a frame with prescription lenses, only the frame may be eligible for a partial refund or exchange, subject to inspection.</p>
              <p className="mt-2 text-amber-700 bg-amber-50 p-3 rounded border border-amber-100">
                <strong>Defects:</strong> If there is a manufacturing defect in the frame or lenses, or if the prescription was made incorrectly by our lab, we will replace the eyewear at no additional cost. You must report such issues within 7 days of delivery.
              </p>
            </section>

            <section>
              <h2>3. Try-at-Home Deposits</h2>
              <p>For our Try-at-Home service, a fully refundable deposit is collected. This deposit will be refunded to your original payment method once the try-at-home frames are returned in good condition. The non-refundable service fee will be deducted if you do not proceed with a purchase.</p>
            </section>

            <section>
              <h2>4. Refund Process</h2>
              <p>Once your return is received and inspected, we will notify you of the approval or rejection of your refund. If approved, the refund will be processed, and a credit will automatically be applied to your credit card or original method of payment within 5-7 business days.</p>
            </section>

            <section>
              <h2>5. Cancellations</h2>
              <p>You can cancel your order before it has been processed or shipped for a full refund. Once prescription lens processing has started, the order cannot be fully cancelled. Please contact us immediately if you need to cancel an order.</p>
            </section>

            <section>
              <h2>6. Shipping for Returns</h2>
              <p>To initiate a return, please contact our support team. We will arrange a pickup or provide instructions for returning the item. You may be responsible for paying shipping costs for returning your item if it is not due to a defect or error on our part.</p>
            </section>

            <section>
              <h2>7. Contact for Returns</h2>
              <p>To request a return or if you have any questions, please contact us:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Phone/WhatsApp: <a href={`tel:+91${CLINIC_PHONE}`} className="text-clinic font-bold hover:underline">+91 {CLINIC_PHONE}</a></li>
                <li>Email: <a href="mailto:support@visionvistara.online" className="text-clinic font-bold hover:underline">support@visionvistara.online</a></li>
              </ul>
            </section>
          </div>

          <div className="mt-12 flex gap-4 text-sm font-bold">
            <Link href="/terms" className="text-clinic hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="text-clinic hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </main>
    </>
  );
}

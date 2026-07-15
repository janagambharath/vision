import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_NAME, CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Vision Vistara Optics & Lasers Eye Care, detailing data collection, AI image processing, and your rights.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-white">
        <div className="vv-container max-w-3xl">
          <p className="vv-kicker">Legal</p>
          <h1 className="text-4xl font-extrabold text-slate-900">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: July 2026</p>

          <div className="mt-10 grid gap-8 text-slate-700 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-2">
            <section>
              <h2>1. Introduction</h2>
              <p>Welcome to {CLINIC_NAME}. We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, book an appointment, or use our frames store and AI virtual try-on features.</p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Personal Details:</strong> Name, phone number, email address, and shipping/billing address.</li>
                <li><strong>Medical Information:</strong> Details you provide when booking appointments or uploading optical prescriptions.</li>
                <li><strong>Photos for AI Try-On:</strong> Selfies or facial images you upload for the virtual try-on feature.</li>
                <li><strong>Usage Data:</strong> IP address, browser type, pages visited, and interaction data via cookies and analytics.</li>
                <li><strong>Order Information:</strong> Purchase history, cart contents, and payment status (note: actual payment processing is handled securely by Razorpay; we do not store full card numbers).</li>
              </ul>
            </section>

            <section>
              <h2>3. How We Use Your Information</h2>
              <p>We use the collected data to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Provide our services, process orders, and facilitate try-at-home requests.</li>
                <li>Schedule and confirm clinic appointments.</li>
                <li>Generate AI-powered previews of frames on your face.</li>
                <li>Communicate with you regarding orders, appointments, and support via email or WhatsApp.</li>
                <li>Improve our website, services, and user experience.</li>
              </ul>
            </section>

            <section>
              <h2>4. AI Virtual Try-On and Image Processing</h2>
              <p>When you use our Virtual Try-On feature:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Your selfie is securely uploaded and processed to align the selected frame.</li>
                <li>We use third-party AI services (Google Gemini) for generating the preview.</li>
                <li><strong>Both your original selfie and the generated preview are temporary. They are automatically deleted from our servers within 30 days.</strong></li>
                <li>We do not use your photos to train our AI models or for any purpose other than providing you with the try-on preview.</li>
              </ul>
            </section>

            <section>
              <h2>5. Third-Party Services</h2>
              <p>We may share data with trusted third parties to facilitate our services:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Razorpay:</strong> For secure payment processing.</li>
                <li><strong>Cloudinary:</strong> For image hosting and processing (including temporary try-on images).</li>
                <li><strong>Google/OpenRouter:</strong> For AI try-on generation and product data enrichment.</li>
                <li><strong>WhatsApp/Resend:</strong> For sending appointment and order confirmations.</li>
                <li><strong>Delivery Partners (e.g., Shiprocket):</strong> For fulfilling your orders.</li>
              </ul>
            </section>

            <section>
              <h2>6. Cookies and Tracking</h2>
              <p>We use cookies to maintain your shopping cart, wishlist, and session data. You can control cookie preferences through your browser settings, though disabling cookies may affect website functionality.</p>
            </section>

            <section>
              <h2>7. Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, loss, or alteration. All data transmission is encrypted using standard protocols.</p>
            </section>

            <section>
              <h2>8. Your Rights</h2>
              <p>You have the right to access, correct, or request deletion of your personal data. For requests regarding your data, please contact us using the information below.</p>
            </section>

            <section>
              <h2>9. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.</p>
            </section>

            <section>
              <h2>10. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at <a href={`tel:+91${CLINIC_PHONE}`} className="text-clinic font-bold hover:underline">+91 {CLINIC_PHONE}</a> or email <a href="mailto:privacy@visionvistara.online" className="text-clinic font-bold hover:underline">privacy@visionvistara.online</a>.</p>
            </section>
          </div>

          <div className="mt-12 flex gap-4 text-sm font-bold">
            <Link href="/terms" className="text-clinic hover:underline">Terms of Service</Link>
            <Link href="/return-policy" className="text-clinic hover:underline">Return Policy</Link>
          </div>
        </div>
      </main>
    </>
  );
}

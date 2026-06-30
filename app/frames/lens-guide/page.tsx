import Link from "next/link";
import { ArrowLeft, Sparkles, Check, HelpCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";

export const metadata = {
  title: "Lens Guide & Pricing | Vision Vistara",
  description: "Learn about lens packages, coating specifications, and pricing on Vision Vistara."
};

const guideItems = [
  {
    name: "Clear prescription lens",
    price: 50000,
    bestFor: "Standard everyday correction",
    coating: "Basic scratch-resistant coating",
    index: "1.50 Standard Index",
    uv: "UV380 Protection"
  },
  {
    name: "Anti-glare coating",
    price: 80000,
    bestFor: "Night driving, office work",
    coating: "Multi-layer anti-reflective (AR) coating",
    index: "1.56 Mid-Index",
    uv: "UV400 Protection"
  },
  {
    name: "Blue-light filter lens",
    price: 120000,
    bestFor: "IT professionals, heavy screen users",
    coating: "Blue-cut block & electromagnetic shield",
    index: "1.56 Mid-Index",
    uv: "UV420 Protection"
  },
  {
    name: "Photochromic lens",
    price: 150000,
    bestFor: "Indoor / outdoor seamless transition",
    coating: "Transitions adaptive light response",
    index: "1.56 Adaptive Index",
    uv: "100% UV400 Protection"
  },
  {
    name: "Premium lens package",
    price: 450000,
    bestFor: "Strong prescriptions, premium scratch-free clarity",
    coating: "Super hydrophobic, dust-repellent, anti-glare, anti-smudge",
    index: "1.60 High-Index (Thin)",
    uv: "100% UV400 Protection"
  }
];

export default function LensGuidePage() {
  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-4xl">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">Education</p>
          <h1 className="text-4xl font-extrabold text-slate-900 font-sans">Lens Selection & Pricing Guide</h1>
          <p className="mt-2 text-slate-600">Select the right coating and index for your vision needs.</p>
        </div>

        {/* Lens Comparison Table */}
        <div className="bg-white border border-slate-200 rounded-vv overflow-hidden shadow-sm mb-8">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 font-extrabold text-slate-800">Lens Package</th>
                  <th className="p-4 font-extrabold text-slate-800">Price</th>
                  <th className="p-4 font-extrabold text-slate-800">Best For</th>
                  <th className="p-4 font-extrabold text-slate-800">Coating details</th>
                  <th className="p-4 font-extrabold text-slate-800">UV Protection</th>
                </tr>
              </thead>
              <tbody>
                {guideItems.map((item) => (
                  <tr key={item.name} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-extrabold text-slate-900">{item.name}</td>
                    <td className="p-4 font-bold text-retail">{formatMoney(item.price)}</td>
                    <td className="p-4 text-xs font-semibold text-slate-600">{item.bestFor}</td>
                    <td className="p-4 text-xs text-slate-500">{item.coating}</td>
                    <td className="p-4 text-xs font-bold text-emerald-700">{item.uv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="grid gap-6">
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <HelpCircle className="h-6 w-6 text-retail" />
            Frequently Asked Questions
          </h2>
          <div className="grid gap-4 text-sm text-slate-600">
            <div className="p-4 border border-slate-100 rounded bg-white">
              <strong className="text-slate-800 block">Do I need a prescription to order lenses?</strong>
              <p className="mt-1 leading-relaxed">No, you can order frames without prescription lenses (choose "Frame only"), or select "Zero power blue-cut lenses" for screen protection only.</p>
            </div>
            <div className="p-4 border border-slate-100 rounded bg-white">
              <strong className="text-slate-800 block">How do I submit my prescription power details?</strong>
              <p className="mt-1 leading-relaxed">You can upload a photograph or PDF scan of your prescription during checkout. Alternatively, you can checkout without uploading and send it to our optometrists on WhatsApp afterwards.</p>
            </div>
            <div className="p-4 border border-slate-100 rounded bg-white">
              <strong className="text-slate-800 block">What is index thickness?</strong>
              <p className="mt-1 leading-relaxed">Index refers to the refractive index of the lens material. Higher index numbers (like 1.60) bend light more efficiently, allowing lenses to be thinner and lighter for high power prescriptions.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

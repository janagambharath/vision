import Link from "next/link";
import Image from "next/image";
import { getStoreProducts } from "@/lib/store-data";
import { formatMoney } from "@/lib/money";
import { ArrowLeft, Check, X, ShoppingBag } from "lucide-react";

export const metadata = {
  title: "Compare Eyewear Frames | Vision Vistara",
  description: "Side-by-side comparison of premium optical frames on Vision Vistara."
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const params = await searchParams;
  const slugsStr = params.slugs ?? "";
  const slugs = slugsStr ? slugsStr.split(",") : [];

  const allProducts = await getStoreProducts({ includeDrafts: true });
  const products = allProducts.filter((p) => slugs.includes(p.slug));

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-6xl">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Storefront
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">Tools</p>
          <h1 className="text-4xl font-extrabold text-slate-900 font-sans">Compare Eyewear</h1>
          <p className="mt-2 text-slate-600">Select and compare specifications to find your perfect fit.</p>
        </div>

        {products.length === 0 ? (
          <div className="vv-card p-16 text-center bg-white border border-slate-100 rounded-vv">
            <h2 className="text-xl font-extrabold text-slate-800">No frames selected for comparison</h2>
            <p className="text-slate-500 mt-2">Go back to storefront catalog and select frames to compare.</p>
            <Link href="/frames" className="vv-button-retail mt-4 inline-block">
              Browse Store
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-vv overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 font-extrabold text-slate-800 w-1/4">Specification</th>
                  {products.map((p) => (
                    <th key={p.slug} className="p-4 font-extrabold text-slate-800 w-1/4 text-center border-l border-slate-100">
                      <div className="relative h-28 w-full border border-slate-100 rounded bg-slate-50 overflow-hidden mb-3">
                        <Image
                          src={p.images[0]?.url || "/placeholder-frame.png"}
                          alt={p.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <span className="block text-slate-950 font-bold">{p.brand} {p.name}</span>
                      <span className="block text-xs text-slate-400 font-normal mt-0.5">SKU: {p.sku}</span>
                    </th>
                  ))}
                  {/* Fill empty cells if comparing less than 3 */}
                  {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
                    <th key={i} className="p-4 w-1/4 border-l border-slate-100 text-slate-300 italic text-center font-normal text-xs bg-slate-50/50">
                      Compare slot empty
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Price" values={products.map((p) => formatMoney(p.pricePaise))} />
                <CompareRow label="Material" values={products.map((p) => p.material ?? "N/A")} />
                <CompareRow label="Shape" values={products.map((p) => p.shape ?? "N/A")} />
                <CompareRow label="Rim Type" values={products.map((p) => p.rimType ?? "N/A")} />
                <CompareRow label="Colour" values={products.map((p) => p.colour ?? "N/A")} />
                <CompareRow label="Measurements" values={products.map((p) => p.measurements ?? "N/A")} />
                <CompareRow label="Best for Face Shapes" values={products.map((p) => p.faceShapes?.join(", ") || "N/A")} />
                <CompareRow
                  label="Home Trial"
                  values={products.map((p) =>
                    p.tryAtHomeEligible ? (
                      <span key={p.slug} className="text-emerald-700 font-bold flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Eligible</span>
                    ) : (
                      <span key={p.slug} className="text-slate-400 flex items-center justify-center gap-1"><X className="h-4 w-4" /> Ineligible</span>
                    )
                  )}
                />
                <CompareRow label="Lens Support" values={products.map((p) => p.lensCompatibility?.join(", ") || "N/A")} />
                <CompareRow label="Warranty" values={products.map((p) => p.warranty ?? "N/A")} />
                <CompareRow label="Return Policy" values={products.map((p) => p.returnPolicy ?? "N/A")} />
                
                {/* Actions Row */}
                <tr className="border-t border-slate-200">
                  <td className="p-4 font-extrabold text-slate-800">Action</td>
                  {products.map((p) => (
                    <td key={p.slug} className="p-4 text-center border-l border-slate-100 bg-slate-50/10">
                      <Link href={`/frames/${p.slug}`} className="vv-button-retail text-xs py-2 px-3 inline-flex items-center gap-1 w-full justify-center">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        View product
                      </Link>
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
                    <td key={i} className="p-4 border-l border-slate-100 bg-slate-50/5" />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function CompareRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/40">
      <td className="p-4 font-extrabold text-slate-700 bg-slate-50/20">{label}</td>
      {values.map((val, i) => (
        <td key={i} className="p-4 text-center border-l border-slate-100 font-semibold">
          {val}
        </td>
      ))}
      {Array.from({ length: Math.max(0, 3 - values.length) }).map((_, i) => (
        <td key={i} className="p-4 border-l border-slate-100 text-slate-300 text-center font-normal text-xs bg-slate-50/5" />
      ))}
    </tr>
  );
}

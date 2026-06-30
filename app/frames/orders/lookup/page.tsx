import { redirect } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Track Order",
  description: "Look up your Vision Vistara order by order ID and phone number."
};

export default async function OrderLookupPage({
  searchParams
}: {
  searchParams?: Promise<{ id?: string; phone?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  if (params.id) {
    const order = await prisma.order.findUnique({
      where: { publicId: params.id.trim().toUpperCase() }
    }).catch(() => null);

    if (order) {
      redirect(`/frames/orders/${order.publicId}`);
    }
  }

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container max-w-2xl">
        <p className="vv-kicker text-retail">Track your order</p>
        <h1 className="text-4xl font-extrabold">Find your order status.</h1>
        <p className="mt-3 text-slate-600">Enter your order ID (starts with VV-) to check the current status.</p>

        {params.id ? (
          <div className="mt-5 rounded-vv border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            No order found with ID &quot;{params.id}&quot;. Please check and try again.
          </div>
        ) : null}

        <form className="vv-card mt-8 grid gap-4 p-6" action="/frames/orders/lookup" method="get">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Order ID
            <input className="store-input" type="text" name="id" placeholder="VV-..." required defaultValue={params.id ?? ""} />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Phone number
            <input className="store-input" type="tel" name="phone" placeholder="e.g. 9876543210" defaultValue={params.phone ?? ""} />
          </label>
          <button className="vv-button-retail" type="submit">
            <Search className="h-4 w-4" />
            Track Order
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Can&apos;t find your order? <Link href="/contact" className="font-bold text-retail hover:underline">Contact us</Link> for help.
        </p>
      </div>
    </main>
  );
}

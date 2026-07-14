import Link from "next/link";
import { OrderLookupForm } from "@/components/order-lookup-form";

export const metadata = {
  title: "Track Order",
  description: "Look up your Vision Vistara order by order ID and phone number.",
  robots: { index: false, follow: false }
};

export default function OrderLookupPage() {
  return (
    <main className="vv-section bg-paper">
      <div className="vv-container max-w-2xl">
        <p className="vv-kicker text-retail">Order tracking</p>
        <h1 className="text-4xl font-extrabold">Find your order status.</h1>
        <p className="mt-3 text-slate-600">Verify with the full phone number used at checkout. We do not place phone numbers in URLs or share order details before verification.</p>
        <OrderLookupForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Need help? <Link href="/contact" className="font-bold text-retail hover:underline">Contact the clinic</Link>.
        </p>
      </div>
    </main>
  );
}

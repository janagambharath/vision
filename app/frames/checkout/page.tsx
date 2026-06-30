import Link from "next/link";
import CheckoutForm from "@/components/checkout-form";
import { calculateCartTotals, getCartOrNull } from "@/lib/cart";

export const metadata = {
  title: "Checkout | Vision Vistara",
  description: "Checkout eyewear orders safely online with Razorpay or WhatsApp integration."
};

export default async function CheckoutPage() {
  const cart = await getCartOrNull();
  const items = cart?.items ?? [];
  const totals = calculateCartTotals(cart);

  if (!items.length) {
    return (
      <main className="vv-section bg-paper flex min-h-[50vh] items-center justify-center">
        <div className="vv-container text-center">
          <h1 className="text-3xl font-extrabold text-slate-800">Your cart is empty.</h1>
          <p className="text-slate-500 mt-2">Add some stunning frames to your cart to checkout.</p>
          <Link className="vv-button-retail mt-5 inline-block" href="/frames">
            Browse frames
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8">
          <p className="vv-kicker text-retail">Checkout</p>
          <h1 className="text-4xl font-extrabold">Complete your order</h1>
          <p className="mt-2 text-slate-600">Provide shipping details, prescription attachments, and payment preferences.</p>
        </div>

        <CheckoutForm cart={cart} totals={totals} />
      </div>
    </main>
  );
}

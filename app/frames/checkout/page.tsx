import Link from "next/link";
import CheckoutForm from "@/components/checkout-form";
import { calculateCartTotals, getCheckoutCartOrNull, getDirectCheckoutItemId, toPublicCart } from "@/lib/cart";

export const metadata = {
  title: "Checkout | Vision Vistara",
  description: "Place your Vision Vistara eyewear order with cash on delivery."
};

export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<{ error?: string; mode?: string }> }) {
  const checkoutMode = (await searchParams)?.mode === "cart" ? "CART" : "DIRECT";
  const cart = await getCheckoutCartOrNull(checkoutMode === "CART");
  const items = cart?.items ?? [];
  const totals = calculateCartTotals(cart);

  if (!cart || !items.length) {
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

  const mappedCart = toPublicCart(cart);
  const rawError = (await searchParams)?.error;
  const directCheckout = checkoutMode === "DIRECT" && Boolean(
    cart?.items.length === 1 && (await getDirectCheckoutItemId()) === cart.items[0]?.id
  );
  const error = rawError === "invalid-details"
    ? "Please complete every required delivery field and try again."
    : rawError === "order-rate-limited"
      ? "Too many order attempts. Please wait a little while before trying again."
      : rawError === "delivery-unavailable"
        ? "Delivery is currently available only in selected Hyderabad pincodes. Please contact us on WhatsApp if you need help."
      : rawError === "coupon-unavailable"
        ? "That coupon was just used up or changed. Please review your total and try again."
      : rawError === "prescription-upload-failed"
        ? "We could not save your prescription. Please try again."
        : rawError;
  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8">
          <p className="vv-kicker text-retail">Checkout</p>
          <h1 className="text-4xl font-extrabold">Complete your order</h1>
          <p className="mt-2 text-slate-600">Provide shipping details and prescription information. Payment is collected by cash on delivery.</p>
        </div>

        <CheckoutForm
          cart={mappedCart!}
          totals={totals}
          error={error}
          checkoutScope={checkoutMode}
          directCheckout={directCheckout}
        />
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowRight, MessageCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { formatMoney } from "@/lib/money";

interface OrderDetail {
  id: string;
  publicId: string;
  customerName: string;
  phone: string;
  email: string | null;
  grandTotalPaise: number;
  paymentMethod: string;
}

export default function RazorpayPayClient({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const autoStartedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const startPayment = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const configRes = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id })
      });

      if (!configRes.ok) {
        throw new Error("Failed to initialize payment configuration.");
      }

      const config = await configRes.json();

      const options = {
        key: config.keyId,
        amount: config.amount,
        currency: config.currency,
        name: "Vision Vistara",
        description: `Eyewear Order: ${order.publicId}`,
        image: "/assets/vision-vistara-eye-logo.png",
        order_id: config.razorpayOrderId,
        handler: async function (response: any) {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderPublicId: order.publicId
              })
            });

            if (!verifyRes.ok) {
              throw new Error("Payment signature verification failed.");
            }

            router.push(`/frames/orders/${order.publicId}?payment=success`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setLoading(false);
          }
        },
        prefill: {
          name: order.customerName,
          email: order.email || "",
          contact: order.phone
        },
        theme: {
          color: "#0f766e"
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setError("Payment cancelled. You can retry or complete via WhatsApp.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment gateway error.");
      setLoading(false);
    }
  }, [order, router]);

  useEffect(() => {
    if (sdkLoaded && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startPayment();
    }
  }, [sdkLoaded, startPayment]);

  if (loading) {
    return (
      <main className="vv-section bg-paper flex min-h-[60vh] items-center justify-center">
        <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setSdkLoaded(true)} />
        <div className="text-center">
          <RefreshCw className="mx-auto h-10 w-10 animate-spin text-retail" />
          <h2 className="mt-4 text-xl font-extrabold">Initializing secure payment...</h2>
          <p className="mt-2 text-slate-500">Do not refresh this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="vv-section bg-paper min-h-[70vh]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setSdkLoaded(true)} />

      <div className="vv-container max-w-xl">
        <div className="vv-card p-8 text-center grid gap-6">
          <div className="grid justify-items-center">
            {error ? (
              <AlertTriangle className="h-16 w-16 text-amber-500" />
            ) : (
              <CreditCard className="h-16 w-16 text-retail" />
            )}
          </div>

          <div>
            <p className="vv-kicker text-retail">Payment Pending</p>
            <h1 className="text-3xl font-extrabold mt-1">Complete your order</h1>
            <div className="mt-4 rounded-vv bg-slate-50 p-4 border border-slate-100">
              <p className="text-sm text-slate-500">
                Order ID: <strong>{order.publicId}</strong>
              </p>
              <p className="text-2xl font-extrabold text-retail mt-1">{formatMoney(order.grandTotalPaise)}</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-vv bg-amber-50 border border-amber-200 p-4 text-sm font-bold text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="grid gap-2">
            <button className="vv-button-retail py-3 justify-center w-full font-bold" onClick={startPayment}>
              Pay secure online
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={`https://wa.me/917842938316?text=Hi%2C%20I%27m%20having%20trouble%20with%20Razorpay%20for%20order%20${order.publicId}.%20Please%20assist%20with%20UPI/COD%20checkout.`}
              target="_blank"
              rel="noopener noreferrer"
              className="vv-button bg-emerald-400 hover:bg-emerald-500 text-ink py-3 justify-center w-full font-bold"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Assisted Checkout
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

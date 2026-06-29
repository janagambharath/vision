import Razorpay from "razorpay";

export function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured.");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  const razorpay = getRazorpayClient();

  return razorpay.orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes
  });
}

import { notFound, redirect } from "next/navigation";
import RazorpayPayClient from "@/components/razorpay-pay-client";
import { prisma } from "@/lib/db";
import { hasOrderAccess } from "@/lib/order-access";

const ONLINE_PAYMENT_METHODS = new Set(["RAZORPAY", "UPI", "CARD", "NETBANKING"]);

export default async function RazorpayPayPage({
  params
}: {
  params: Promise<{ publicOrderId: string }>;
}) {
  const { publicOrderId } = await params;

  const order = await prisma.order.findUnique({
    where: { publicId: publicOrderId },
    select: {
      publicId: true,
      customerName: true,
      phone: true,
      email: true,
      grandTotalPaise: true,
      paymentMethod: true,
      status: true
    }
  });

  if (!order) notFound();

  if (!(await hasOrderAccess(order.publicId, "checkout"))) {
    redirect("/frames/checkout?error=checkout-session-expired");
  }

  if (!ONLINE_PAYMENT_METHODS.has(order.paymentMethod)) {
    redirect(`/frames/orders/${order.publicId}`);
  }

  if (!["PENDING", "AWAITING_PRESCRIPTION"].includes(order.status)) {
    redirect(`/frames/orders/${order.publicId}`);
  }

  return <RazorpayPayClient order={order} />;
}

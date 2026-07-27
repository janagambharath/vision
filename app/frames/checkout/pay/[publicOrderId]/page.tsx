import { redirect } from "next/navigation";

export default async function RazorpayPayPage({
  params
}: {
  params: Promise<{ publicOrderId: string }>;
}) {
  const { publicOrderId } = await params;
  redirect(`/frames/orders/${encodeURIComponent(publicOrderId)}?payment=cod-only`);
}

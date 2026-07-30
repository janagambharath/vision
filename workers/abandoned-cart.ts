import { prisma } from "../lib/db";
import { sendEmail } from "../lib/integrations/resend";
import { sendWhatsAppTemplate } from "../lib/integrations/whatsapp";

async function main() {
  console.log("⏰ Running abandoned cart recovery worker...");
  
  // Cutoff of 12 hours ago
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 12);
  const abandonedCarts = await prisma.cart.findMany({
    where: {
      updatedAt: { lt: cutoff },
      items: { some: {} }
    },
    include: {
      items: { include: { product: true, lensOption: true } },
      user: true
    },
    take: 50
  });

  console.log(`  → Found ${abandonedCarts.length} abandoned carts`);

  // A cart remains abandoned after a reminder. Querying only by `updatedAt`
  // previously caused the six-hour cron to contact the same shopper again and
  // again. The activity log is the durable once-per-cart delivery marker.
  const previouslyContacted = new Set(
    (await prisma.activityLog.findMany({
      where: {
        action: "ABANDONED_CART_RECOVERY_SENT",
        entityType: "cart",
        entityId: { in: abandonedCarts.map((cart) => cart.id) }
      },
      select: { entityId: true }
    })).flatMap((entry) => entry.entityId ? [entry.entityId] : [])
  );

  for (const cart of abandonedCarts) {
    const user = cart.user;
    if (!user || previouslyContacted.has(cart.id)) continue;

    // Claim this cart before contacting the customer. If two cron instances
    // overlap, only the one that still sees the original timestamp can send.
    const claimed = await prisma.cart.updateMany({
      where: { id: cart.id, updatedAt: cart.updatedAt },
      data: { updatedAt: new Date() }
    });
    if (claimed.count !== 1) continue;

    const itemCount = cart.items.length;
    const firstItemName = cart.items[0]?.product?.name ?? "frames";
    const cartUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://visionvistara.online"}/frames/cart`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f766e;">You left items in your cart</h2>
        <p>Hello ${user.name || "Customer"},</p>
        <p>We noticed you left ${itemCount} frame(s) in your cart, including the <strong>${firstItemName}</strong>.</p>
        <p>Availability can change, so return when you are ready to complete your order.</p>
        <a href="${cartUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f766e; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px;">
          Return to Cart
        </a>
      </div>
    `;

    let channel: "email" | "whatsapp" | null = null;
    let recipient: string | null = null;

    // Send one reminder through the customer's preferred available channel.
    // Falling back to email keeps recovery useful if WhatsApp is unavailable,
    // while avoiding two unsolicited messages for the same cart.
    if (user.phone) {
      try {
        await sendWhatsAppTemplate(user.phone, "abandoned_cart_reminder", [
          user.name || "Customer",
          firstItemName,
          cartUrl
        ]);
        channel = "whatsapp";
        recipient = user.phone;
      } catch (error) {
        console.error("Abandoned cart WhatsApp reminder failed", { cartId: cart.id, error });
      }
    }

    if (!channel && user.email) {
      try {
        await sendEmail(user.email, "Items waiting in your cart | Vision Vistara", emailHtml);
        channel = "email";
        recipient = user.email;
      } catch (error) {
        console.error("Abandoned cart email reminder failed", { cartId: cart.id, error });
      }
    }

    if (!channel || !recipient) continue;

    await prisma.activityLog.create({
      data: {
        action: "ABANDONED_CART_RECOVERY_SENT",
        entityType: "cart",
        entityId: cart.id,
        metadata: { channel, recipient, itemCount, firstItemName }
      }
    });
  }

  console.log("✅ Abandoned cart recovery completed!");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Abandoned cart worker failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

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

  for (const cart of abandonedCarts) {
    const user = cart.user;
    if (!user) continue;

    const itemCount = cart.items.length;
    const firstItemName = cart.items[0]?.product?.name ?? "frames";

    // Send email reminder if email is available
    if (user.email) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f766e;">You left items in your cart</h2>
          <p>Hello ${user.name || "Customer"},</p>
          <p>We noticed you left ${itemCount} frame(s) in your cart, including the <strong>${firstItemName}</strong>.</p>
          <p>Frames in your cart are reserved for a limited time. Complete your order today and get 10% off using code <strong>WELCOME10</strong>.</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://visionvistara.online'}/frames/cart/apply?coupon=WELCOME10" 
             style="display: inline-block; padding: 12px 24px; background-color: #0f766e; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px;">
            Return to Cart
          </a>
        </div>
      `;
      await sendEmail(user.email, "Items waiting in your cart | Vision Vistara", emailHtml);
    }

    // Send WhatsApp reminder if phone is available
    if (user.phone) {
      await sendWhatsAppTemplate(user.phone, "abandoned_cart_reminder", [
        user.name || "Customer",
        firstItemName,
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://visionvistara.online'}/frames/cart/apply?coupon=WELCOME10`
      ]);
    }

    // Log the event
    await prisma.activityLog.create({
      data: {
        action: "ABANDONED_CART_RECOVERY_SENT",
        entityType: "cart",
        entityId: cart.id,
        metadata: {
          phone: user.phone ?? null,
          email: user.email ?? null,
          itemCount
        }
      }
    });

    // Touch the cart updatedAt to avoid sending duplicate reminders on next run
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() }
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

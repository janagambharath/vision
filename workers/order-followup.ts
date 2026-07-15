import { prisma } from "../lib/db";
import { sendEmail } from "../lib/integrations/resend";
import { sendWhatsAppTemplate } from "../lib/integrations/whatsapp";

async function main() {
  console.log("⏰ Running order follow-up worker...");

  // Cutoff of 2 days ago for delivery check or status reviews
  const twoDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
  const deliveredOrders = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      updatedAt: { lt: twoDaysAgo },
      // Check if we haven't logged feedback collection yet
      notifications: {
        none: {
          entityType: "ORDER_FOLLOWUP"
        }
      }
    },
    include: {
      items: true
    },
    take: 30
  });

  console.log(`  → Found ${deliveredOrders.length} orders requiring review follow-up`);

  for (const order of deliveredOrders) {
    let followUpLogged = false;
    const logFollowUp = async (channel: "email" | "whatsapp", recipient: string) => {
      if (followUpLogged) return;
      await prisma.notification.create({
        data: {
          orderId: order.id,
          channel,
          recipient,
          subject: "Delivery feedback follow-up",
          status: "sent",
          sentAt: new Date(),
          entityType: "ORDER_FOLLOWUP",
          entityId: order.id
        }
      });
      followUpLogged = true;
    };

    if (order.email) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0f766e;">How is your new vision?</h2>
          <p>Hello ${order.customerName},</p>
          <p>It has been a few days since your order <strong>${order.publicId}</strong> was delivered. We hope you are loving your new frames!</p>
          <p>If you have a moment, we would highly appreciate your feedback. It helps us continue to provide top-tier eye care and optical products.</p>
          <div style="margin: 25px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://visionvistara.online'}/frames/orders/${order.publicId}" 
               style="display: inline-block; padding: 12px 24px; background-color: #0f766e; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Leave a Review
            </a>
          </div>
          <p>If you need any adjustments or help with your lenses, please visit our clinic or message us directly on WhatsApp.</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0;"/>
          <p style="font-size: 12px; color: #888;">Vision Vistara Optics & Lasers Eye Care</p>
        </div>
      `;

      await sendEmail(order.email, "How is your new vision? | Vision Vistara", emailHtml);
      await logFollowUp("email", order.email);
    }

    if (order.phone) {
      await sendWhatsAppTemplate(order.phone, "delivery_feedback_followup", [
        order.customerName,
        order.publicId
      ]);
      await logFollowUp("whatsapp", order.phone);
    }
  }

  console.log("✅ Order follow-ups completed!");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Order follow-up worker failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { prisma } from "../lib/db";
import { sendEmail } from "../lib/integrations/resend";
import { sendWhatsAppTemplate } from "../lib/integrations/whatsapp";

async function main() {
  console.log("⏰ Running low-stock alert worker...");

  const lowStockThreshold = 3;

  const lowStockItems = await prisma.product.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      inventory: {
        quantity: { lte: lowStockThreshold }
      }
    },
    include: {
      inventory: true
    }
  });

  console.log(`  → Found ${lowStockItems.length} low stock frames`);

  if (lowStockItems.length === 0) {
    console.log("✅ No low-stock items detected.");
    return;
  }

  const itemsHtml = lowStockItems.map((item) => {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${item.brand} ${item.name}</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.sku}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; color: red; font-weight: bold;">${item.inventory?.quantity ?? 0} left</td>
      </tr>
    `;
  }).join("");

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #c2410c; border-bottom: 2px solid #c2410c; padding-bottom: 10px;">⚠️ Low Stock Alert</h2>
      <p>Hello Admin,</p>
      <p>The following optical frame items have stock levels below or equal to the threshold of <strong>${lowStockThreshold}</strong>. Please review and coordinate restocking.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #fff7ed;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">SKU</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Current Stock</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p style="margin-top: 30px;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://visionvistara.online'}/admin/inventory" style="display: inline-block; padding: 12px 24px; background-color: #c2410c; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Manage Inventory</a></p>
    </div>
  `;

  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@visionvistara.online";
  await sendEmail(adminEmail, "Low Stock Warning | Vision Vistara Admin", emailHtml);

  // Send WhatsApp to staff/admin if configured
  const clinicPhone = process.env.CLINIC_PHONE ?? "7842938316";
  await sendWhatsAppTemplate(clinicPhone, "low_stock_admin_alert", [
    String(lowStockItems.length),
    lowStockItems[0].name
  ]);

  console.log("✅ Low-stock alerts processing completed!");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Low-stock alert worker failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });

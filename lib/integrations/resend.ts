export async function sendEmail(to: string, subject: string, bodyHtml: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith("re_dummy")) {
    console.warn("⚠️ Resend API Key is not configured. Logging simulated email:");
    console.log(`Email Simulation:\nTo: ${to}\nSubject: ${subject}\nContent:\n${bodyHtml}\n-----------------`);
    return { success: false, simulated: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Vision Vistara <no-reply@visionvistara.online>",
        to: [to],
        subject: subject,
        html: bodyHtml
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error response:", data);
      throw new Error(data.message ?? "Failed to send email via Resend");
    }

    console.log(`✅ Email "${subject}" successfully sent to ${to}`);
    return { success: true, emailId: data.id };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: String(error) };
  }
}

interface EmailOrderItem {
  quantity: number;
  unitPricePaise: number;
  productSnapshot: {
    brand?: string;
    name?: string;
    sku?: string;
  };
  lensSnapshot?: {
    name?: string;
  } | null;
}

interface EmailOrder {
  publicId: string;
  customerName: string;
  subtotalPaise: number;
  lensTotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  items: EmailOrderItem[];
}

// Pre-built templates
export function getOrderConfirmationTemplate(order: EmailOrder) {
  const itemsHtml = order.items.map((item: EmailOrderItem) => {
    const snap = item.productSnapshot;
    const lensSnap = item.lensSnapshot;
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
          <strong>${snap.brand} ${snap.name}</strong><br/>
          <small>SKU: ${snap.sku}</small>
          ${lensSnap ? `<br/><small style="color: #0f766e;">Lens: ${lensSnap.name}</small>` : ""}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${(item.unitPricePaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 10px;">Order Confirmation</h2>
      <p>Hello ${order.customerName},</p>
      <p>Thank you for choosing <strong>Vision Vistara</strong>. We have received your order <strong>${order.publicId}</strong> and are processing it.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f6f9fd;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="text-align: right; padding-right: 8px;">
        <p>Subtotal: <strong>${(order.subtotalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong></p>
        <p>Lens Add-ons: <strong>${(order.lensTotalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong></p>
        <p>Shipping: <strong>${(order.shippingPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong></p>
        ${order.discountPaise > 0 ? `<p style="color: #0f766e;">Discount: <strong>-${(order.discountPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong></p>` : ""}
        <h3 style="color: #0f766e;">Total: ${(order.grandTotalPaise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</h3>
      </div>

      <p style="margin-top: 30px;">You can track your order status live at: <a href="${process.env.NEXT_PUBLIC_SITE_URL}/frames/orders/${order.publicId}" style="color: #0f766e; font-weight: bold;">Track Order</a></p>
      <p>For support, click to contact us on <a href="https://wa.me/917842938316" style="color: #25d366; font-weight: bold;">WhatsApp</a>.</p>
      <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0;"/>
      <p style="font-size: 12px; color: #888; text-align: center;">Vision Vistara Optics & Lasers Eye Care. Servicing patient vision across Hyderabad.</p>
    </div>
  `;
}

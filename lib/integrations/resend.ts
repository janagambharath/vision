function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character] ?? character);
}

export async function sendEmail(to: string, subject: string, bodyHtml: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend API key is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Vision Vistara <no-reply@visionvistara.online>",
      to: [to],
      subject,
      html: bodyHtml
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Failed to send email via Resend");
  return { success: true, emailId: data.id };
}

interface EmailOrderItem {
  quantity: number;
  unitPricePaise: number;
  productSnapshot: { brand?: string; name?: string; sku?: string };
  lensSnapshot?: { name?: string } | null;
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

function money(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

export function getOrderConfirmationTemplate(order: EmailOrder) {
  const items = order.items.map((item) => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${escapeHtml(item.productSnapshot.brand)} ${escapeHtml(item.productSnapshot.name)}</strong><br/><small>SKU: ${escapeHtml(item.productSnapshot.sku)}</small>${item.lensSnapshot?.name ? `<br/><small>Lens: ${escapeHtml(item.lensSnapshot.name)}</small>` : ""}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0">${item.quantity}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0">${money(item.unitPricePaise * item.quantity)}</td></tr>`).join("");
  const siteUrl = escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || "https://visionvistara.online");

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b"><h2 style="color:#0f766e">Order received</h2><p>Hello ${escapeHtml(order.customerName)},</p><p>We received order <strong>${escapeHtml(order.publicId)}</strong>. Payment and prescription review (where required) are confirmed separately before dispatch.</p><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px">Item</th><th style="padding:8px">Qty</th><th style="text-align:right;padding:8px">Price</th></tr></thead><tbody>${items}</tbody></table><p style="text-align:right"><strong>Total: ${money(order.grandTotalPaise)}</strong></p><p>Track your order: <a href="${siteUrl}/frames/orders/${encodeURIComponent(order.publicId)}">${escapeHtml(order.publicId)}</a></p></div>`;
}

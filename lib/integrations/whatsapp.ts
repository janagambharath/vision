import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppTemplate(phone: string, templateName: string, parameters: string[]) {
  const numberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!numberId || !token) throw new Error("WhatsApp Cloud API credentials are not configured.");

  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${numberId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [{ type: "body", parameters: parameters.map((text) => ({ type: "text", text })) }]
        }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "Failed to send WhatsApp template");
    console.info(`WhatsApp template ${templateName} sent.`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp template sending failed:", error);
    throw error instanceof Error ? error : new Error("WhatsApp template sending failed.");
  }
}

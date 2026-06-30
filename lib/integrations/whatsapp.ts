import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppTemplate(phone: string, templateName: string, parameters: string[]) {
  const numberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!numberId || !token) {
    console.warn("⚠️ WhatsApp Cloud API credentials are not configured. Logging notification parameters:");
    console.log(`WhatsApp simulation to ${phone} using template "${templateName}" with parameters:`, parameters);
    return { success: false, simulated: true };
  }

  // Clean the phone number (strip non-digits, ensure country code)
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone; // Default to India country code
  }

  try {
    const formattedParams = parameters.map((param) => ({
      type: "text",
      text: param
    }));

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${numberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "en_US"
            },
            components: [
              {
                type: "body",
                parameters: formattedParams
              }
            ]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta WhatsApp Cloud API error:", data);
      throw new Error(data.error?.message ?? "Failed to send WhatsApp template");
    }

    console.log(`✅ WhatsApp template "${templateName}" successfully sent to ${cleanPhone}`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp template sending failed:", error);
    return { success: false, error: String(error) };
  }
}

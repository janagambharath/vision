import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppTemplate(_phone: string, _templateName: string, _parameters: string[]) {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    throw new Error("WhatsApp Cloud API credentials are not configured.");
  }

  throw new Error("WhatsApp template sending is gated until approved template names are configured.");
}

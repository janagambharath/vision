"use client";

import { MessageCircle } from "lucide-react";
import { CLINIC_WHATSAPP_NUMBER } from "@/lib/constants";

export function WhatsAppFloat() {
  const message = encodeURIComponent(
    "Hello Vision Vistara, I would like to enquire about your eye care services."
  );
  const url = `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="whatsapp-float"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="whatsapp-float-label">Chat with us</span>
    </a>
  );
}

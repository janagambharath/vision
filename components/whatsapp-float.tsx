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
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M16 3.2a12.8 12.8 0 0 0-10.97 19.4L3.2 28.8l6.37-1.67A12.8 12.8 0 1 0 16 3.2Zm0 23.26a10.4 10.4 0 0 1-5.3-1.45l-.38-.22-3.78.99 1.01-3.68-.25-.4A10.4 10.4 0 1 1 16 26.46Z" />
      <path fill="currentColor" d="M22.07 18.88c-.33-.17-1.95-.96-2.25-1.07-.3-.11-.52-.17-.74.17-.22.33-.85 1.07-1.04 1.29-.19.22-.38.24-.71.08a8.5 8.5 0 0 1-2.5-1.54 9.35 9.35 0 0 1-1.73-2.15c-.18-.33 0-.51.14-.67.15-.15.33-.38.5-.57.17-.19.22-.33.33-.55.11-.22.06-.41-.03-.57-.08-.17-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.17.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.87.69.79.25 1.51.21 2.08.13.63-.09 1.95-.8 2.22-1.57.27-.77.27-1.43.19-1.57-.08-.14-.3-.22-.63-.38Z" />
    </svg>
  );
}

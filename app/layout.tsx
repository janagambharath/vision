import type { Metadata } from "next";
import "./globals.css";
import { CLINIC_NAME, SITE_URL } from "@/lib/constants";
import { WhatsAppFloat } from "@/components/whatsapp-float";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${CLINIC_NAME} | Eye Clinic and Frames Store`,
    template: `%s | ${CLINIC_NAME}`,
  },
  description:
    "Optometrist-guided prescription eyewear, local frame fitting, and route-confirmed home trials for select Hyderabad customers.",
  openGraph: {
    title: CLINIC_NAME,
    description:
      "Optometrist-guided prescription eyewear and local frame fitting for select Hyderabad customers.",
    url: SITE_URL,
    siteName: CLINIC_NAME,
    images: ["/assets/vision-vistara-hero.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: CLINIC_NAME,
    description:
      "Prescription eyewear guidance and local frame fitting in Hyderabad.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CLINIC_NAME, SITE_URL } from "@/lib/constants";
import { WhatsAppFloat } from "@/components/whatsapp-float";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${CLINIC_NAME} | Eye Clinic and Frames Store`,
    template: `%s | ${CLINIC_NAME}`,
  },
  description:
    "Vision Vistara Optics & Lasers Eye Care combines clinic-first eye care with a dedicated premium optical frames store.",
  openGraph: {
    title: CLINIC_NAME,
    description:
      "Trusted eye consultation, diagnostics, prescription guidance, and a separate Vision Vistara frames store.",
    url: SITE_URL,
    siteName: CLINIC_NAME,
    images: ["/assets/vision-vistara-hero.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: CLINIC_NAME,
    description:
      "Clinic-first eye care and a dedicated frames e-commerce store.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Invalid phone number length" }, { status: 400 });
    }

    // Rate Limit Check
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const rl = await rateLimit(`otp_send:${ip}_${cleanPhone}`, 3, 3600); // 3 requests per phone/IP per hour
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiration

    // Save in DB
    await prisma.otpCode.create({
      data: {
        phone: cleanPhone,
        code,
        expiresAt
      }
    });

    console.log(`🔑 [OTP Code Generated] Phone: ${cleanPhone} Code: ${code}`);

    // Send WhatsApp Alert
    try {
      await sendWhatsAppTemplate(cleanPhone, "otp_verification", [code]);
    } catch (waErr) {
      console.warn("⚠️ Failed to send WhatsApp OTP code. Code printed in console.");
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Failed to generate OTP send:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

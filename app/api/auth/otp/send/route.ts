import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";

const OTP_TTL_MS = 10 * 60 * 1000;

function otpDigest(phone: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
  return crypto.createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const { phone } = await request.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return NextResponse.json({ error: "Invalid phone number length" }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    const [ipLimit, phoneLimit, pairLimit] = await Promise.all([
      rateLimit(`otp-send-ip:${ip}`, 12, 60 * 60),
      rateLimit(`otp-send-phone:${cleanPhone}`, 3, 60 * 60),
      rateLimit(`otp-send-pair:${ip}:${cleanPhone}`, 3, 60 * 60)
    ]);
    if (!ipLimit.allowed || !phoneLimit.allowed || !pairLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
    }

    const code = crypto.randomInt(100000, 1_000_000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.$transaction([
      prisma.otpCode.updateMany({
        where: { phone: cleanPhone, used: false },
        data: { used: true }
      }),
      prisma.otpCode.create({
        data: { phone: cleanPhone, code: otpDigest(cleanPhone, code), expiresAt }
      })
    ]);

    try {
      await sendWhatsAppTemplate(cleanPhone, "otp_verification", [code]);
    } catch (deliveryError) {
      await prisma.otpCode.updateMany({
        where: { phone: cleanPhone, used: false, expiresAt: { gt: new Date() } },
        data: { used: true }
      });
      console.error("OTP delivery failed", deliveryError);
      return NextResponse.json({ error: "Unable to send a verification code. Please try again shortly." }, { status: 503 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Failed to generate OTP send:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

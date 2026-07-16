import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";

const MAX_OTP_ATTEMPTS = 5;

function signPayload(payload: object) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
  const value = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${Buffer.from(value).toString("base64")}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const { phone, code } = await request.json();
    if (!phone || !code || typeof phone !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Phone and six-digit code are required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });

    const limit = await rateLimit(`otp_verify:${cleanPhone}`, MAX_OTP_ATTEMPTS, 10 * 60);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many attempts. Request a new verification code." }, { status: 429 });
    }

    const otp = await prisma.otpCode.findFirst({
      where: {
        phone: cleanPhone,
        used: false,
        attempts: { lt: MAX_OTP_ATTEMPTS },
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
    const expected = crypto.createHmac("sha256", secret).update(`${cleanPhone}:${code}`).digest("hex");
    const stored = otp ? Buffer.from(otp.code, "hex") : null;
    const provided = Buffer.from(expected, "hex");
    const matches = Boolean(stored && stored.length === provided.length && crypto.timingSafeEqual(stored, provided));

    if (!otp || !matches) {
      if (otp) {
        await prisma.otpCode.update({
          where: { id: otp.id },
          data: {
            attempts: { increment: 1 },
            used: otp.attempts + 1 >= MAX_OTP_ATTEMPTS
          }
        });
      }
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    const consumed = await prisma.otpCode.updateMany({
      where: { id: otp.id, used: false },
      data: { used: true }
    });
    if (consumed.count !== 1) return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone: cleanPhone, name: `Customer ${cleanPhone.slice(-4)}` }
      });
    }

    const maxAge = 30 * 24 * 60 * 60;
    const token = signPayload({ userId: user.id, phone: user.phone, expiresAt: Date.now() + maxAge * 1000 });
    const cookieStore = await cookies();
    cookieStore.set("vv_customer_session", token, {
      path: "/",
      httpOnly: true,
      maxAge,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    const cartCookie = cookieStore.get("vv_cart_session")?.value;
    if (cartCookie) {
      await prisma.cart.updateMany({ where: { sessionId: cartCookie }, data: { userId: user.id } });
    }

    return NextResponse.json({ status: "ok", user: { id: user.id, phone: user.phone, name: user.name } });
  } catch (error) {
    console.error("Failed to verify OTP code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

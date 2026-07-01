import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

function signPayload(payload: object) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
  const str = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(str).digest("hex");
  return `${Buffer.from(str).toString("base64")}.${sig}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Find the latest unused code
    const otp = await prisma.otpCode.findFirst({
      where: {
        phone: cleanPhone,
        code,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    // Mark as used
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true }
    });

    // Find or create customer
    let user = await prisma.user.findUnique({
      where: { phone: cleanPhone }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: cleanPhone,
          name: `Customer ${cleanPhone.slice(-4)}`
        }
      });
    }

    // Create session token
    const token = signPayload({ userId: user.id, phone: user.phone });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("vv_customer_session", token, {
      path: "/",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      secure: process.env.NODE_ENV === "production"
    });

    // Check if there is a cart session that can be linked to this user
    const cartCookie = cookieStore.get("vv_cart_session")?.value;
    if (cartCookie) {
      await prisma.cart.updateMany({
        where: { sessionId: cartCookie },
        data: { userId: user.id }
      });
    }

    return NextResponse.json({ status: "ok", user: { id: user.id, phone: user.phone, name: user.name } });
  } catch (error) {
    console.error("Failed to verify OTP code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

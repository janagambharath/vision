import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export interface CustomerSession {
  userId: string;
  phone: string;
  expiresAt: number;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("vv_customer_session")?.value;
  if (!token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const str = Buffer.from(parts[0], "base64").toString("utf8");
    const computedSig = crypto.createHmac("sha256", secret).update(str).digest("hex");
    const expected = Buffer.from(computedSig, "hex");
    const received = Buffer.from(parts[1], "hex");
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

    const payload = JSON.parse(str) as CustomerSession;
    if (!Number.isSafeInteger(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch (err) {
    console.error("Failed to decode customer session cookie:", err);
    return null;
  }
}

export async function getCustomerUser() {
  const session = await getCustomerSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId }
  });
}

export async function setCustomerSession(userId: string, phone: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");

  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const session: CustomerSession = { userId, phone, expiresAt };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = `${payload}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set("vv_customer_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.set("vv_customer_session", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0)
  });
}

import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export interface CustomerSession {
  userId: string;
  phone: string;
  expiresAt: number;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("vv_customer_session")?.value;
  if (token) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
    const parts = token.split(".");
    if (parts.length === 2) {
      try {
        const str = Buffer.from(parts[0], "base64").toString("utf8");
        const computedSig = crypto.createHmac("sha256", secret).update(str).digest("hex");
        const expected = Buffer.from(computedSig, "hex");
        const received = Buffer.from(parts[1], "hex");
        if (expected.length === received.length && crypto.timingSafeEqual(expected, received)) {
          const payload = JSON.parse(str) as CustomerSession;
          if (Number.isSafeInteger(payload.expiresAt) && payload.expiresAt > Date.now()) return payload;
        }
      } catch (err) {
        console.error("Failed to decode customer session cookie:", err);
      }
    }
  }

  const googleSession = await auth();
  const email = googleSession?.user?.email?.trim().toLowerCase();
  if (!googleSession || !email) return null;

  const customer = await prisma.user.findUnique({
    where: { email },
    select: { id: true, phone: true }
  });
  if (!customer) return null;

  const expiresAt = googleSession.expires ? Date.parse(googleSession.expires) : NaN;
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return null;

  return { userId: customer.id, phone: customer.phone ?? "", expiresAt };
}

export async function getCustomerUser() {
  const session = await getCustomerSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId }
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

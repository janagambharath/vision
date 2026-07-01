import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export interface CustomerSession {
  userId: string;
  phone: string;
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
    if (computedSig !== parts[1]) return null;

    return JSON.parse(str) as CustomerSession;
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

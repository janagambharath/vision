import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export interface CustomerSession {
  userId: string;
  phone: string;
  expiresAt: number;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
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

import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin-auth";
import { getCustomerUser } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { prescriptionDownloadUrl } from "@/lib/prescriptions";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerUser().catch(() => null);
  const admin = await getAdminAccess().catch(() => null);
  const isAdmin = Boolean(admin);

  const prescription = await prisma.prescription.findFirst({
    where: isAdmin ? { id } : {
      id,
      OR: [
        ...(customer ? [{ userId: customer.id }] : []),
        ...(customer?.phone ? [{ order: { phone: customer.phone } }] : [])
      ]
    },
    select: { filePublicId: true, fileResourceType: true }
  });
  if (!prescription) return NextResponse.json({ error: "Prescription not found." }, { status: 404 });

  const signedUrl = prescriptionDownloadUrl(prescription);
  if (!signedUrl) {
    return NextResponse.json({ error: "This legacy prescription file must be re-uploaded before it can be safely delivered." }, { status: 410 });
  }
  return NextResponse.redirect(signedUrl);
}

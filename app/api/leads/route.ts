import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildWhatsAppUrl } from "@/lib/integrations/whatsapp";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { leadSchema, normalizePhone } from "@/lib/validations";

function getPayload(formData: FormData) {
  const payload: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^payload\[(.+)\]$/);
    if (match) payload[match[1]] = String(value);
  }
  return payload;
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (await isRateLimited(request, { keyPrefix: "leads", limit: 8, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : (() => {
        return request.formData().then((formData) => ({
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          source: String(formData.get("source") ?? "website"),
          intent: String(formData.get("intent") ?? ""),
          payload: getPayload(formData)
        }));
      })();

  const parsed = leadSchema.safeParse(await data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead data" }, { status: 400 });
  }
  const customerPhone = normalizePhone(parsed.data.phone);

  let leadId: string;
  try {
    const lead = await prisma.lead.create({
      data: {
        name: parsed.data.name,
        phone: customerPhone,
        email: parsed.data.email || null,
        source: parsed.data.source,
        intent: parsed.data.intent,
        payload: (parsed.data.payload ?? {}) as Prisma.InputJsonValue
      }
    });
    leadId = lead.id;
  } catch {
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/contact?error=lead-not-saved", request.url), 303);
    }
    return NextResponse.json({ error: "Lead could not be saved" }, { status: 503 });
  }

  const message = [
    "Hello Vision Vistara Optics & Lasers Eye Care,",
    `Request: ${parsed.data.intent || "Website lead"}`,
    `Name: ${parsed.data.name}`,
    `Phone: ${customerPhone}`,
    parsed.data.payload ? `Details: ${JSON.stringify(parsed.data.payload)}` : ""
  ].filter(Boolean).join("\n");

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(buildWhatsAppUrl(message), 303);
  }

  return NextResponse.json({ ok: true, leadId, whatsappUrl: buildWhatsAppUrl(message) });
}

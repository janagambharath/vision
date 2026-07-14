import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

type AccessPurpose = "checkout" | "tracking";

type AccessPayload = {
  orderPublicId: string;
  purpose: AccessPurpose;
  expiresAt: number;
};

function signingSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET in environment variables");
  return secret;
}

function cookieName(purpose: AccessPurpose) {
  return purpose === "checkout" ? "vv_checkout_access" : "vv_order_access";
}

function signatureFor(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

function signaturesMatch(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function createOrderAccessToken(orderPublicId: string, purpose: AccessPurpose, maxAgeSeconds: number) {
  const payload = Buffer.from(JSON.stringify({
    orderPublicId,
    purpose,
    expiresAt: Date.now() + maxAgeSeconds * 1000
  } satisfies AccessPayload)).toString("base64url");

  return `${payload}.${signatureFor(payload)}`;
}

export function verifyOrderAccessToken(token: string | undefined, orderPublicId: string, purpose: AccessPurpose) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !signaturesMatch(signatureFor(payload), signature)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccessPayload;
    return (
      parsed.orderPublicId === orderPublicId &&
      parsed.purpose === purpose &&
      Number.isSafeInteger(parsed.expiresAt) &&
      parsed.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function hasOrderAccess(orderPublicId: string, purpose: AccessPurpose) {
  const cookieStore = await cookies();
  return verifyOrderAccessToken(cookieStore.get(cookieName(purpose))?.value, orderPublicId, purpose);
}

export async function grantOrderAccess(orderPublicId: string, purpose: AccessPurpose, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName(purpose), createOrderAccessToken(orderPublicId, purpose, maxAgeSeconds), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds
  });
}

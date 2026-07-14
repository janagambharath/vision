import { createHash } from "node:crypto";

export type ShiprocketFailureKind = "REJECTED" | "UNKNOWN" | "DUPLICATE_ORDER";

/**
 * A deterministic provider reference prevents retry attempts from creating a
 * second Shiprocket order. Shiprocket limits merchant order IDs to 20 chars,
 * while Vision Vistara public order IDs are longer than that.
 */
export function getShiprocketOrderReference(publicOrderId: string) {
  return `VV${createHash("sha256").update(publicOrderId).digest("hex").slice(0, 18).toUpperCase()}`;
}

export class ShiprocketRequestError extends Error {
  constructor(
    message: string,
    public readonly kind: ShiprocketFailureKind,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ShiprocketRequestError";
  }
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { message?: unknown; error?: unknown; errors?: unknown };
  if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message.trim();
  if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error.trim();
  if (Array.isArray(candidate.errors)) return candidate.errors.map(String).join(", ") || fallback;
  return fallback;
}

function isDuplicateOrderError(message: string) {
  return /already\s+(exists|exist)|duplicate|same\s+order|order.{0,40}\b(exists|exist)\b/i.test(message);
}

async function readJsonResponse(response: Response, fallback: string) {
  try {
    return await response.json() as unknown;
  } catch {
    throw new ShiprocketRequestError(
      `${fallback}: Shiprocket returned an unreadable response.`,
      "UNKNOWN",
      response.status
    );
  }
}

function classifyResponseError(response: Response, payload: unknown, fallback: string): ShiprocketRequestError {
  const message = messageFromPayload(payload, fallback);
  if (response.status >= 500 || response.status === 429) {
    return new ShiprocketRequestError(message, "UNKNOWN", response.status);
  }
  if (isDuplicateOrderError(message)) {
    return new ShiprocketRequestError(message, "DUPLICATE_ORDER", response.status);
  }
  return new ShiprocketRequestError(message, "REJECTED", response.status);
}

export async function getShiprocketToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new ShiprocketRequestError("Shiprocket credentials are not configured.", "REJECTED");
  }

  let response: Response;
  try {
    response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  } catch {
    throw new ShiprocketRequestError("Shiprocket authentication request could not be confirmed.", "UNKNOWN");
  }

  const data = await readJsonResponse(response, "Shiprocket authentication failed") as { token?: unknown };
  if (response.ok && (typeof data.token !== "string" || !data.token)) {
    throw new ShiprocketRequestError("Shiprocket authentication response could not be confirmed.", "UNKNOWN", response.status);
  }
  if (!response.ok) {
    throw classifyResponseError(response, data, "Shiprocket authentication failed.");
  }
  return data.token;
}

export interface ShiprocketAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  pincode: string;
}

export interface ShiprocketOrderItem {
  quantity: number;
  unitPricePaise: number;
  productSnapshot: unknown;
}

export interface ShiprocketOrder {
  publicId: string;
  customerName: string;
  phone: string;
  email: string | null;
  shippingAddress: ShiprocketAddress | null;
  items: ShiprocketOrderItem[];
  grandTotalPaise: number;
  paymentMethod: string;
}

export function buildShiprocketShipmentPayload(order: ShiprocketOrder) {
  if (!order.shippingAddress) {
    throw new ShiprocketRequestError("A shipping address is required before creating a Shiprocket shipment.", "REJECTED");
  }
  if (!order.email) {
    throw new ShiprocketRequestError("A customer email is required for Shiprocket shipment creation.", "REJECTED");
  }

  const address = order.shippingAddress;
  const items = order.items.map((item) => {
    const snapshot = (item.productSnapshot as Record<string, unknown>) || {};
    return {
      name: String(snapshot.name ?? "Optical Frame"),
      sku: String(snapshot.sku ?? "VV-FRAME"),
      units: item.quantity,
      selling_price: item.unitPricePaise / 100
    };
  });

  const customerName = address.name || order.customerName;
  const customerPhone = address.phone || order.phone;
  const customerState = address.state || "Telangana";
  const customerCountry = "India";
  const providerOrderReference = getShiprocketOrderReference(order.publicId);

  return {
    // A provider retry uses this exact value. Shiprocket rejects duplicate
    // merchant order IDs without changing the existing provider order.
    order_id: providerOrderReference,
    order_date: new Date().toISOString().replace("T", " ").slice(0, 16),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Vision Vistara Clinic",
    billing_customer_name: customerName,
    billing_last_name: "",
    billing_address: address.line1,
    billing_address_2: address.line2 || "",
    billing_city: address.city,
    billing_pincode: address.pincode,
    billing_state: customerState,
    billing_country: customerCountry,
    billing_email: order.email,
    billing_phone: customerPhone,
    // Vision Vistara currently captures only one delivery/billing address.
    shipping_is_billing: true,
    shipping_customer_name: customerName,
    shipping_last_name: "",
    shipping_address: address.line1,
    shipping_address_2: address.line2 || "",
    shipping_city: address.city,
    shipping_pincode: address.pincode,
    shipping_state: customerState,
    shipping_country: customerCountry,
    shipping_email: order.email,
    shipping_phone: customerPhone,
    order_items: items,
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.grandTotalPaise / 100,
    length: 15,
    breadth: 10,
    height: 5,
    weight: 0.3
  };
}

export async function createShiprocketShipment(order: ShiprocketOrder) {
  const payload = buildShiprocketShipmentPayload(order);
  const token = await getShiprocketToken();

  let response: Response;
  try {
    response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // A network failure after a POST is ambiguous: never blindly retry it.
    throw new ShiprocketRequestError("Shiprocket shipment creation could not be confirmed.", "UNKNOWN");
  }

  const data = await readJsonResponse(response, "Shiprocket shipment creation failed") as { shipment_id?: unknown };
  if (response.ok && !data.shipment_id) {
    throw new ShiprocketRequestError("Shiprocket accepted an unreadable shipment response.", "UNKNOWN", response.status);
  }
  if (!response.ok) {
    throw classifyResponseError(response, data, "Shiprocket shipment creation failed.");
  }
  return { success: true as const, shipmentId: String(data.shipment_id), rawPayload: data };
}

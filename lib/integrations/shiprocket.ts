export async function getShiprocketToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) throw new Error("Shiprocket credentials are not configured.");

  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok || !data.token) throw new Error(data.message ?? "Shiprocket authentication failed.");
  return data.token as string;
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
  shippingAddress: ShiprocketAddress | null;
  items: ShiprocketOrderItem[];
  grandTotalPaise: number;
  paymentMethod: string;
}

export async function createShiprocketShipment(order: ShiprocketOrder) {
  if (!order.shippingAddress) throw new Error("A shipping address is required before creating a Shiprocket shipment.");
  const token = await getShiprocketToken();
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

  const response = await fetch("https://apiv2.shiprocket.in/v1/external/shipments/create/adhoc", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: order.publicId,
      pickup_location: "Vision Vistara Clinic",
      shipping_customer_name: address.name || order.customerName,
      shipping_last_name: "",
      shipping_address: `${address.line1}${address.line2 ? ` ${address.line2}` : ""}`,
      shipping_city: address.city,
      shipping_pincode: address.pincode,
      shipping_state: address.state || "Telangana",
      shipping_country: "India",
      shipping_phone: address.phone || order.phone,
      order_items: items,
      payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      sub_total: order.grandTotalPaise / 100,
      length: 15,
      width: 10,
      height: 5,
      weight: 0.3
    })
  });
  const data = await response.json();
  if (!response.ok || !data.shipment_id) throw new Error(data.message ?? "Shiprocket shipment creation failed.");
  return { success: true as const, shipmentId: String(data.shipment_id), rawPayload: data };
}

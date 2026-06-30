export async function getShiprocketToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password || email.includes("dummy")) {
    console.warn("⚠️ Shiprocket credentials not configured.");
    return null;
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data.token ?? null;
  } catch (err) {
    console.error("Failed to authenticate with Shiprocket:", err);
    return null;
  }
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
  const token = await getShiprocketToken();
  if (!token) {
    console.log("Simulating Shiprocket order shipment placement for:", order.publicId);
    return { success: true, simulated: true, shipmentId: `sim-ship-${order.publicId}` };
  }

  const shippingAddress = order.shippingAddress;
  const addr1 = shippingAddress?.line1 ?? "Clinic Address";
  const addr2 = shippingAddress?.line2 ? ` ${shippingAddress.line2}` : "";

  const orderItems = order.items.map((item) => {
    const snap = (item.productSnapshot as Record<string, unknown>) || {};
    return {
      name: String(snap.name ?? "Optical Frame"),
      sku: String(snap.sku ?? "VV-FRAME"),
      units: item.quantity,
      selling_price: item.unitPricePaise / 100
    };
  });

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/shipments/create/adhoc", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: order.publicId,
        pickup_location: "Vision Vistara Clinic",
        shipping_customer_name: shippingAddress?.name ?? order.customerName,
        shipping_last_name: "",
        shipping_address: `${addr1}${addr2}`,
        shipping_city: shippingAddress?.city ?? "Hyderabad",
        shipping_pincode: shippingAddress?.pincode ?? "500001",
        shipping_state: shippingAddress?.state ?? "Telangana",
        shipping_country: "India",
        shipping_phone: shippingAddress?.phone ?? order.phone,
        order_items: orderItems,
        payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
        sub_total: order.grandTotalPaise / 100,
        length: 15,
        width: 10,
        height: 5,
        weight: 0.3
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Shiprocket shipment failure response:", data);
      throw new Error(data.message ?? "Shiprocket placement failed");
    }

    console.log(`✅ Shiprocket order created successfully:`, data);
    return { success: true, shipmentId: data.shipment_id };
  } catch (err) {
    console.error("Failed to create Shiprocket shipment:", err);
    return { success: false, error: String(err) };
  }
}

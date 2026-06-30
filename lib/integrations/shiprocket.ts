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

export async function createShiprocketShipment(orderId: string) {
  const token = await getShiprocketToken();
  if (!token) {
    console.log("Simulating Shiprocket order shipment placement for database record:", orderId);
    return { success: false, simulated: true, shipmentId: `sim-ship-${orderId}` };
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/shipments/create/adhoc", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: orderId,
        pickup_location: "Vision Vistara Clinic",
        shipping_customer_name: "Customer Name",
        shipping_last_name: "",
        shipping_address: "Clinic Address",
        shipping_city: "Hyderabad",
        shipping_pincode: "500001",
        shipping_state: "Telangana",
        shipping_country: "India",
        shipping_phone: "7842938316",
        order_items: [{ name: "Optical Frame", sku: "VV-FRAME", units: 1, selling_price: 1500 }],
        payment_method: "Prepaid",
        sub_total: 1500,
        length: 15,
        width: 10,
        height: 5,
        weight: 0.3
      })
    });

    const data = await res.json();
    console.log(`✅ Shiprocket order created:`, data);
    return { success: true, shipmentId: data.shipment_id };
  } catch (err) {
    console.error("Failed to create Shiprocket shipment:", err);
    return { success: false, error: String(err) };
  }
}

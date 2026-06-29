export async function createShiprocketShipment(_orderId: string) {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
    throw new Error("Shiprocket credentials are not configured.");
  }

  throw new Error("Shiprocket shipment creation is intentionally gated until live carrier rules are confirmed.");
}

const PINCODE_PATTERN = /^\d{6}$/;

function configuredPincodes() {
  return new Set(
    (process.env.LOCAL_SERVICE_PINCODES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => PINCODE_PATTERN.test(value))
  );
}

/**
 * Local launch deliveries are deliberately fail-closed. A
 * city name is not a service area: staff need an explicit, maintained pincode
 * list before accepting a visit or a COD delivery.
 */
export function isLocalPincodeServiceable(pincode: string) {
  return configuredPincodes().has(pincode.trim());
}

export function localServiceabilityMessage() {
  return "Delivery is currently available only in selected Hyderabad pincodes. Please contact Vision Vistara on WhatsApp if your area is not listed.";
}

export function hasConfiguredLocalServicePincodes() {
  return configuredPincodes().size > 0;
}

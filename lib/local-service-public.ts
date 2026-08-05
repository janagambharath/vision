// Safe for server and client components. This names the advertised launch
// area; the actual pincode allowlist remains server-only in local-service.ts.
export const LOCAL_SERVICE_AREA_LABEL =
  process.env.NEXT_PUBLIC_HYDERABAD_SERVICE_AREA_LABEL?.trim() ||
  "Hyderabad and select nearby serviceable pincodes";

export const LOCAL_DELIVERY_PROMISE = "1–3 business days after COD confirmation";
export const LOCAL_HOME_TRIAL_PROMISE = "Available in select Hyderabad neighbourhoods after route confirmation";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://visionvistara.online";
export const CLINIC_PHONE = "7842938316";
export const CLINIC_WHATSAPP_NUMBER = "917842938316";
export const STORE_NAME = "Vision Vistara Frames";
export const CLINIC_NAME = "Vision Vistara Optics & Lasers Eye Care";
export const CART_COOKIE = "vv_cart_session";
export const HOME_TRIAL_SERVICE_FEE_PAISE = 19900;
export const HOME_TRIAL_DEPOSIT_PAISE = 50000;
export const MAX_HOME_TRIAL_FRAMES = 5;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  TRY_AT_HOME_BOOKED: "Try-at-home booked",
  AWAITING_PRESCRIPTION: "Awaiting prescription",
  LENS_IN_PROCESSING: "Lens in processing"
};

import { StoreProduct, LensPackage } from "@/lib/inventory";

export type CheckoutCartItem = {
  id: string;
  product: StoreProduct;
  quantity: number;
  lensOption: LensPackage | null;
};

export type CheckoutCart = {
  id: string;
  items: CheckoutCartItem[];
};

export type CheckoutTotals = {
  subtotalPaise: number;
  lensTotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
};

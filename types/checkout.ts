export type CheckoutCartItem = {
  id: string;
  product: {
    slug: string;
    sku: string;
    name: string;
    brand: string;
    pricePaise: number | null;
    images: Array<{
      url: string;
      alt: string;
      role: string;
      sortOrder: number;
    }>;
  };
  quantity: number;
  lensOption: {
    code: string;
    name: string;
    description: string;
    pricePaise: number | null;
    active: boolean;
    requiresPrescription: boolean;
  } | null;
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

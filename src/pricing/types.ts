/** What the configurator sends to the pricing service: choices and counts, never the artwork. */
export interface QuoteRequest {
  productId: string;
  variantId: number;
  quantity: number;
  customization: {
    printedPanels: number;
    customColours: number;
    imageLayers: number;
    textLayers: number;
  };
}

export interface PriceLine {
  id: string;
  kind: 'base' | 'customization' | 'discount';
  label: string;
  unitAmount: number;
  quantity: number;
  /** Negative for discounts. */
  amount: number;
  /** The Shopify variant that carries this line in the cart, if any. */
  shopifyVariantId?: number;
}

export interface PriceQuote {
  quoteId: string;
  currency: string;
  lines: PriceLine[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
}

/** Anything that can price a configuration: the local mock or a real API. */
export interface PricingService {
  getQuote(request: QuoteRequest, signal?: AbortSignal): Promise<PriceQuote>;
}

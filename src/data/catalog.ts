// Mock Shopify catalogue. In a real store these ids and prices come from Shopify
// (Storefront API or the product JSON). Prices are in INR and are modelled on the
// reference store, where the 10 x 10 ft tent costs Rs. 80,700 with a frame.

export interface Variant {
  id: number;
  sizeId: string;
  frame: string;
  title: string;
  sku: string;
  price: number;
}

export interface Fee {
  /** Hidden "customisation fee" product variant that is added to the cart. */
  variantId: number;
  label: string;
  amount: number;
}

export const CATALOG = {
  currency: 'INR',
  productId: 'custom-canopy-tent',
  productTitle: 'Custom Canopy Tent',
  variants: [
    { id: 45010000001, sizeId: '5x5', frame: 'frame', title: '5 x 5 ft / Canopy + frame', sku: 'TENT-5-FR', price: 46900 },
    { id: 45010000002, sizeId: '5x5', frame: 'canopy-only', title: '5 x 5 ft / Canopy only', sku: 'TENT-5-CO', price: 27500 },
    { id: 45010000003, sizeId: '6.5x6.5', frame: 'frame', title: '6.5 x 6.5 ft / Canopy + frame', sku: 'TENT-65-FR', price: 56400 },
    { id: 45010000004, sizeId: '6.5x6.5', frame: 'canopy-only', title: '6.5 x 6.5 ft / Canopy only', sku: 'TENT-65-CO', price: 33900 },
    { id: 45010000005, sizeId: '8x8', frame: 'frame', title: '8 x 8 ft / Canopy + frame', sku: 'TENT-8-FR', price: 66800 },
    { id: 45010000006, sizeId: '8x8', frame: 'canopy-only', title: '8 x 8 ft / Canopy only', sku: 'TENT-8-CO', price: 41600 },
  ] satisfies Variant[],
  fees: {
    /** Per printed panel, per tent. */
    printedPanel: { variantId: 45020000001, label: 'Printed panel', amount: 1500 } satisfies Fee,
    /** Once per order, per custom (non-standard) colour. */
    colourMatch: { variantId: 45020000002, label: 'Custom colour match', amount: 750 } satisfies Fee,
    /** Once per order, per uploaded image after the included ones. */
    artworkSetup: { variantId: 45020000003, label: 'Extra artwork setup', amount: 500 } satisfies Fee,
  },
  includedImages: 2,
  /** Discount on the per-tent price, highest matching tier wins. */
  quantityTiers: [
    { minQuantity: 10, percent: 15 },
    { minQuantity: 5, percent: 10 },
    { minQuantity: 3, percent: 5 },
  ],
};

export function findVariant(sizeId: string, frame: string): Variant {
  return (
    CATALOG.variants.find((v) => v.sizeId === sizeId && v.frame === frame) ?? CATALOG.variants[0]
  );
}

export function findVariantById(id: number): Variant | undefined {
  return CATALOG.variants.find((v) => v.id === id);
}
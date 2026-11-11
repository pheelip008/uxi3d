import { findVariant } from '../data/catalog.ts';
import { describeColour } from '../data/pantone.ts';
import { getFrameLabel, getSize } from '../data/tent.ts';
import { isEmbedded, postToParent, waitForCartUpdate } from '../embed/bridge.ts';
import { createId } from '../lib/ids.ts';
import type { PriceQuote } from '../pricing/types.ts';
import type { DesignConfig } from '../types.ts';

// Same shape as the body of Shopify's AJAX cart API: POST /cart/add.js
export interface CartLineItem {
  id: number;
  quantity: number;
  /** Line item properties. Keys starting with "_" are hidden from the customer at checkout. */
  properties: Record<string, string>;
}

export interface CartPayload {
  items: CartLineItem[];
}

export function buildCartPayload(config: DesignConfig, quote: PriceQuote, quantity: number): CartPayload {
  const size = getSize(config.sizeId);
  const variant = findVariant(config.sizeId, config.frame);
  const printed = size.sections.filter((s) => config.layers.some((l) => l.sectionId === s.id));
  const texts = config.layers.flatMap((l) => (l.type === 'text' ? [l.text.replace(/\n/g, ' ')] : []));

  const tent: CartLineItem = {
    id: variant.id,
    quantity,
    properties: {
      'Design ID': config.id,
      Size: size.label,
      Frame: getFrameLabel(config.frame),
      'Printed panels': printed.map((s) => s.label).join(', ') || 'None',
      'Panel colours': size.sections
        .map((s) => `${s.label} ${describeColour(config.sections[s.id])}`)
        .join(', '),
      ...(texts.length > 0 && { Text: texts.join(' | ') }),
      _configuration_id: config.id,
      _configuration_updated_at: config.updatedAt,
      _quote_id: quote.quoteId,
      _quoted_total: String(quote.total),
    },
  };

  // Customisation fees travel as hidden fee products, tied to the tent by the design ID.
  const fees: CartLineItem[] = quote.lines
    .filter((line) => line.kind === 'customization' && line.shopifyVariantId)
    .map((line) => ({
      id: line.shopifyVariantId!,
      quantity: line.quantity,
      properties: { _configuration_id: config.id, _fee: line.label },
    }));

  return { items: [tent, ...fees] };
}

export interface AddToCartResult {
  mode: 'store' | 'demo';
  message: string;
}

const DEMO_CART_KEY = 'tent-configurator:demo-cart';

/**
 * Inside a store page (iframe) the page adds the items to its Shopify cart.
 * Opened on its own, the configurator keeps a demo cart in this browser instead.
 */
export async function addToCart(input: {
  payload: CartPayload;
  design: DesignConfig;
  quote: PriceQuote;
  productionPdf: Blob;
}): Promise<AddToCartResult> {
  if (isEmbedded) {
    const requestId = createId('req');
    const sent = postToParent({ type: 'CONFIGURATOR_ADD_TO_CART', requestId, ...input });
    if (!sent) throw new Error('This page is not allowed to talk to the store (missing parent_origin).');
    const answer = await waitForCartUpdate(requestId);
    if (!answer.ok) throw new Error(answer.message ?? 'The store could not add this tent to the cart.');
    return { mode: 'store', message: answer.message ?? 'Added to your cart.' };
  }

  try {
    const cart = JSON.parse(localStorage.getItem(DEMO_CART_KEY) ?? '[]') as CartLineItem[];
    localStorage.setItem(DEMO_CART_KEY, JSON.stringify([...cart, ...input.payload.items]));
  } catch {
    // The demo cart is only a convenience.
  }
  return { mode: 'demo', message: 'Added to the demo cart.' };
}

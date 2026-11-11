import type { PriceQuote } from '../pricing/types.ts';
import type { CartPayload } from '../shopify/cart.ts';
import type { DesignConfig } from '../types.ts';

// postMessage contract between the configurator (in an iframe) and the store page.
//
// Store page embeds:  <iframe src="https://<app>/?parent_origin=https://shop.example&variant_id=45010000005">
// Configurator sends: CONFIGURATOR_READY, CONFIGURATOR_ADD_TO_CART, CONFIGURATOR_CLOSE
// Store page answers: CONFIGURATOR_CART_UPDATED (with the same requestId)

export type OutgoingMessage =
  | { type: 'CONFIGURATOR_READY'; version: 1 }
  | {
      type: 'CONFIGURATOR_ADD_TO_CART';
      requestId: string;
      payload: CartPayload;
      design: DesignConfig;
      quote: PriceQuote;
      productionPdf: Blob;
    }
  | { type: 'CONFIGURATOR_CLOSE' };

export interface CartUpdatedMessage {
  type: 'CONFIGURATOR_CART_UPDATED';
  requestId: string;
  ok: boolean;
  message?: string;
}

export const isEmbedded = window.parent !== window;

/** Only https pages (or localhost while developing) may talk to us. Never "*". */
function toTrustedOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return url.protocol === 'https:' || local ? url.origin : null;
  } catch {
    return null;
  }
}

export const parentOrigin = isEmbedded
  ? toTrustedOrigin(new URLSearchParams(window.location.search).get('parent_origin') ?? document.referrer)
  : null;

export function postToParent(message: OutgoingMessage): boolean {
  if (!isEmbedded || !parentOrigin) return false;
  window.parent.postMessage(message, parentOrigin);
  return true;
}

/** Wait for the store page to confirm a request. Messages from anywhere else are ignored. */
export function waitForCartUpdate(requestId: string, timeoutMs = 10_000): Promise<CartUpdatedMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('The store did not answer. Please try again.'));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== parentOrigin) return;
      const data = event.data as Partial<CartUpdatedMessage> | null;
      if (data?.type !== 'CONFIGURATOR_CART_UPDATED' || data.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(data as CartUpdatedMessage);
    }

    window.addEventListener('message', onMessage);
  });
}

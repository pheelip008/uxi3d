import { calculateQuote } from './engine.ts';
import type { PriceQuote, PricingService, QuoteRequest } from './types.ts';

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** Runs the pricing rules in the browser, with a small delay so it behaves like a network call. */
export function createMockPricingService(latencyMs = 250): PricingService {
  return {
    async getQuote(request: QuoteRequest, signal?: AbortSignal): Promise<PriceQuote> {
      await wait(latencyMs, signal);
      return calculateQuote(request);
    },
  };
}

/** Talks to a real pricing API: POST {baseUrl}/quote with a QuoteRequest, returns a PriceQuote. */
export function createHttpPricingService(baseUrl: string): PricingService {
  return {
    async getQuote(request: QuoteRequest, signal?: AbortSignal): Promise<PriceQuote> {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
      if (!response.ok) throw new Error(`Pricing API answered ${response.status}`);
      return (await response.json()) as PriceQuote;
    },
  };
}

// Set VITE_PRICING_API_URL to use a real API; without it the mock is used.
const apiUrl: string | undefined = import.meta.env.VITE_PRICING_API_URL;

export const pricingService: PricingService = apiUrl
  ? createHttpPricingService(apiUrl)
  : createMockPricingService();

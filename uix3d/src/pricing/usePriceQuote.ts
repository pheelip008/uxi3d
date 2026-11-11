import { useEffect, useState } from 'react';
import { pricingService } from './service.ts';
import type { PriceQuote, QuoteRequest } from './types.ts';

interface QuoteResult {
  /** Which request this answer belongs to. */
  key: string | null;
  quote: PriceQuote | null;
  error: string | null;
}

/**
 * Ask the pricing service for a quote whenever the priced choices change.
 * Waits a moment while the user is still clicking and ignores out-of-date answers.
 */
export function usePriceQuote(request: QuoteRequest) {
  const [result, setResult] = useState<QuoteResult>({ key: null, quote: null, error: null });
  // Moving artwork around creates a new request object but the same JSON, so no refetch.
  const key = JSON.stringify(request);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      pricingService
        .getQuote(JSON.parse(key) as QuoteRequest, controller.signal)
        .then((quote) => setResult({ key, quote, error: null }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : 'Pricing failed';
          setResult((r) => ({ ...r, key, error: message }));
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  // Until the answer for the current choices arrives we still show the last price, dimmed.
  return { quote: result.quote, error: result.error, loading: result.key !== key };
}

import { describe, expect, it } from 'vitest';
import { CATALOG } from '../data/catalog.ts';
import { calculateQuote } from './engine.ts';
import type { QuoteRequest } from './types.ts';

function request(overrides: Partial<QuoteRequest['customization']> = {}, quantity = 1): QuoteRequest {
  return {
    productId: 'custom-canopy-tent',
    variantId: 45010000005, // 8 x 8 ft with frame, Rs. 66,800
    quantity,
    customization: { printedPanels: 0, customColours: 0, imageLayers: 0, textLayers: 0, ...overrides },
  };
}

describe('calculateQuote', () => {
  it('charges only the variant price for a plain tent', () => {
    const quote = calculateQuote(request());
    expect(quote.total).toBe(66800);
    expect(quote.lines).toHaveLength(1);
  });

  it('gives each variant its own price', () => {
    const canopyOnly = calculateQuote({ ...request(), variantId: 45010000006 });
    expect(canopyOnly.total).toBe(41600);
  });

  it('adds printing per panel and per tent', () => {
    const quote = calculateQuote(request({ printedPanels: 3 }, 2));
    expect(quote.total).toBe(2 * 66800 + 3 * 2 * CATALOG.fees.printedPanel.amount);
  });

  it('charges colour matching and extra artwork once per order', () => {
    const quote = calculateQuote(request({ customColours: 2, imageLayers: 3 }, 2));
    const setup = 2 * CATALOG.fees.colourMatch.amount + 1 * CATALOG.fees.artworkSetup.amount;
    expect(quote.total).toBe(2 * 66800 + setup);
  });

  it('applies the best volume discount to the per-tent price only', () => {
    const quote = calculateQuote(request({ printedPanels: 1, customColours: 1 }, 5));
    const perTent = 5 * (66800 + 1500);
    expect(quote.discount).toBe(Math.round(perTent * 0.1));
    expect(quote.total).toBe(perTent + 750 - quote.discount);
  });

  it('rejects unknown variants', () => {
    expect(() => calculateQuote({ ...request(), variantId: 1 })).toThrow('Unknown variant');
  });
});

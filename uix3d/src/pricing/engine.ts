import { CATALOG, findVariant } from '../data/catalog.ts';
import { isStandardColour } from '../data/tent.ts';
import type { DesignConfig } from '../types.ts';
import type { PriceLine, PriceQuote, QuoteRequest } from './types.ts';

/** Turn a design into the small summary the pricing service needs. */
export function buildQuoteRequest(config: DesignConfig, quantity: number): QuoteRequest {
  const printed = new Set(config.layers.filter((l) => l.opacity > 0).map((l) => l.sectionId));
  const customColours = new Set(
    Object.values(config.sections)
      .map((s) => s.color.toLowerCase())
      .filter((hex) => !isStandardColour(hex)),
  );
  return {
    productId: config.productId,
    variantId: findVariant(config.sizeId, config.frame).id,
    quantity,
    customization: {
      printedPanels: printed.size,
      customColours: customColours.size,
      imageLayers: config.layers.filter((l) => l.type === 'image').length,
      textLayers: config.layers.filter((l) => l.type === 'text').length,
    },
  };
}

/**
 * The pricing rules. Pure function, so the mock service, a real backend and the
 * unit tests can all use the same code.
 */
export function calculateQuote(request: QuoteRequest, catalog = CATALOG): PriceQuote {
  const variant = catalog.variants.find((v) => v.id === request.variantId);
  if (!variant) throw new Error(`Unknown variant ${request.variantId}`);

  const quantity = Math.max(1, Math.floor(request.quantity));
  const { printedPanels, customColours, imageLayers } = request.customization;
  const { printedPanel, colourMatch, artworkSetup } = catalog.fees;
  const lines: PriceLine[] = [];

  const add = (line: Omit<PriceLine, 'amount'>) =>
    lines.push({ ...line, amount: line.unitAmount * line.quantity });

  // Per tent: the variant price plus printing.
  add({
    id: 'base',
    kind: 'base',
    label: variant.title,
    unitAmount: variant.price,
    quantity,
    shopifyVariantId: variant.id,
  });
  if (printedPanels > 0) {
    add({
      id: 'printed-panels',
      kind: 'customization',
      label: `${printedPanel.label} x ${printedPanels}`,
      unitAmount: printedPanel.amount,
      quantity: printedPanels * quantity,
      shopifyVariantId: printedPanel.variantId,
    });
  }
  const perTentTotal = lines.reduce((sum, l) => sum + l.amount, 0);

  // Once per order: setup work.
  if (customColours > 0) {
    add({
      id: 'colour-match',
      kind: 'customization',
      label: colourMatch.label,
      unitAmount: colourMatch.amount,
      quantity: customColours,
      shopifyVariantId: colourMatch.variantId,
    });
  }
  const extraImages = Math.max(0, imageLayers - catalog.includedImages);
  if (extraImages > 0) {
    add({
      id: 'artwork-setup',
      kind: 'customization',
      label: artworkSetup.label,
      unitAmount: artworkSetup.amount,
      quantity: extraImages,
      shopifyVariantId: artworkSetup.variantId,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);

  // Volume discount on the per-tent part only.
  const tier = catalog.quantityTiers.find((t) => quantity >= t.minQuantity);
  const discount = tier ? Math.round((perTentTotal * tier.percent) / 100) : 0;
  if (tier) {
    lines.push({
      id: 'volume-discount',
      kind: 'discount',
      label: `${tier.percent}% off for ${tier.minQuantity}+ tents`,
      unitAmount: -discount,
      quantity: 1,
      amount: -discount,
    });
  }

  return {
    quoteId: `q_${Date.now().toString(36)}`,
    currency: catalog.currency,
    lines,
    subtotal,
    discount,
    total: subtotal - discount,
    createdAt: new Date().toISOString(),
  };
}

import { useEffect, useMemo, useState } from 'react';
import { designCanvas, renderSurfaceNow } from '../lib/designSurface.ts';
import { downloadBlob, formatMoney } from '../lib/format.ts';
import { previewBridge } from '../lib/previewBridge.ts';
import { buildQuoteRequest } from '../pricing/engine.ts';
import type { PriceQuote } from '../pricing/types.ts';
import { usePriceQuote } from '../pricing/usePriceQuote.ts';
import { addToCart, buildCartPayload, type AddToCartResult, type CartPayload } from '../shopify/cart.ts';
import { useDesignStore } from '../store/designStore.ts';

async function makeProductionPdf(quote: PriceQuote): Promise<Blob> {
  const { config, quantity } = useDesignStore.getState();
  renderSurfaceNow(); // make sure the texture shows the latest edit
  const views = previewBridge.capture(['front', 'right', 'back', 'left']);
  const layout = designCanvas.toDataURL('image/jpeg', 0.92);
  const { createProductionPdf } = await import('../pdf/productionPdf.ts');
  return createProductionPdf({ config, quote, quantity, views, layout });
}

interface CartDone extends AddToCartResult {
  payload: CartPayload;
  pdfUrl: string;
}

export function PriceBar() {
  const config = useDesignStore((s) => s.config);
  const quantity = useDesignStore((s) => s.quantity);
  const setQuantity = useDesignStore((s) => s.setQuantity);
  const request = useMemo(() => buildQuoteRequest(config, quantity), [config, quantity]);
  const { quote, loading, error } = usePriceQuote(request);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'cart' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState<CartDone | null>(null);

  // Free the PDF link when the dialog closes.
  useEffect(() => () => {
    if (done) URL.revokeObjectURL(done.pdfUrl);
  }, [done]);

  const stale = loading || !quote;

  async function handleDownloadPdf() {
    if (!quote) return;
    setBusy('pdf');
    setActionError(null);
    try {
      downloadBlob(await makeProductionPdf(quote), `production-${config.id}.pdf`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create the PDF.');
    } finally {
      setBusy(null);
    }
  }

  async function handleAddToCart() {
    if (!quote) return;
    setBusy('cart');
    setActionError(null);
    try {
      const productionPdf = await makeProductionPdf(quote);
      const payload = buildCartPayload(config, quote, quantity);
      const result = await addToCart({ payload, design: config, quote, productionPdf });
      setDone({ ...result, payload, pdfUrl: URL.createObjectURL(productionPdf) });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add to cart.');
    } finally {
      setBusy(null);
    }
  }

  const customisation = quote
    ? quote.lines.filter((l) => l.kind === 'customization').reduce((sum, l) => sum + l.amount, 0)
    : 0;

  return (
    <footer className="pricebar">
      <div className="price-summary">
        <button
          type="button"
          className="price-total"
          aria-expanded={showBreakdown}
          onClick={() => setShowBreakdown((v) => !v)}
          title="Show price breakdown"
        >
          <span className={stale ? 'amount stale' : 'amount'}>
            {quote ? formatMoney(quote.total, quote.currency) : '…'}
          </span>
          <span className="price-note">
            {error
              ? `Price unavailable: ${error}`
              : quote && customisation > 0
                ? `incl. ${formatMoney(customisation, quote.currency)} customisation · details ▾`
                : 'Price details ▾'}
          </span>
        </button>

        {showBreakdown && quote && (
          <div className="breakdown" role="dialog" aria-label="Price breakdown">
            <table>
              <tbody>
                {quote.lines.map((line) => (
                  <tr key={line.id} className={line.kind}>
                    <td>{line.label}</td>
                    <td className="qty">
                      {line.kind === 'discount' ? '' : `${line.quantity} × ${formatMoney(line.unitAmount, quote.currency)}`}
                    </td>
                    <td className="num">{formatMoney(line.amount, quote.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total (taxes and shipping at checkout)</td>
                  <td className="num">{formatMoney(quote.total, quote.currency)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="hint">Quote {quote.quoteId} · 5% off 3+, 10% off 5+, 15% off 10+ tents</p>
          </div>
        )}
      </div>

      <label className="quantity">
        <span>Qty</span>
        <button type="button" className="icon-btn" aria-label="Fewer" onClick={() => setQuantity(quantity - 1)}>
          −
        </button>
        <input
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
        <button type="button" className="icon-btn" aria-label="More" onClick={() => setQuantity(quantity + 1)}>
          +
        </button>
      </label>

      <div className="price-actions">
        {actionError && (
          <span className="hint error" role="alert">
            {actionError}
          </span>
        )}
        <button type="button" className="btn" disabled={stale || busy !== null} onClick={handleDownloadPdf}>
          {busy === 'pdf' ? 'Preparing PDF…' : 'Production PDF'}
        </button>
        <button type="button" className="btn primary" disabled={stale || busy !== null} onClick={handleAddToCart}>
          {busy === 'cart' ? 'Adding…' : 'Add to cart'}
        </button>
      </div>

      {done && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setDone(null)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Added to cart" onClick={(e) => e.stopPropagation()}>
            <h2>{done.message}</h2>
            <p className="hint">
              {done.mode === 'demo'
                ? 'Opened outside a store, so nothing was sent to Shopify. This is the exact body a store page would POST to /cart/add.js:'
                : 'The store page received this cart request:'}
            </p>
            <table className="cart-lines">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Qty</th>
                  <th>Line item properties</th>
                </tr>
              </thead>
              <tbody>
                {done.payload.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.id}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {Object.entries(item.properties).map(([k, v]) => (
                        <div key={k}>
                          <code>{k}</code>: {v}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>Raw JSON</summary>
              <pre>{JSON.stringify(done.payload, null, 2)}</pre>
            </details>
            <div className="button-row end">
              <a className="btn" href={done.pdfUrl} download={`production-${config.id}.pdf`}>
                Download production PDF
              </a>
              <button type="button" className="btn primary" onClick={() => setDone(null)}>
                Keep designing
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

import { useMemo, useState } from 'react';
import { designCanvas, renderSurfaceNow } from '../lib/designSurface.ts';
import { downloadBlob, formatMoney } from '../lib/format.ts';
import { previewBridge } from '../lib/previewBridge.ts';
import { buildQuoteRequest } from '../pricing/engine.ts';
import type { PriceQuote } from '../pricing/types.ts';
import { usePriceQuote } from '../pricing/usePriceQuote.ts';
import { useDesignStore } from '../store/designStore.ts';

async function makeProductionPdf(quote: PriceQuote): Promise<Blob> {
  const { config, quantity } = useDesignStore.getState();
  renderSurfaceNow(); // make sure the texture shows the latest edit
  const views = previewBridge.capture(['front', 'right', 'back', 'left']);
  const layout = designCanvas.toDataURL('image/jpeg', 0.92);
  const { createProductionPdf } = await import('../pdf/productionPdf.ts');
  return createProductionPdf({ config, quote, quantity, views, layout });
}

export function PriceBar() {
  const config = useDesignStore((s) => s.config);
  const quantity = useDesignStore((s) => s.quantity);
  const setQuantity = useDesignStore((s) => s.setQuantity);
  const request = useMemo(() => buildQuoteRequest(config, quantity), [config, quantity]);
  const { quote, loading, error } = usePriceQuote(request);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const stale = loading || !quote;

  async function handleDownloadPdf() {
    if (!quote) return;
    setBusy(true);
    setActionError(null);
    try {
      downloadBlob(await makeProductionPdf(quote), `production-${config.id}.pdf`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create the PDF.');
    } finally {
      setBusy(false);
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
        <button type="button" className="btn" disabled={stale || busy} onClick={handleDownloadPdf}>
          {busy ? 'Preparing PDF…' : 'Production PDF'}
        </button>
      </div>
    </footer>
  );
}

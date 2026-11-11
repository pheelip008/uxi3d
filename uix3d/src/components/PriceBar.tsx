import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format.ts';
import { buildQuoteRequest } from '../pricing/engine.ts';
import { usePriceQuote } from '../pricing/usePriceQuote.ts';
import { useDesignStore } from '../store/designStore.ts';

export function PriceBar() {
  const config = useDesignStore((s) => s.config);
  const quantity = useDesignStore((s) => s.quantity);
  const setQuantity = useDesignStore((s) => s.setQuantity);
  const request = useMemo(() => buildQuoteRequest(config, quantity), [config, quantity]);
  const { quote, loading, error } = usePriceQuote(request);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const stale = loading || !quote;
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
    </footer>
  );
}

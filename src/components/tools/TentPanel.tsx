import { findVariant } from '../../data/catalog.ts';
import { TENT } from '../../data/tent.ts';
import { formatMoney } from '../../lib/format.ts';
import { useDesignStore } from '../../store/designStore.ts';

export function TentPanel() {
  const sizeId = useDesignStore((s) => s.config.sizeId);
  const frame = useDesignStore((s) => s.config.frame);
  const { setSize, setFrame } = useDesignStore.getState();
  const variant = findVariant(sizeId, frame);

  return (
    <>
      <div className="field">
        <span className="field-label">Size</span>
        <div className="option-grid" role="group" aria-label="Tent size">
          {TENT.sizes.map((size) => (
            <button
              key={size.id}
              type="button"
              className="option-card"
              aria-pressed={size.id === sizeId}
              onClick={() => setSize(size.id)}
            >
              <strong>{size.label}</strong>
              <span>{formatMoney(findVariant(size.id, frame).price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Frame</span>
        <div className="option-grid two" role="group" aria-label="Frame">
          {TENT.frames.map((f) => (
            <button
              key={f.id}
              type="button"
              className="option-card"
              aria-pressed={f.id === frame}
              onClick={() => setFrame(f.id)}
            >
              <strong>{f.label}</strong>
              <span>{formatMoney(findVariant(sizeId, f.id).price)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="hint">
        Variant {variant.sku}. Changing the size keeps your artwork on the same panels.
      </p>
    </>
  );
}

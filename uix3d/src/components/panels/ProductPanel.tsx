import { findVariant } from '../../data/catalog.ts';
import { TENT } from '../../data/tent.ts';
import { formatMoney } from '../../lib/format.ts';
import { useDesignStore } from '../../store/designStore.ts';
import { Panel } from './Panel.tsx';

export function ProductPanel() {
  const sizeId = useDesignStore((s) => s.config.sizeId);
  const frame = useDesignStore((s) => s.config.frame);
  const { setSize, setFrame } = useDesignStore.getState();
  const variant = findVariant(sizeId, frame);

  return (
    <Panel step={1} title="Choose your tent">
      <div className="field">
        <span className="field-label">Size</span>
        <div className="segmented" role="group" aria-label="Tent size">
          {TENT.sizes.map((size) => (
            <button key={size.id} type="button" aria-pressed={size.id === sizeId} onClick={() => setSize(size.id)}>
              {size.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Frame</span>
        <div className="segmented" role="group" aria-label="Frame">
          {TENT.frames.map((f) => (
            <button key={f.id} type="button" aria-pressed={f.id === frame} onClick={() => setFrame(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="hint">
        Variant {variant.sku} · from {formatMoney(variant.price)}
      </p>
    </Panel>
  );
}
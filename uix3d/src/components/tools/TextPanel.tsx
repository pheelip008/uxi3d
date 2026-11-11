import { getSection, getSize } from '../../data/tent.ts';
import { FONTS } from '../../lib/fonts.ts';
import { printInfo } from '../../lib/printInfo.ts';
import { useDesignStore } from '../../store/designStore.ts';
import type { TextLayer } from '../../types.ts';
import { PlusIcon } from '../icons.tsx';
import { LayerControls } from './LayerControls.tsx';
import { SectionSelect } from './SectionSelect.tsx';

function TextSettings({ layer }: { layer: TextLayer }) {
  const config = useDesignStore((s) => s.config);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const size = getSize(config.sizeId);
  const section = getSection(size, layer.sectionId);
  const info = printInfo(layer, section, size, config);

  return (
    <section className="subpanel" aria-label="Selected text">
      <h3>Selected text · {section.label}</h3>
      <label className="field">
        <span className="field-label">Text</span>
        <textarea
          id="layer-text"
          rows={2}
          value={layer.text}
          onChange={(e) => updateLayer(layer.id, { text: e.target.value }, `text:${layer.id}`)}
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">Font</span>
          <select value={layer.fontFamily} onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}>
            {FONTS.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Colour</span>
          <input
            type="color"
            value={layer.color}
            onChange={(e) => updateLayer(layer.id, { color: e.target.value }, `textcolour:${layer.id}`)}
          />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Size · letters about {Math.round(info.heightCm)} cm tall</span>
        <input
          type="range"
          min={0.008}
          max={0.15}
          step={0.001}
          value={layer.fontSize}
          onChange={(e) => updateLayer(layer.id, { fontSize: Number(e.target.value) }, `size:${layer.id}`)}
        />
      </label>
      <div className="button-row">
        <button
          type="button"
          className="btn small"
          aria-pressed={layer.bold}
          onClick={() => updateLayer(layer.id, { bold: !layer.bold })}
        >
          <strong>B</strong> Bold
        </button>
        <button
          type="button"
          className="btn small"
          aria-pressed={layer.italic}
          onClick={() => updateLayer(layer.id, { italic: !layer.italic })}
        >
          <em>I</em> Italic
        </button>
      </div>
      <LayerControls layer={layer} />
    </section>
  );
}

export function TextPanel() {
  const layers = useDesignStore((s) => s.config.layers);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const { addText, selectLayer } = useDesignStore.getState();

  const texts = layers.filter((l): l is TextLayer => l.type === 'text' && l.sectionId === selectedSectionId);
  const selected = layers.find((l): l is TextLayer => l.id === selectedLayerId && l.type === 'text');

  return (
    <>
      <SectionSelect id="text-section" label="Add text to" />
      <button type="button" className="btn primary block" onClick={addText}>
        <PlusIcon />
        Add text
      </button>

      {texts.length > 0 ? (
        <div className="field">
          <span className="field-label">Text on this panel</span>
          <ul className="text-list">
            {texts.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={t.id === selectedLayerId}
                  style={{ fontFamily: `"${t.fontFamily}", sans-serif` }}
                  onClick={() => selectLayer(t.id)}
                >
                  {t.text.trim().split('\n')[0] || '(empty text)'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="hint">No text on this panel yet.</p>
      )}

      {selected ? (
        <TextSettings layer={selected} />
      ) : (
        texts.length > 0 && <p className="hint">Select a text on the canvas or in the list to edit it.</p>
      )}
    </>
  );
}

import { getSection, getSize } from '../../data/tent.ts';
import { FONTS } from '../../lib/fonts.ts';
import { printInfo } from '../../lib/printInfo.ts';
import { useDesignStore } from '../../store/designStore.ts';
import { Panel } from './Panel.tsx';

const DPI_TEXT = {
  good: 'Sharp at this size',
  fair: 'OK, may look a little soft up close',
  low: 'Low resolution: will look blurry. Upload a bigger file or make it smaller.',
};

export function LayerProperties() {
  const config = useDesignStore((s) => s.config);
  const layerId = useDesignStore((s) => s.selectedLayerId);
  const { updateLayer, duplicateLayer, removeLayer, centerLayer, copyLayerToSiblings } =
    useDesignStore.getState();

  const layer = config.layers.find((l) => l.id === layerId);
  if (!layer) return null;

  const size = getSize(config.sizeId);
  const section = getSection(size, layer.sectionId);
  const info = printInfo(layer, section, size, config);
  const siblings = section.kind === 'peak' ? 'other peaks' : 'other valances';

  return (
    <Panel step={4} title={layer.type === 'text' ? 'Text settings' : 'Image settings'}>
      {layer.type === 'text' ? (
        <>
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
              <select
                value={layer.fontFamily}
                onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}
              >
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
            <span className="field-label">
              Size · letters about {Math.round(info.heightCm)} cm tall
            </span>
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
        </>
      ) : (
        <div className={`print-check ${info.rating ?? ''}`}>
          <strong>
            {config.assets[layer.assetId]?.name} · {config.assets[layer.assetId]?.width} ×{' '}
            {config.assets[layer.assetId]?.height} px
          </strong>
          <span>
            Prints at {Math.round(info.widthCm)} × {Math.round(info.heightCm)} cm · {info.dpi} DPI
          </span>
          {info.rating && <span>{DPI_TEXT[info.rating]}</span>}
        </div>
      )}

      <label className="field">
        <span className="field-label">Rotation · {Math.round(layer.rotation)}°</span>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={layer.rotation}
          onChange={(e) => updateLayer(layer.id, { rotation: Number(e.target.value) }, `rotate:${layer.id}`)}
        />
      </label>
      <label className="field">
        <span className="field-label">Opacity · {Math.round(layer.opacity * 100)}%</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={layer.opacity}
          onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) }, `opacity:${layer.id}`)}
        />
      </label>

      <div className="button-row">
        <button type="button" className="btn small" onClick={() => centerLayer(layer.id)}>
          Centre &amp; straighten
        </button>
        <button type="button" className="btn small" onClick={() => duplicateLayer(layer.id)}>
          Duplicate
        </button>
        <button type="button" className="btn small" onClick={() => copyLayerToSiblings(layer.id)}>
          Copy to {siblings}
        </button>
        <button type="button" className="btn small danger" onClick={() => removeLayer(layer.id)}>
          Delete
        </button>
      </div>
    </Panel>
  );
}
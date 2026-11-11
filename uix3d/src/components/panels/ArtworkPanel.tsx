import { useState, type ChangeEvent } from 'react';
import { getSection, getSize } from '../../data/tent.ts';
import { ACCEPTED_IMAGE_TYPES, readImageFile } from '../../lib/images.ts';
import { useDesignStore } from '../../store/designStore.ts';
import type { Layer } from '../../types.ts';
import { Panel } from './Panel.tsx';

function layerName(layer: Layer, assetName?: string): string {
  if (layer.type === 'text') return layer.text.trim().split('\n')[0] || '(empty text)';
  return assetName ?? 'Image';
}

export function ArtworkPanel() {
  const config = useDesignStore((s) => s.config);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const selectedLayerId = useDesignStore((s) => s.selectedLayerId);
  const { addText, addImage, selectLayer, moveLayer, removeLayer } = useDesignStore.getState();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const section = getSection(getSize(config.sizeId), selectedSectionId);
  // Top of the list = drawn last = on top.
  const layers = config.layers.filter((l) => l.sectionId === section.id).reverse();

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      addImage(await readImageFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Panel step={3} title={`Artwork on the ${section.label.toLowerCase()}`}>
      <div className="button-row">
        <button type="button" className="btn" onClick={addText}>
          + Add text
        </button>
        <label className="btn">
          {uploading ? 'Reading…' : '+ Upload image'}
          <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden onChange={handleFile} />
        </label>
      </div>
      {error && (
        <p className="hint error" role="alert">
          {error}
        </p>
      )}

      {layers.length === 0 ? (
        <p className="hint">Nothing on this panel yet. Add text or a logo, or pick another panel.</p>
      ) : (
        <ul className="layer-list">
          {layers.map((layer, index) => (
            <li key={layer.id} className={layer.id === selectedLayerId ? 'selected' : undefined}>
              <button type="button" className="layer-name" onClick={() => selectLayer(layer.id)}>
                <span className="layer-icon" aria-hidden="true">
                  {layer.type === 'text' ? 'T' : '▣'}
                </span>
                {layerName(layer, layer.type === 'image' ? config.assets[layer.assetId]?.name : undefined)}
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Bring forward"
                aria-label="Bring forward"
                disabled={index === 0}
                onClick={() => moveLayer(layer.id, 'up')}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Send backward"
                aria-label="Send backward"
                disabled={index === layers.length - 1}
                onClick={() => moveLayer(layer.id, 'down')}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-btn danger"
                title="Delete"
                aria-label="Delete"
                onClick={() => removeLayer(layer.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
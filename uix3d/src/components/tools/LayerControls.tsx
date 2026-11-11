import { getSection, getSize } from '../../data/tent.ts';
import { useDesignStore } from '../../store/designStore.ts';
import type { Layer } from '../../types.ts';
import { BackwardIcon, CenterIcon, CopyIcon, ForwardIcon, MirrorIcon, TrashIcon } from '../icons.tsx';

/** Rotation, opacity, stacking order and the common actions for the selected text or image. */
export function LayerControls({ layer }: { layer: Layer }) {
  const config = useDesignStore((s) => s.config);
  const { updateLayer, moveLayer, centerLayer, duplicateLayer, copyLayerToSiblings, removeLayer } =
    useDesignStore.getState();
  const section = getSection(getSize(config.sizeId), layer.sectionId);
  const onPanel = config.layers.filter((l) => l.sectionId === layer.sectionId);
  const index = onPanel.indexOf(layer);
  const siblings = section.kind === 'peak' ? 'other peaks' : 'other valances';

  return (
    <>
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

      <div className="field">
        <span className="field-label">Arrange</span>
        <div className="action-grid">
          <button type="button" className="action" disabled={index === onPanel.length - 1} onClick={() => moveLayer(layer.id, 'up')}>
            <ForwardIcon />
            Forward
          </button>
          <button type="button" className="action" disabled={index <= 0} onClick={() => moveLayer(layer.id, 'down')}>
            <BackwardIcon />
            Backward
          </button>
          <button type="button" className="action" onClick={() => centerLayer(layer.id)}>
            <CenterIcon />
            Centre
          </button>
          <button type="button" className="action" title="Ctrl+D" onClick={() => duplicateLayer(layer.id)}>
            <CopyIcon />
            Duplicate
          </button>
          <button type="button" className="action wide" onClick={() => copyLayerToSiblings(layer.id)}>
            <MirrorIcon />
            Copy to {siblings}
          </button>
          <button type="button" className="action danger" title="Delete key" onClick={() => removeLayer(layer.id)}>
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

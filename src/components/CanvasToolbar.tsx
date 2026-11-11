import { getSection, getSize } from '../data/tent.ts';
import { boundingBox } from '../lib/geometry.ts';
import { useDesignStore } from '../store/designStore.ts';
import { MAX_ZOOM, useUiStore, ZOOM_STEPS } from '../store/uiStore.ts';
import { FocusIcon, GridIcon, MinusIcon, PlusIcon, RedoIcon, UndoIcon } from './icons.tsx';

/** Floating toolbar under the canvas: undo/redo, 2D zoom, panel view and guides. */
export function CanvasToolbar() {
  const mode = useUiStore((s) => s.mode);
  const zoom = useUiStore((s) => s.zoom);
  const guides = useUiStore((s) => s.guides);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const editorView = useDesignStore((s) => s.editorView);
  const sectionLabel = useDesignStore((s) => getSection(getSize(s.config.sizeId), s.selectedSectionId).label);
  const { undo, redo, setEditorView } = useDesignStore.getState();
  const { setView, toggleGuides } = useUiStore.getState();

  function zoomIn() {
    const { zoom: z, pan } = useUiStore.getState();
    const next = ZOOM_STEPS.find((step) => step > z + 0.01) ?? MAX_ZOOM;
    if (z === 1 && editorView === 'layout') {
      // Zooming in from "fit" goes to the selected panel rather than the middle of the layout.
      const { config, selectedSectionId } = useDesignStore.getState();
      const box = boundingBox(getSection(getSize(config.sizeId), selectedSectionId).polygon);
      setView(next, [box.cx - 0.5, box.cy - 0.5]);
    } else setView(next, pan);
  }

  function zoomOut() {
    const z = useUiStore.getState().zoom;
    setView([...ZOOM_STEPS].reverse().find((step) => step < z - 0.01) ?? 1);
  }

  return (
    <div className="canvas-toolbar">
      <div className="toolbar" role="toolbar" aria-label="Canvas tools">
        <button type="button" className="icon-btn ghost" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!canUndo} onClick={undo}>
          <UndoIcon />
        </button>
        <button type="button" className="icon-btn ghost" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!canRedo} onClick={redo}>
          <RedoIcon />
        </button>

        {mode === '2d' ? (
          <>
            <span className="toolbar-divider" />
            <button type="button" className="icon-btn ghost" aria-label="Zoom out" disabled={zoom <= 1} onClick={zoomOut}>
              <MinusIcon />
            </button>
            <button type="button" className="toolbar-btn zoom-label" title="Fit the whole view" onClick={() => setView(1)}>
              Zoom: {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
            </button>
            <button type="button" className="icon-btn ghost" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={zoomIn}>
              <PlusIcon />
            </button>
            <span className="toolbar-divider" />
            <button
              type="button"
              className="toolbar-btn"
              aria-pressed={editorView === 'section'}
              title="Show only the selected panel, turned upright"
              onClick={() => setEditorView(editorView === 'section' ? 'layout' : 'section')}
            >
              <FocusIcon width={18} height={18} />
              <span className="toolbar-btn-text">{editorView === 'section' ? `${sectionLabel} only` : 'Panel view'}</span>
            </button>
            <button
              type="button"
              className="toolbar-btn"
              aria-pressed={guides}
              title="Show the texture grid and panel names, in 2D and on the 3D model"
              onClick={toggleGuides}
            >
              <GridIcon width={18} height={18} />
              <span className="toolbar-btn-text">Guides</span>
            </button>
          </>
        ) : (
          <>
            <span className="toolbar-divider" />
            <span className="toolbar-hint">
              Drag to rotate · Scroll to zoom · Right-drag to pan · Click a panel to select it
            </span>
          </>
        )}
      </div>
    </div>
  );
}

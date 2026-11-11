import { useState, type ChangeEvent } from 'react';
import { useDesignStore } from '../store/designStore.ts';
import { exportDesign, readDesignFile } from '../store/persistence.ts';

const SAVE_TEXT = {
  idle: '',
  saved: 'Saved in this browser',
  failed: 'Not saved: design too large for browser storage',
};

export function TopBar() {
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const saveStatus = useDesignStore((s) => s.saveStatus);
  const { undo, redo, resetDesign, loadDesign } = useDesignStore.getState();
  const [error, setError] = useState<string | null>(null);

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      loadDesign(await readDesignFile(file));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the design.');
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <path d="M16 4 3 16h26L16 4Z" fill="#2563eb" />
          <path d="M3 16h26v4H3z" fill="#c8102e" />
          <path d="M5 20v8M27 20v8" stroke="#334155" strokeWidth="2" />
        </svg>
        <div>
          <strong>Canopy Tent Configurator</strong>
          <span>Design it in 2D, check it in 3D</span>
        </div>
      </div>

      <div className="topbar-actions">
        <button type="button" className="icon-btn" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!canUndo} onClick={undo}>
          ↶
        </button>
        <button type="button" className="icon-btn" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!canRedo} onClick={redo}>
          ↷
        </button>
        <span className={`save-status ${saveStatus}`} role="status">
          {error ?? SAVE_TEXT[saveStatus]}
        </span>
        <button type="button" className="btn small" onClick={() => exportDesign(useDesignStore.getState().config)}>
          Export JSON
        </button>
        <label className="btn small">
          Import JSON
          <input type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </label>
        <button
          type="button"
          className="btn small"
          onClick={() => {
            if (window.confirm('Start again from the default design? You can undo this.')) resetDesign();
          }}
        >
          Reset
        </button>
      </div>
    </header>
  );
}
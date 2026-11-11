import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { isEmbedded, postToParent } from '../embed/bridge.ts';
import { useDesignStore } from '../store/designStore.ts';
import { exportDesign, readDesignFile } from '../store/persistence.ts';
import { useUiStore } from '../store/uiStore.ts';
import { CloseIcon, MoreIcon } from './icons.tsx';

const SAVE_TEXT = {
  idle: '',
  saved: 'Saved in this browser',
  failed: 'Not saved: design too large for browser storage',
};

/** "More" menu: design file import/export and start over. Closes on outside click or Escape. */
function MoreMenu({ onError }: { onError: (message: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { resetDesign, loadDesign } = useDesignStore.getState();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      loadDesign(await readDesignFile(file));
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not open the design.');
    }
  }

  function exportFile() {
    setOpen(false);
    exportDesign(useDesignStore.getState().config);
  }

  function importFile() {
    setOpen(false);
    fileRef.current?.click();
  }

  function startOver() {
    setOpen(false);
    if (window.confirm('Start again from the default design? You can undo this.')) resetDesign();
  }

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreIcon />
      </button>
      {open && (
        <div className="menu-list" role="menu">
          <button type="button" role="menuitem" onClick={exportFile}>
            Export design (JSON)
          </button>
          <button type="button" role="menuitem" onClick={importFile}>
            Import design…
          </button>
          <button type="button" role="menuitem" className="danger" onClick={startOver}>
            Start over
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
    </div>
  );
}

export function TopBar() {
  const saveStatus = useDesignStore((s) => s.saveStatus);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const [error, setError] = useState<string | null>(null);

  return (
    <header className="topbar">
      <div className="topbar-start">
        <div className="brand" title="Canopy Tent Configurator">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="#111" />
            <path d="M16 7 6 17h20L16 7Z" fill="#fff" />
            <path d="M6 17h20v3H6z" fill="#e4002b" />
            <path d="M8 20v6M24 20v6" stroke="#fff" strokeWidth="1.8" />
          </svg>
          <strong>Canopy Tent Configurator</strong>
        </div>
        <div className="mode-switch" role="group" aria-label="View">
          <button type="button" aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>
            2D
          </button>
          <button type="button" aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>
            3D
          </button>
        </div>
      </div>

      <p className="topbar-title">Design in 2D · Preview in 3D</p>

      <div className="topbar-end">
        <span className={`save-status ${error ? 'failed' : saveStatus}`} role="status">
          {error ?? SAVE_TEXT[saveStatus]}
        </span>
        <MoreMenu onError={setError} />
        {isEmbedded && (
          <button type="button" className="btn pill" onClick={() => postToParent({ type: 'CONFIGURATOR_CLOSE' })}>
            <CloseIcon width={16} height={16} />
            Close
          </button>
        )}
      </div>
    </header>
  );
}

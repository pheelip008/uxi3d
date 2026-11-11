import { lazy, Suspense, useEffect } from 'react';
import { CanvasToolbar } from './components/CanvasToolbar.tsx';
import { Editor2D } from './components/Editor2D.tsx';
import { PriceBar } from './components/PriceBar.tsx';
import { ToolPanel, ToolRail } from './components/tools/ToolPanel.tsx';
import { TopBar } from './components/TopBar.tsx';
import { postToParent } from './embed/bridge.ts';
import { useDesignSurface } from './lib/designSurface.ts';
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts.ts';
import { startAutosave } from './store/persistence.ts';
import { useUiStore } from './store/uiStore.ts';

// three.js is the biggest dependency, so the 3D view loads in its own chunk.
const Preview3D = lazy(() => import('./components/Preview3D.tsx'));

export default function App() {
  const mode = useUiStore((s) => s.mode);
  const toolOpen = useUiStore((s) => s.tool !== null);

  useDesignSurface();
  useKeyboardShortcuts();
  useEffect(() => startAutosave(), []);
  useEffect(() => {
    postToParent({ type: 'CONFIGURATOR_READY', version: 1 });
  }, []);

  return (
    <div className="app">
      <TopBar />
      <main className="workspace" data-mode={mode} data-panel={toolOpen ? 'open' : 'closed'}>
        {/* Both views stay mounted, so switching is instant and the 3D canvas keeps its state. */}
        <div className="canvas-area" inert={mode === '3d'}>
          <Editor2D />
        </div>
        <div className="preview-dock">
          <Suspense fallback={<div className="pane-loading">Loading 3D…</div>}>
            <Preview3D />
          </Suspense>
        </div>
        <ToolRail />
        <ToolPanel />
        <CanvasToolbar />
      </main>
      <PriceBar />
    </div>
  );
}

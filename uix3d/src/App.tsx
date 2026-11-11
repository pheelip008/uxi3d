import { lazy, Suspense, useEffect, useState } from 'react';
import { Editor2D } from './components/Editor2D.tsx';
import { PriceBar } from './components/PriceBar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { postToParent } from './embed/bridge.ts';
import { useDesignSurface } from './lib/designSurface.ts';
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts.ts';
import { startAutosave } from './store/persistence.ts';

// three.js is the biggest dependency, so the 3D view loads in its own chunk.
const Preview3D = lazy(() => import('./components/Preview3D.tsx'));

export default function App() {
  const [mobileView, setMobileView] = useState<'2d' | '3d'>('3d');

  useDesignSurface();
  useKeyboardShortcuts();
  useEffect(() => startAutosave(), []);
  useEffect(() => {
    postToParent({ type: 'CONFIGURATOR_READY', version: 1 });
  }, []);

  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        <Sidebar />
        <section className="stage" data-mobile-view={mobileView}>
          <div className="view-switch segmented" role="group" aria-label="Preview">
            <button type="button" aria-pressed={mobileView === '2d'} onClick={() => setMobileView('2d')}>
              2D editor
            </button>
            <button type="button" aria-pressed={mobileView === '3d'} onClick={() => setMobileView('3d')}>
              3D preview
            </button>
          </div>
          <div className="pane pane-2d">
            <Editor2D />
          </div>
          <div className="pane pane-3d">
            <Suspense fallback={<div className="pane-loading">Loading 3D…</div>}>
              <Preview3D />
            </Suspense>
          </div>
        </section>
      </main>
      <PriceBar />
    </div>
  );
}

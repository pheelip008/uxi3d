import { lazy, Suspense } from 'react';
import { Editor2D } from './components/Editor2D.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { useDesignSurface } from './lib/designSurface.ts';

// three.js is the biggest dependency, so the 3D view loads in its own chunk.
const Preview3D = lazy(() => import('./components/Preview3D.tsx'));

export default function App() {
  // Redraw the shared design canvas whenever the design changes.
  useDesignSurface();

  return (
    <div className="app">
      <TopBar />
      <main className="workspace">
        <Sidebar />
        <section className="stage">
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
      <footer className="pricebar">
        <span className="hint">The price will show here.</span>
      </footer>
    </div>
  );
}